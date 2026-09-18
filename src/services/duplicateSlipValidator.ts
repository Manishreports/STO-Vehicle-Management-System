import { VehiclePlan, GateRecord, SystemAlert } from '../types/models';
import { enrichPlanWithGateData } from './gateEnrichmentService';

export function validateDuplicateGateSlips(
  plans: VehiclePlan[],
  gateRecords: GateRecord[]
): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const slipToActivePlansMap = new Map<string, string[]>();

  // Only consider active plans (Section 20 & 21)
  const activePlans = plans.filter((p) => !p.isCancelled);

  for (const plan of activePlans) {
    const gateInfo = enrichPlanWithGateData(plan, gateRecords);
    if (gateInfo.slipConflict) {
      alerts.push({
        id: `ALERT-CONFLICT-SLIP-${plan.id}`,
        type: 'ERROR',
        title: 'DIFFERENT SLIPS CONFLICT IN MULTI-STO PLAN',
        message: `Plan "${plan.id}" contains STOs resolving to multiple different Gate Slips: ${gateInfo.slipConflictSlips?.join(', ')}. Different STOs in one plan cannot share different slips.`,
        relatedPlanIds: [plan.id],
        relatedGateSlips: gateInfo.slipConflictSlips,
        createdAt: new Date().toISOString(),
      });
    }

    const slip = gateInfo.gateSlip?.trim();
    if (slip) {
      const list = slipToActivePlansMap.get(slip) || [];
      list.push(plan.id);
      slipToActivePlansMap.set(slip, list);
    }
  }

  // Detect duplicates across different active plans
  slipToActivePlansMap.forEach((planIds, slip) => {
    if (planIds.length > 1) {
      alerts.push({
        id: `ALERT-DUP-SLIP-${slip}`,
        type: 'ERROR',
        title: 'DUPLICATE GATE SLIP ACROSS VEHICLE PLANS',
        message: `Gate Slip "${slip}" is referenced by multiple active plans: ${planIds.join(', ')}. Multiple active plans must not share the same Gate Slip.`,
        relatedPlanIds: planIds,
        relatedGateSlips: [slip],
        createdAt: new Date().toISOString(),
      });
    }
  });

  return alerts;
}
