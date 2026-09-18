import { VehiclePlan, GateRecord } from '../types/models';
import { normalizeDate } from '../utils/dateUtils';

export interface PlanGateInfo {
  gateSlip: string;
  vehicleNumber: string;
  vehicleIn: string;
  vehicleOut: string;
  remarks: string;
  slipConflict?: boolean;
  slipConflictSlips?: string[];
}

export interface GateIndexes {
  gateInCount: number;
  gateOutCount: number;
  stoToSlipCount: number;
  stoToSlipMap: Map<string, string>;
  slipToGateInMap: Map<string, GateRecord>;
  slipToGateOutMap: Map<string, GateRecord>;
  slipToGateRecordMap: Map<string, GateRecord>;
}

export function cleanStoNumber(sto: string): string {
  if (!sto) return '';
  let s = String(sto).trim();
  s = s.replace(/\.0+$/, '');
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(s)) {
    try {
      s = BigInt(Math.round(Number(s))).toString();
    } catch {
      // keep as is
    }
  }
  return s;
}

export function cleanGateSlip(slip: string): string {
  if (!slip) return '';
  let s = String(slip).trim();
  s = s.replace(/\.0+$/, '');
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(s)) {
    try {
      s = BigInt(Math.round(Number(s))).toString();
    } catch {
      // keep as is
    }
  }
  return s;
}

/**
 * Builds canonical runtime indexes from Gate records:
 * 1. STO → Gate Slip
 * 2. Gate Slip → Gate In record (Vehicle In, Vehicle Number)
 * 3. Gate Slip → Gate Out record (Vehicle Out, Vehicle Number)
 * 4. Gate Slip → Primary Gate record (Vehicle Number, Remarks)
 */
export function buildGateIndexes(gateRecords: GateRecord[]): GateIndexes {
  const stoToSlipMap = new Map<string, string>();
  const slipToGateInMap = new Map<string, GateRecord>();
  const slipToGateOutMap = new Map<string, GateRecord>();
  const slipToGateRecordMap = new Map<string, GateRecord>();

  let gateInCount = 0;
  let gateOutCount = 0;

  for (const record of gateRecords) {
    const slip = cleanGateSlip(record.gateSlip);

    const isIn = record.type === 'GATE_IN' || Boolean(record.vehicleInTime);
    const isOut = record.type === 'GATE_OUT' || Boolean(record.vehicleOutTime);

    if (isIn) gateInCount++;
    if (isOut) gateOutCount++;

    if (!slip) continue;

    // Index STO → Gate Slip
    if (record.sto) {
      const tokens = record.sto.split(/[,;/\r\n\t]+/).map(cleanStoNumber).filter(Boolean);
      for (const token of tokens) {
        stoToSlipMap.set(token, slip);
        stoToSlipMap.set(token.toLowerCase(), slip);
      }
    }

    // Index Gate Slip → Gate In
    if (isIn) {
      const existing = slipToGateInMap.get(slip);
      if (!existing || (!existing.vehicleInTime && record.vehicleInTime)) {
        slipToGateInMap.set(slip, record);
      }
    }

    // Index Gate Slip → Gate Out
    if (isOut) {
      const existing = slipToGateOutMap.get(slip);
      if (!existing || (!existing.vehicleOutTime && record.vehicleOutTime)) {
        slipToGateOutMap.set(slip, record);
      }
    }

    // Index Gate Slip → Primary Gate Record
    const existingPrimary = slipToGateRecordMap.get(slip);
    if (!existingPrimary || (!existingPrimary.vehicleNumber && record.vehicleNumber)) {
      slipToGateRecordMap.set(slip, record);
    }
  }

  return {
    gateInCount,
    gateOutCount,
    stoToSlipCount: stoToSlipMap.size,
    stoToSlipMap,
    slipToGateInMap,
    slipToGateOutMap,
    slipToGateRecordMap,
  };
}

/**
 * Enriches a VehiclePlan with Gate Data:
 * STO → Gate Slip index → Plan-level Slip Number
 * Plan-level Slip Number → slipToGateInMap / slipToGateOutMap → Vehicle In, Vehicle Number, Vehicle Out, Remarks
 */
export function enrichPlanWithGateData(
  plan: VehiclePlan,
  gateRecordsOrIndexes: GateRecord[] | GateIndexes
): PlanGateInfo {
  if (plan.isCancelled) {
    return {
      gateSlip: '',
      vehicleNumber: '',
      vehicleIn: '',
      vehicleOut: '',
      remarks: 'Cancelled',
    };
  }

  const indexes = Array.isArray(gateRecordsOrIndexes)
    ? buildGateIndexes(gateRecordsOrIndexes)
    : gateRecordsOrIndexes;

  // Collect all child STO numbers for this plan
  const childStos: string[] = [];
  plan.children.forEach((c) => {
    if (c.sto) {
      const tokens = c.sto.split(/[,;/\r\n\t]+/).map(cleanStoNumber).filter(Boolean);
      tokens.forEach((t) => childStos.push(t));
    }
  });

  if (childStos.length === 0) {
    return {
      gateSlip: '',
      vehicleNumber: '',
      vehicleIn: '',
      vehicleOut: '',
      remarks: '',
    };
  }

  // Look up slips in STO → Gate Slip index
  const matchedSlips = new Set<string>();
  for (const sto of childStos) {
    const slip = indexes.stoToSlipMap.get(sto) || indexes.stoToSlipMap.get(sto.toLowerCase());
    if (slip) {
      matchedSlips.add(slip);
    }
  }

  if (matchedSlips.size === 0) {
    return {
      gateSlip: '',
      vehicleNumber: '',
      vehicleIn: '',
      vehicleOut: '',
      remarks: '',
    };
  }

  // Conflict handling (Section 7):
  // If different STOs inside the same plan resolve to different active Slips:
  // do NOT silently choose one.
  if (matchedSlips.size > 1) {
    return {
      gateSlip: '',
      vehicleNumber: '',
      vehicleIn: '',
      vehicleOut: '',
      remarks: 'Slip Conflict',
      slipConflict: true,
      slipConflictSlips: Array.from(matchedSlips),
    };
  }

  // Single Gate Slip resolved for this plan
  const slipNumber = Array.from(matchedSlips)[0];
  const inRecord = indexes.slipToGateInMap.get(slipNumber);
  const outRecord = indexes.slipToGateOutMap.get(slipNumber);
  const primaryRecord = inRecord || outRecord || indexes.slipToGateRecordMap.get(slipNumber);

  const rawIn = inRecord?.vehicleInTime || primaryRecord?.vehicleInTime || '';
  const rawOut = outRecord?.vehicleOutTime || primaryRecord?.vehicleOutTime || '';
  const vehicleIn = rawIn ? normalizeDate(rawIn) : '';
  const vehicleOut = rawOut ? normalizeDate(rawOut) : '';
  const vehicleNumber = inRecord?.vehicleNumber || outRecord?.vehicleNumber || primaryRecord?.vehicleNumber || '';

  // Remarks business rule (Section 14):
  // Vehicle In present + Vehicle Out absent: Onloading
  // Vehicle In present + Vehicle Out present: Dispatched
  // Neither: Pending
  let remarks = 'Pending';
  if (vehicleIn && vehicleOut) {
    remarks = 'Dispatched';
  } else if (vehicleIn) {
    remarks = 'Onloading';
  } else if (slipNumber) {
    remarks = primaryRecord?.remarks || 'Gate In Processed';
  }

  return {
    gateSlip: slipNumber,
    vehicleNumber,
    vehicleIn,
    vehicleOut,
    remarks,
    slipConflict: false,
  };
}

/**
 * Produces an Enriched VehiclePlan with canonical plan-level gate fields
 */
export function enrichPlan(
  plan: VehiclePlan,
  gateRecordsOrIndexes: GateRecord[] | GateIndexes
): VehiclePlan {
  const gate = enrichPlanWithGateData(plan, gateRecordsOrIndexes);
  return {
    ...plan,
    slipNumber: gate.gateSlip || null,
    vehicleIn: gate.vehicleIn || '',
    vehicleNumber: gate.vehicleNumber || '',
    vehicleOut: gate.vehicleOut || '',
    remarks: gate.remarks || (gate.gateSlip ? 'Gate In Processed' : ''),
    slipConflict: gate.slipConflict || false,
    slipConflictSlips: gate.slipConflictSlips,
  };
}

