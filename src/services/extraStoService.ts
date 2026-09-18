import { ExtraStoRecord, VehiclePlan, GateRecord } from '../types/models';
import { normalizeDate } from '../utils/dateUtils';
import { enrichPlanWithGateData } from './gateEnrichmentService';

export interface ExtraStoEvaluatedRow {
  record: ExtraStoRecord;
  targetPlan: VehiclePlan | null;
  foundInAnyPlan: boolean;
  isSamePlan: boolean;
  gateSlip: string;
  vehicleNumber: string;
  vehicleIn: string;
  vehicleOut: string;
  computedStatus: string;
  isPlanned: boolean;
  matchedPlanId?: string;
}

export function evaluateExtraStoRecords(
  extraStos: ExtraStoRecord[],
  plans: VehiclePlan[],
  gateRecords: GateRecord[]
): ExtraStoEvaluatedRow[] {
  const results: ExtraStoEvaluatedRow[] = [];

  for (const ex of extraStos) {
    const exDate = normalizeDate(ex.date);
    const exLoc = ex.location.trim().toUpperCase();
    const exSto = ex.stoNumber.trim();

    // 1. Find target plan matching Date + Location (CFA or Loading)
    const targetPlan =
      plans.find(
        (p) =>
          !p.isCancelled &&
          normalizeDate(p.date) === exDate &&
          (p.cfa.trim().toUpperCase().includes(exLoc) || p.loading.trim().toUpperCase().includes(exLoc))
      ) || null;

    // 2. Check where the STO actually appears across all plans
    const planContainingSto = plans.find(
      (p) => !p.isCancelled && p.children.some((c) => c.sto?.trim() === exSto)
    );

    const isSamePlan = Boolean(
      targetPlan && planContainingSto && targetPlan.id === planContainingSto.id
    );
    const foundInAnyPlan = Boolean(planContainingSto);

    // 3. Gate data lookup for this STO
    const matchedGate = gateRecords.filter((g) => g.sto.trim() === exSto);
    const primaryGate = matchedGate.find((g) => Boolean(g.gateSlip)) || matchedGate[0];
    const inRecord = matchedGate.find((g) => g.vehicleInTime) || primaryGate;
    const outRecord = matchedGate.find((g) => g.vehicleOutTime);

    let gateSlip = primaryGate?.gateSlip || '';
    let vehicleNumber = primaryGate?.vehicleNumber || '';
    let vehicleIn = inRecord?.vehicleInTime || '';
    let vehicleOut = outRecord?.vehicleOutTime || '';

    // If not in gate record directly, check if the plan containing it has gate data
    if (planContainingSto && !gateSlip) {
      const planGate = enrichPlanWithGateData(planContainingSto, gateRecords);
      gateSlip = planGate.gateSlip;
      vehicleNumber = planGate.vehicleNumber;
      vehicleIn = planGate.vehicleIn;
      vehicleOut = planGate.vehicleOut;
    }

    // 4. Compute status based on Section 38 rules:
    let computedStatus = 'STO Merge Pending';

    if (foundInAnyPlan) {
      if (isSamePlan) {
        computedStatus = 'Merged / Completed';
      } else {
        computedStatus = vehicleOut
          ? 'STO Merged to Other Plan - Dispatched'
          : 'STO Merged to Other Plan';
      }
    } else {
      if (vehicleOut) {
        computedStatus = 'Vehicle Dispatched - STO Merge Pending';
      } else if (vehicleIn) {
        computedStatus = 'Vehicle In - STO Merge Pending';
      } else if (!gateSlip && !vehicleIn) {
        computedStatus = 'STO Merge Pending';
      } else {
        computedStatus = 'Vehicle In Pending';
      }
    }

    results.push({
      record: ex,
      targetPlan,
      foundInAnyPlan,
      isSamePlan,
      gateSlip: gateSlip || '—',
      vehicleNumber: vehicleNumber || '—',
      vehicleIn: vehicleIn || '—',
      vehicleOut: vehicleOut || '—',
      computedStatus,
      isPlanned: foundInAnyPlan,
      matchedPlanId: planContainingSto?.id,
    });
  }

  return results;
}
