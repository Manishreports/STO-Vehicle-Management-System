import * as XLSX from 'xlsx';
import { GateRecord } from '../types/models';
import { normalizeDate } from '../utils/dateUtils';
import { cleanGateSlip, cleanStoNumber } from './gateEnrichmentService';

export type GateSheetType = 'COMBINED' | 'GATE_IN' | 'GATE_OUT' | 'UNKNOWN';

export interface DetectedColumnMap {
  sheetName: string;
  headerRowIndex: number;
  headersFound: string[];
  totalRows: number;
  stoColIndex: number;
  stoColHeader?: string;
  slipColIndex: number;
  slipColHeader?: string;
  vehicleNoColIndex: number;
  vehicleNoColHeader?: string;
  gateInColIndex: number;
  gateInColHeader?: string;
  gateOutColIndex: number;
  gateOutColHeader?: string;
  remarksColIndex: number;
  remarksColHeader?: string;
  sheetType: GateSheetType;
  missingRequiredFields: string[];
  isValid: boolean;
}

export interface GateParseResult {
  records: GateRecord[];
  sheetDiagnostics: DetectedColumnMap[];
  errors: string[];
}

/**
 * Normalizes header string:
 * - lowercase
 * - remove invisible unicode and non-breaking spaces
 * - replace underscores and hyphens with space
 * - remove dots, commas, slashes, brackets, colons, hashes
 * - collapse multiple spaces and trim
 */
export function normalizeHeader(header: string): string {
  if (!header) return '';
  return String(header)
    .replace(/[\u00a0\u200b\r\n\t]/g, ' ')
    .replace(/[._,/:;()[\]{}#"']/g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Clean vehicle registration number:
 * - trim spaces
 * - collapse repeated spaces
 * - uppercase
 */
export function cleanVehicleNumber(veh: string): string {
  if (!veh) return '';
  return String(veh)
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Checks if a string is a location code rather than an STO number
 */
export function isInvalidStoString(str: string): boolean {
  const upper = str.trim().toUpperCase();
  return ['MAIN', 'DROS', 'AQUA', 'ECOM', 'PLANT', 'STORE', 'WAREHOUSE'].includes(upper);
}

/**
 * Semantic Header Matchers with Explicit Synonyms & Negative Guards
 */
export function isStoHeader(norm: string): boolean {
  // CRITICAL NEGATIVE CHECKS: Do NOT match Store, Store Location, Status, Stock
  if (norm.includes('store') || norm.includes('storage') || norm.includes('status') || norm.includes('stock')) {
    return false;
  }
  if (norm.includes('party') || norm.includes('freight') || norm.includes('plant') || norm.includes('delivery')) {
    return false;
  }

  // Exact or word matches for STO
  const tokens = norm.split(' ');
  if (tokens.includes('sto') || tokens.includes('stono') || tokens.includes('stonumber')) {
    return true;
  }

  // Synonyms
  if (
    norm === 'sto' ||
    norm === 'sto no' ||
    norm === 'sto number' ||
    norm === 'sto number key' ||
    norm === 'sto no key' ||
    norm === 'sto id' ||
    norm === 'sto doc' ||
    norm === 'sto document' ||
    norm === 'sto order' ||
    norm.startsWith('sto ') ||
    norm.endsWith(' sto') ||
    norm.includes('sto no') ||
    norm.includes('sto number') ||
    norm.includes('sto doc')
  ) {
    return true;
  }

  // Secondary Sales Order / Order synonyms if strictly identifying STO
  if (norm === 'so no' || norm === 'so number' || norm === 'sales order' || norm === 'order no') {
    return true;
  }

  return false;
}

export function isGateSlipHeader(norm: string): boolean {
  // CRITICAL NEGATIVE CHECKS:
  if (norm.includes('store') || norm.includes('weight') || norm.includes('freight')) {
    return false;
  }

  if (
    norm === 'slip' ||
    norm === 'slip no' ||
    norm === 'slip number' ||
    norm === 'gate slip' ||
    norm === 'gate slip no' ||
    norm === 'gate slip number' ||
    norm === 'gateslip' ||
    norm === 'gateslipno' ||
    norm === 'gate slip no key' ||
    norm === 'gate pass' ||
    norm === 'gate pass no' ||
    norm === 'challan' ||
    norm === 'challan no' ||
    norm === 'challan number' ||
    norm.includes('gate slip') ||
    norm.includes('slip no') ||
    norm.includes('slip number') ||
    norm.includes('gate pass')
  ) {
    return true;
  }

  return false;
}

export function isVehicleNumberHeader(norm: string): boolean {
  // CRITICAL NEGATIVE CHECKS: Do NOT match Truck Net Wt, Truck Weight, Load Truck Wt
  if (
    norm.includes('weight') ||
    norm.includes('wt') ||
    norm.includes('tare') ||
    norm.includes('gross') ||
    norm.includes('net') ||
    norm.includes('freight')
  ) {
    return false;
  }

  // Do not match date/time/driver/type
  if (
    norm.includes('date') ||
    norm.includes('time') ||
    norm.includes('driver') ||
    norm.includes('type') ||
    norm.includes('status')
  ) {
    return false;
  }

  if (
    norm === 'vehicle no' ||
    norm === 'vehicle number' ||
    norm === 'vehicle' ||
    norm === 'veh no' ||
    norm === 'veh number' ||
    norm === 'truck no' ||
    norm === 'truck number' ||
    norm === 'truck' ||
    norm === 'vehicle registration no' ||
    norm === 'vehicle registration number' ||
    norm === 'vehicle reg no' ||
    norm === 'lorry no' ||
    norm === 'lorry number' ||
    norm === 'registration no' ||
    norm === 'reg no' ||
    norm === 'vehicle no truck' ||
    norm.includes('vehicle no') ||
    norm.includes('vehicle number') ||
    norm.includes('truck no') ||
    norm.includes('truck number') ||
    norm.includes('lorry no')
  ) {
    return true;
  }

  return false;
}

export function isGateInHeader(norm: string): boolean {
  // CRITICAL NEGATIVE: Do not match out
  if (norm.includes('out') || norm.includes('exit') || norm.includes('dispatch') || norm.includes('weight') || norm.includes('wt')) {
    return false;
  }

  if (
    norm === 'gate in' ||
    norm === 'gate in date' ||
    norm === 'gate in time' ||
    norm === 'gate in date time' ||
    norm === 'gate in datetime' ||
    norm === 'in date' ||
    norm === 'in time' ||
    norm === 'gate entry date' ||
    norm === 'gate entry time' ||
    norm === 'vehicle in' ||
    norm === 'vehicle in time' ||
    norm === 'vehicle in date' ||
    norm === 'entry date' ||
    norm === 'entry time' ||
    norm === 'gate in dt' ||
    norm === 'gatein' ||
    norm === 'gateindate' ||
    norm.includes('gate in') ||
    norm.includes('vehicle in') ||
    norm.includes('gate entry') ||
    (norm.includes('in') && (norm.includes('date') || norm.includes('time')))
  ) {
    return true;
  }

  return false;
}

export function isGateOutHeader(norm: string): boolean {
  // CRITICAL NEGATIVE: Do not match weight
  if (norm.includes('weight') || norm.includes('wt')) {
    return false;
  }

  if (
    norm === 'gate out' ||
    norm === 'gate out date' ||
    norm === 'gate out time' ||
    norm === 'gate out date time' ||
    norm === 'gate out datetime' ||
    norm === 'out date' ||
    norm === 'out time' ||
    norm === 'gate exit date' ||
    norm === 'gate exit time' ||
    norm === 'vehicle out' ||
    norm === 'vehicle out time' ||
    norm === 'vehicle out date' ||
    norm === 'exit date' ||
    norm === 'exit time' ||
    norm === 'dispatch date' ||
    norm === 'dispatch time' ||
    norm === 'gate out dt' ||
    norm === 'gateout' ||
    norm === 'gateoutdate' ||
    norm.includes('gate out') ||
    norm.includes('vehicle out') ||
    norm.includes('gate exit') ||
    norm.includes('dispatch date') ||
    (norm.includes('out') && (norm.includes('date') || norm.includes('time')))
  ) {
    return true;
  }

  return false;
}

export function isRemarksHeader(norm: string): boolean {
  if (
    norm === 'remarks' ||
    norm === 'remark' ||
    norm === 'status' ||
    norm === 'gate remarks' ||
    norm === 'vehicle status remarks' ||
    norm === 'notes' ||
    norm === 'comments' ||
    norm.includes('remark')
  ) {
    return true;
  }
  return false;
}

/**
 * Evaluates a candidate header row and builds its column mapping
 */
export function mapRowToHeaders(
  row: string[],
  sheetName: string = 'Sheet'
): DetectedColumnMap {
  const normHeaders = row.map(normalizeHeader);

  let stoColIndex = -1;
  let stoColHeader: string | undefined;

  let slipColIndex = -1;
  let slipColHeader: string | undefined;

  let vehicleNoColIndex = -1;
  let vehicleNoColHeader: string | undefined;

  let gateInColIndex = -1;
  let gateInColHeader: string | undefined;

  let gateOutColIndex = -1;
  let gateOutColHeader: string | undefined;

  let remarksColIndex = -1;
  let remarksColHeader: string | undefined;

  normHeaders.forEach((norm, idx) => {
    if (!norm) return;
    const original = row[idx];

    // Priority 1: Gate Out (distinct from Gate In)
    if (isGateOutHeader(norm)) {
      if (gateOutColIndex === -1) {
        gateOutColIndex = idx;
        gateOutColHeader = original;
      }
      return;
    }

    // Priority 2: Gate In
    if (isGateInHeader(norm)) {
      if (gateInColIndex === -1) {
        gateInColIndex = idx;
        gateInColHeader = original;
      }
      return;
    }

    // Priority 3: Gate Slip
    if (isGateSlipHeader(norm)) {
      if (slipColIndex === -1) {
        slipColIndex = idx;
        slipColHeader = original;
      }
      return;
    }

    // Priority 4: STO (guard against store.location)
    if (isStoHeader(norm)) {
      if (stoColIndex === -1) {
        stoColIndex = idx;
        stoColHeader = original;
      }
      return;
    }

    // Priority 5: Vehicle Number (guard against truck weight)
    if (isVehicleNumberHeader(norm)) {
      if (vehicleNoColIndex === -1) {
        vehicleNoColIndex = idx;
        vehicleNoColHeader = original;
      }
      return;
    }

    // Priority 6: Remarks
    if (isRemarksHeader(norm)) {
      if (remarksColIndex === -1) {
        remarksColIndex = idx;
        remarksColHeader = original;
      }
      return;
    }
  });

  // Determine Sheet Type
  let sheetType: GateSheetType = 'UNKNOWN';
  if (slipColIndex !== -1) {
    const hasIn = gateInColIndex !== -1 || stoColIndex !== -1;
    const hasOut = gateOutColIndex !== -1;
    if (hasIn && hasOut) {
      sheetType = 'COMBINED';
    } else if (hasIn) {
      sheetType = 'GATE_IN';
    } else if (hasOut) {
      sheetType = 'GATE_OUT';
    }
  }

  // Validate Required Fields
  const missingRequiredFields: string[] = [];
  if (slipColIndex === -1) {
    missingRequiredFields.push('Gate Slip (e.g. "Gate Slip No.")');
  }

  if (sheetType === 'GATE_IN') {
    if (stoColIndex === -1) missingRequiredFields.push('STO Number (e.g. "STO No.")');
    if (vehicleNoColIndex === -1) missingRequiredFields.push('Vehicle Number (e.g. "Vehicle No.")');
    if (gateInColIndex === -1) missingRequiredFields.push('Gate In (e.g. "Gate In Date")');
  } else if (sheetType === 'COMBINED') {
    if (stoColIndex === -1) missingRequiredFields.push('STO Number (e.g. "STO No.")');
    if (gateInColIndex === -1 && gateOutColIndex === -1) {
      missingRequiredFields.push('Gate In Date / Gate Out Date');
    }
  } else if (sheetType === 'GATE_OUT') {
    if (gateOutColIndex === -1) missingRequiredFields.push('Gate Out Date (e.g. "Gate_Out_Date")');
  } else {
    // UNKNOWN
    missingRequiredFields.push('Could not detect Gate In, Gate Out, or Gate Slip headers');
  }

  const isValid = slipColIndex !== -1 && missingRequiredFields.length === 0;

  return {
    sheetName,
    headerRowIndex: 0,
    headersFound: row.filter(Boolean),
    totalRows: 0,
    stoColIndex,
    stoColHeader,
    slipColIndex,
    slipColHeader,
    vehicleNoColIndex,
    vehicleNoColHeader,
    gateInColIndex,
    gateInColHeader,
    gateOutColIndex,
    gateOutColHeader,
    remarksColIndex,
    remarksColHeader,
    sheetType,
    missingRequiredFields,
    isValid,
  };
}

/**
 * Scans the first N rows (up to 15) to detect the actual header row
 * based on highest confidence match score of semantic fields.
 */
export function detectHeaderRow(
  rawMatrix: string[][],
  sheetName: string = 'Sheet',
  maxScanRows: number = 15
): DetectedColumnMap {
  const scanLimit = Math.min(rawMatrix.length, maxScanRows);
  let bestMap: DetectedColumnMap | null = null;
  let bestScore = -1;
  let bestRowIndex = 0;

  for (let r = 0; r < scanLimit; r++) {
    const candidateRow = rawMatrix[r];
    if (!candidateRow || candidateRow.length === 0 || candidateRow.every((c) => !c)) continue;

    const map = mapRowToHeaders(candidateRow, sheetName);

    // Calculate confidence score for this row as a header
    let score = 0;
    if (map.slipColIndex !== -1) score += 10;
    if (map.stoColIndex !== -1) score += 8;
    if (map.vehicleNoColIndex !== -1) score += 6;
    if (map.gateInColIndex !== -1) score += 5;
    if (map.gateOutColIndex !== -1) score += 5;
    if (map.remarksColIndex !== -1) score += 1;

    // Bonus if valid sheet structure
    if (map.isValid) score += 15;

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = r;
      bestMap = {
        ...map,
        headerRowIndex: r,
        totalRows: rawMatrix.length,
      };
    }
  }

  if (!bestMap || bestScore <= 0) {
    return {
      sheetName,
      headerRowIndex: 0,
      headersFound: rawMatrix[0] || [],
      totalRows: rawMatrix.length,
      stoColIndex: -1,
      slipColIndex: -1,
      vehicleNoColIndex: -1,
      gateInColIndex: -1,
      gateOutColIndex: -1,
      remarksColIndex: -1,
      sheetType: 'UNKNOWN',
      missingRequiredFields: [
        'STO Number (e.g. STO No.)',
        'Gate Slip No.',
        'Vehicle Number',
        'Gate In / Gate Out Date',
      ],
      isValid: false,
    };
  }

  return bestMap;
}

/**
 * Extracts canonical GateRecords from a 2D matrix using a detected column mapping.
 * NEVER assumes column position: reads strictly from column indexes in map.
 */
export function extractGateRecordsFromMatrix(
  matrix: string[][],
  colMap: DetectedColumnMap,
  todayStr: string = new Date().toISOString().slice(0, 10)
): GateRecord[] {
  if (!colMap.isValid) return [];

  const records: GateRecord[] = [];
  const startRow = colMap.headerRowIndex + 1;

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0 || row.every((c) => !c)) continue;

    const rawSlip = colMap.slipColIndex !== -1 ? row[colMap.slipColIndex] : '';
    const rawSto = colMap.stoColIndex !== -1 ? row[colMap.stoColIndex] : '';
    const rawVehicleNo = colMap.vehicleNoColIndex !== -1 ? row[colMap.vehicleNoColIndex] : '';
    const rawIn = colMap.gateInColIndex !== -1 ? row[colMap.gateInColIndex] : '';
    const rawOut = colMap.gateOutColIndex !== -1 ? row[colMap.gateOutColIndex] : '';
    const rawRemarks = colMap.remarksColIndex !== -1 ? row[colMap.remarksColIndex] : '';

    const gateSlip = cleanGateSlip(rawSlip);
    const vehicleNumber = cleanVehicleNumber(rawVehicleNo);
    const vehicleInTime = rawIn ? normalizeDate(rawIn) : undefined;
    const vehicleOutTime = rawOut ? normalizeDate(rawOut) : undefined;
    const remarks = rawRemarks ? String(rawRemarks).trim() : undefined;

    // STO normalization (clean, remove trailing .0, guard against location names)
    let sto = cleanStoNumber(rawSto);
    if (isInvalidStoString(sto)) {
      sto = '';
    }

    // Skip empty lines
    if (!gateSlip && !sto && !vehicleNumber) continue;

    // Determine type: Gate In vs Gate Out
    const isOutOnly = colMap.sheetType === 'GATE_OUT' || (Boolean(vehicleOutTime) && !vehicleInTime);

    records.push({
      id: `GATE-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      type: isOutOnly ? 'GATE_OUT' : 'GATE_IN',
      sto,
      gateSlip,
      vehicleNumber,
      vehicleInTime: vehicleInTime || undefined,
      vehicleOutTime: vehicleOutTime || undefined,
      remarks,
      uploadDate: todayStr,
    });
  }

  return records;
}

/**
 * Dynamic parser for Excel file (Workbook) with multiple sheets support
 */
export async function parseExcelWorkbookDynamic(
  file: File
): Promise<GateParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  const allRecords: GateRecord[] = [];
  const sheetDiagnostics: DetectedColumnMap[] = [];
  const errors: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert sheet to 2D string matrix
    const rawMatrix: string[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (rawMatrix.length === 0) continue;

    // Detect header row and column mapping
    const colMap = detectHeaderRow(rawMatrix, sheetName);
    sheetDiagnostics.push(colMap);

    if (colMap.isValid) {
      const records = extractGateRecordsFromMatrix(rawMatrix, colMap, today);
      allRecords.push(...records);
    } else {
      // If it has some headers but failed required fields, report as error
      if (colMap.headersFound.length > 2) {
        errors.push(
          `Sheet "${sheetName}": Missing required Gate column(s): ${colMap.missingRequiredFields.join(', ')}`
        );
      }
    }
  }

  return {
    records: allRecords,
    sheetDiagnostics,
    errors,
  };
}

/**
 * Dynamic parser for text paste (e.g. copied from Excel or TSV/CSV)
 */
export function parseGatePasteDynamic(
  rawText: string
): GateParseResult {
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { records: [], sheetDiagnostics: [], errors: ['No text data provided.'] };
  }

  // Split lines into cells (tab, semicolon, or comma)
  const rawMatrix: string[][] = lines.map((line) => {
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim());
    } else if (line.includes(',')) {
      return line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    } else {
      return line.split(/\s{2,}/).map((c) => c.trim());
    }
  });

  const colMap = detectHeaderRow(rawMatrix, 'Pasted Data');
  const sheetDiagnostics = [colMap];
  const errors: string[] = [];

  if (!colMap.isValid) {
    errors.push(
      `Pasted Data: Missing required Gate column(s): ${colMap.missingRequiredFields.join(', ')}`
    );
    return { records: [], sheetDiagnostics, errors };
  }

  const records = extractGateRecordsFromMatrix(rawMatrix, colMap);
  return { records, sheetDiagnostics, errors };
}
