import * as XLSX from 'xlsx';
import { normalizeDate } from './dateUtils';
import { parseWeightToMt } from './weightFormatter';
import { generatePlanId, generateVsId } from './idGenerator';
import { VehiclePlan, VehicleStatusRecord, PlanChild, GateRecord } from '../types/models';

/**
 * Split a raw text paste by rows, detect delimiter (tab, pipe, comma, or multi-space aligned).
 * Preserves empty cells to maintain exact Excel column indices.
 */
export function splitPasteIntoRows(rawText: string): string[][] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  return lines.map((line) => {
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    }
    if (line.includes('|')) {
      return line.split('|').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    }
    // Check if space-separated line with fixed pattern
    const match = line.match(/^(\S+)\s+(\S+)\s+(.+?)\s{2,}(.+?)\s{2,}(\d+\s*(?:Ton|MT|KG|Kgs))\s+(.+)$/i);
    if (match) {
      const [, date, loc, plant, cfa, weight, rest] = match;
      let loading = '';
      let stoPart = rest;
      const loadMatch = rest.match(/\s{2,}(.*(?:LOADING|PLANT|TOLAGAON|DISPATCH).*)$/i);
      if (loadMatch) {
        loading = loadMatch[1].trim();
        stoPart = rest.substring(0, rest.length - loadMatch[0].length).trim();
      }
      const stoCols = stoPart.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
      let sto1 = '';
      let sto2 = '';
      if (stoCols.length >= 2) {
        sto1 = stoCols[0];
        sto2 = stoCols[1];
      } else if (stoCols.length === 1) {
        if (line.indexOf('        ' + stoCols[0]) !== -1) {
          sto1 = '';
          sto2 = stoCols[0];
        } else {
          sto1 = stoCols[0];
          sto2 = '';
        }
      }
      return [date, loc, plant, cfa, weight, sto1, sto2, loading];
    }
    return line.split(/\s{2,}/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
  });
}

/**
 * Check if a cell looks like an STO number (e.g. 10 digits starting with 42, or digits >= 7)
 */
export function isStoNumber(val: string): boolean {
  if (!val) return false;
  const cleaned = val.replace(/[^0-9]/g, '');
  return cleaned.length >= 7 && cleaned.length <= 12;
}

/**
 * Check if the first row is a header row or actual data.
 * If first cell contains a date value like "15-Sep", it is DATA, not a header.
 */
function isHeaderRow(cells: string[]): boolean {
  if (!cells || cells.length === 0) return false;
  const first = (cells[0] || '').toLowerCase().trim();
  const isDateValue =
    /^\d{1,2}[-/.][a-z0-9]+/i.test(first) ||
    /^[a-z]{3}[-/.]\d{1,2}/i.test(first) ||
    /^\d{4}[-/.]\d{1,2}/i.test(first);
  if (isDateValue) return false;

  const rowText = cells.join(' ').toLowerCase();
  if (
    (first === 'date' || first === 's.no' || first === 's no') &&
    (rowText.includes('cfa') || rowText.includes('plant') || rowText.includes('weight') || rowText.includes('loading') || rowText.includes('sto'))
  ) {
    return true;
  }
  return false;
}

function isDateLike(val: string): boolean {
  if (!val) return false;
  const s = val.trim();
  return (
    /^\d{1,2}[-/.][a-z0-9]+/i.test(s) ||
    /^[a-z]{3}[-/.]\d{1,2}/i.test(s) ||
    /^\d{4}[-/.]\d{1,2}/i.test(s)
  );
}

function isWeightLike(val: string): boolean {
  if (!val) return false;
  const s = val.trim();
  return (
    /^\d+(\.\d+)?\s*(ton|mt|kg|kgs)?$/i.test(s) &&
    (s.toLowerCase().includes('ton') || s.toLowerCase().includes('mt') || (Number(s) > 0 && Number(s) <= 120))
  );
}

/**
 * Parses paste into Live Dispatch Schedule plans.
 * Supports:
 * - single or multiple STO columns (Column 6 & 7 both STO-bearing)
 * - slash-separated STOs e.g. "4210087547/4210087548"
 * - Excel column preservation (never shifts STO into Loading)
 * - Headered and headerless pastes
 * - Date + CFA + Loading grouping into one logical plan with child location groups
 */
export function parseDispatchSchedulePaste(
  rawText: string,
  existingPlans: VehiclePlan[]
): { plans: VehiclePlan[]; rawRowsCount: number } {
  const allRows = splitPasteIntoRows(rawText);
  if (allRows.length === 0) return { plans: [], rawRowsCount: 0 };

  let startIndex = 0;
  if (isHeaderRow(allRows[0])) {
    startIndex = 1;
  }

  const rawMatrix: string[][] = [];
  for (let i = startIndex; i < allRows.length; i++) {
    const cells = [...allRows[i]];
    while (cells.length < 8) cells.push('');
    rawMatrix.push(cells);
  }

  // Debug requirement log
  console.log('[DEBUG] Live Dispatch Raw Matrix:');
  rawMatrix.forEach((r, idx) => {
    console.log(`ROW ${idx + 2}:`, JSON.stringify(r));
  });

  const parsedPlans: VehiclePlan[] = [];
  let currentPlan: VehiclePlan | null = null;
  let runningLoading = 'TOLAGAON LOADING';

  for (let i = 0; i < rawMatrix.length; i++) {
    const cells = rawMatrix[i];
    if (cells.length === 0 || cells.every((c) => !c)) continue;

    // Detect if column 0 is S.No (e.g. 1, 2, 3...)
    let colOffset = 0;
    if (/^\d{1,4}$/.test(cells[0]) && cells.length > 8 && cells[1].includes('-')) {
      colOffset = 1;
    }

    // 1. Gather all STOs in this row
    const rowStos: string[] = [];
    cells.forEach((c) => {
      if (!c) return;
      const trimmed = c.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/[/,\s]+/);
      if (parts.length > 1 && parts.every((p) => /^\d{7,12}$/.test(p))) {
        parts.forEach((p) => {
          if (!rowStos.includes(p)) rowStos.push(p);
        });
      } else if (/^\d{7,12}$/.test(trimmed)) {
        if (!rowStos.includes(trimmed)) rowStos.push(trimmed);
      }
    });

    // Also check standard columns 5 and 6 if they have STO values
    [cells[colOffset + 5], cells[colOffset + 6]].forEach((c) => {
      if (!c) return;
      const trimmed = c.trim();
      if (trimmed && !isDateLike(trimmed) && !isWeightLike(trimmed)) {
        trimmed.split(/[/,\s]+/).forEach((s) => {
          if (s && !rowStos.includes(s)) rowStos.push(s);
        });
      }
    });

    let rawDate = cells[colOffset] || '';
    if (!isDateLike(rawDate)) rawDate = '';

    let loc = cells[colOffset + 1] || '';
    if (rowStos.includes(loc.trim()) || isWeightLike(loc)) loc = '';

    let plant = cells[colOffset + 2] || '';
    if (rowStos.includes(plant.trim()) || isWeightLike(plant)) plant = '';

    let cfa = cells[colOffset + 3] || '';
    if (rowStos.includes(cfa.trim()) || isWeightLike(cfa) || isStoNumber(cfa)) cfa = '';

    let weight = cells[colOffset + 4] || '';
    if (!isWeightLike(weight)) {
      const wCell = cells.find((c) => isWeightLike(c) && !rowStos.includes(c.trim()));
      weight = wCell || '';
    }

    let loadingCell = cells[colOffset + 7] || '';
    if (loadingCell) {
      runningLoading = loadingCell.trim();
    }
    const finalLoading = loadingCell ? loadingCell.trim() : (currentPlan ? currentPlan.loading : runningLoading);

    // Is this a continuation row (child row) for the current plan?
    const isContinuation = !rawDate && !cfa && currentPlan !== null;

    if (isContinuation) {
      // Find child location: check loc, or find non-STO, non-date, non-weight text cell
      let childLoc = loc;
      if (!childLoc) {
        const textCell = cells.find((c) => {
          const t = c.trim();
          return (
            t &&
            !isDateLike(t) &&
            !isWeightLike(t) &&
            !rowStos.includes(t) &&
            !t.toUpperCase().includes('LOADING') &&
            !t.toUpperCase().includes('DISPATCH')
          );
        });
        childLoc = textCell ? textCell.trim() : (currentPlan.loc || 'MAIN');
      }

      const numWeight = parseWeightToMt(weight);
      if (numWeight > 0) {
        currentPlan.weightMt = Math.round((currentPlan.weightMt + numWeight) * 100) / 100;
        currentPlan.rawWeight = `${currentPlan.weightMt} Ton`;
      }

      if (rowStos.length > 0) {
        for (const s of rowStos) {
          currentPlan.children.push({
            id: `CHILD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            location: childLoc,
            sto: s,
            weight: weight || undefined,
            weightMt: numWeight || undefined,
          });
        }
      } else {
        currentPlan.children.push({
          id: `CHILD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          location: childLoc,
          sto: '',
          weight: weight || undefined,
          weightMt: numWeight || undefined,
        });
      }
    } else {
      if (!rawDate && !cfa && rowStos.length === 0) continue;

      const normalizedPlanDate = normalizeDate(rawDate || (currentPlan ? currentPlan.date : ''));
      const finalCfa = cfa || (currentPlan ? currentPlan.cfa : '');
      const finalPlant = plant || (currentPlan ? currentPlan.plant : '');
      const numWeight = parseWeightToMt(weight);

      const isSamePlan =
        currentPlan &&
        normalizedPlanDate === currentPlan.date &&
        finalCfa.trim().toUpperCase() === currentPlan.cfa.trim().toUpperCase() &&
        (!loadingCell || finalLoading.trim().toUpperCase() === currentPlan.loading.trim().toUpperCase());

      if (!isSamePlan) {
        currentPlan = {
          id: generatePlanId(),
          date: normalizedPlanDate,
          loc: loc || 'MAIN',
          plant: finalPlant,
          cfa: finalCfa.trim(),
          rawWeight: weight || `${numWeight} Ton`,
          weightMt: numWeight,
          loading: finalLoading,
          children: [],
          isCancelled: false,
          createdAt: new Date().toISOString(),
        };
        parsedPlans.push(currentPlan);
      } else {
        currentPlan.weightMt = Math.round((currentPlan.weightMt + numWeight) * 100) / 100;
        currentPlan.rawWeight = `${currentPlan.weightMt} Ton`;
      }

      const parentLoc = loc || currentPlan.loc || 'MAIN';
      if (rowStos.length > 0) {
        for (const s of rowStos) {
          currentPlan.children.push({
            id: `CHILD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            location: parentLoc,
            sto: s,
            weight: weight || undefined,
            weightMt: numWeight || undefined,
          });
        }
      } else {
        currentPlan.children.push({
          id: `CHILD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          location: parentLoc,
          sto: '',
          weight: weight || undefined,
          weightMt: numWeight || undefined,
        });
      }
    }
  }

  return { plans: parsedPlans, rawRowsCount: rawMatrix.length };
}

/**
 * Parses paste into Vehicle Status Records
 * Section 10:
 * User input: Demanded Date, Required Date, Loading Pt., Location, Weight
 */
export function parseVehicleStatusPaste(rawText: string): { records: VehicleStatusRecord[]; rawRowsCount: number } {
  const rows = splitPasteIntoRows(rawText);
  if (rows.length === 0) return { records: [], rawRowsCount: 0 };

  const parsedRecords: VehicleStatusRecord[] = [];
  let startIndex = 0;
  const firstRowLower = rows[0].map((c) => c.toLowerCase());
  if (firstRowLower.some((c) => c.includes('demanded') || c.includes('required') || c.includes('loading') || c.includes('location'))) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.length === 0 || cells.every((c) => !c)) continue;

    let colOffset = 0;
    if (/^\d{1,4}$/.test(cells[0]) && cells.length > 4) {
      colOffset = 1; // skip S.No
    }

    const demandedDate = normalizeDate(cells[colOffset] || '');
    const requiredDate = normalizeDate(cells[colOffset + 1] || cells[colOffset] || '');
    const loadingPt = cells[colOffset + 2] || '';
    const location = cells[colOffset + 3] || '';
    const rawWeight = cells[colOffset + 4] || '18 Ton';

    if (!demandedDate && !location) continue;

    parsedRecords.push({
      id: generateVsId(),
      demandedDate,
      requiredDate: requiredDate || demandedDate,
      loadingPt: loadingPt.trim(),
      location: location.trim(),
      rawWeight,
      weightMt: parseWeightToMt(rawWeight),
      createdAt: new Date().toISOString(),
    });
  }

  return { records: parsedRecords, rawRowsCount: rows.length };
}

/**
 * Parse Excel file buffer into raw sheet data (for Gate In / Gate Out)
 */
export async function parseExcelFile(
  file: File
): Promise<{ sheetNames: string[]; sheetsData: Record<string, Record<string, string>[]> }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetsData: Record<string, Record<string, string>[]> = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const json: Record<string, string>[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    });
    sheetsData[sheetName] = json;
  }

  return { sheetNames: workbook.SheetNames, sheetsData };
}

import {
  parseExcelWorkbookDynamic,
  parseGatePasteDynamic,
  GateParseResult,
  DetectedColumnMap,
} from '../services/gateParserService';

export { parseExcelWorkbookDynamic, parseGatePasteDynamic };
export type { GateParseResult, DetectedColumnMap };

/**
 * Parse Excel file or buffer directly into GateRecord[] using fully dynamic header mapping
 */
export async function parseExcelFileOrBuffer(file: File): Promise<GateRecord[]> {
  const result = await parseExcelWorkbookDynamic(file);
  if (result.errors.length > 0 && result.records.length === 0) {
    throw new Error(result.errors.join(' | '));
  }
  return result.records;
}

/**
 * Parse text paste of Gate records using fully dynamic header mapping
 */
export function parseGateRecordsPaste(rawText: string): GateRecord[] {
  const result = parseGatePasteDynamic(rawText);
  if (result.errors.length > 0 && result.records.length === 0) {
    throw new Error(result.errors.join(' | '));
  }
  return result.records;
}

