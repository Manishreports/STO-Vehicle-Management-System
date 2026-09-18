import {
  VehicleStatusRecord,
  VehiclePlan,
  GateRecord,
  LoadingPointMapping,
  Page2DerivedRow,
  AuthoritativeRelationship,
} from '../types/models';
import { normalizeDate } from '../utils/dateUtils';
import { relationshipService } from './relationshipService';
import { enrichPlanWithGateData } from './gateEnrichmentService';

/**
 * Check loading point match using reference mapping table (Section 13)
 * Reference only: does not mutate source data.
 */
export function isMatchingLoadingPoint(
  statusLoadingPt: string,
  planLoading: string,
  mappings: LoadingPointMapping[]
): boolean {
  if (!statusLoadingPt || !planLoading) return false;

  const sPt = statusLoadingPt.trim().toUpperCase();
  const pLoad = planLoading.trim().toUpperCase();

  if (sPt === pLoad) return true;

  // Check in mapping reference table
  for (const m of mappings) {
    const mapStatus = m.sourceString.trim().toUpperCase();
    const mapPlan = m.targetLoadingPoint.trim().toUpperCase();

    if (sPt === mapStatus && pLoad === mapPlan) {
      return true;
    }
  }

  // Also check direct "XXX" vs "XXX LOADING"
  if (pLoad === `${sPt} LOADING` || sPt === `${pLoad} LOADING`) {
    return true;
  }

  return false;
}

/**
 * Checks Normal Exact Match key:
 * Demanded Date + Location + Loading Pt. ↔ Date + CFA + Loading
 */
export function isExactMatch(
  vs: VehicleStatusRecord,
  plan: VehiclePlan,
  loadingMappings: LoadingPointMapping[] = []
): boolean {
  if (plan.isCancelled) return false;
  const vsNormDate = normalizeDate(vs.demandedDate);
  const planNormDate = normalizeDate(plan.date);
  if (vsNormDate !== planNormDate) return false;

  const vsLoc = vs.location.trim().toUpperCase();
  const planCfa = plan.cfa.trim().toUpperCase();
  if (vsLoc !== planCfa) return false;

  return isMatchingLoadingPoint(vs.loadingPt, plan.loading, loadingMappings);
}

/**
 * SECTION 49 & 50:
 * Authoritative Page 2 Resolver
 * 1. normal exact match (Date + CFA + Loading ↔ Demanded Date + Location + Loading Pt.)
 * 2. confirmed Vehicle Status Bridge relationship
 * 3. otherwise unresolved / Pending
 * No legacy fallbacks!
 */
export function resolvePage2Data(
  statusRecords: VehicleStatusRecord[],
  plans: VehiclePlan[],
  gateRecords: GateRecord[],
  loadingMappings: LoadingPointMapping[]
): Page2DerivedRow[] {
  // Clean references for cancelled plans first (Section 21)
  relationshipService.cleanCancelledPlans(plans);

  const activePlans = plans.filter((p) => !p.isCancelled);
  const activePlanMap = new Map<string, VehiclePlan>();
  activePlans.forEach((p) => activePlanMap.set(p.id, p));

  const allRelationships = relationshipService.getAll();
  const relByVsId = new Map<string, AuthoritativeRelationship>();
  allRelationships.forEach((r) => relByVsId.set(r.vehicleStatusId, r));

  const relByPlanId = new Map<string, AuthoritativeRelationship>();
  allRelationships.forEach((r) => relByPlanId.set(r.planId, r));

  // STEP 1 & 2: Resolve for each Vehicle Status record
  const results: Page2DerivedRow[] = [];

  for (const vs of statusRecords) {
    let matchedPlan: VehiclePlan | null = null;
    let relSource: 'NORMAL_MATCH' | 'BRIDGE_EXPLICIT' | null = null;

    // Check if there is already an authoritative relationship in place
    const existingRel = relByVsId.get(vs.id);
    if (existingRel) {
      const plan = activePlanMap.get(existingRel.planId);
      if (plan) {
        matchedPlan = plan;
        relSource = existingRel.source;
      } else {
        // Plan may have been cancelled or deleted
        relationshipService.removeRelationship(existingRel.id);
      }
    }

    // If not yet matched, attempt STEP 1: Normal Exact Match (Section 12 & 16)
    if (!matchedPlan) {
      const vsNormDate = normalizeDate(vs.demandedDate);
      const vsLoc = vs.location.trim().toUpperCase();

      for (const plan of activePlans) {
        // One active plan = one active vehicle status owner (Section 18)
        if (relByPlanId.has(plan.id)) continue;

        const planNormDate = normalizeDate(plan.date);
        const planCfa = plan.cfa.trim().toUpperCase();

        // Exact match key ONLY:
        // Demanded Date + Location + Loading Pt. ↔ Date + CFA + Loading
        if (
          vsNormDate === planNormDate &&
          vsLoc === planCfa &&
          isMatchingLoadingPoint(vs.loadingPt, plan.loading, loadingMappings)
        ) {
          // Establish authoritative relationship
          const linkRes = relationshipService.createRelationship(
            vs.id,
            plan.id,
            'NORMAL_MATCH',
            plans,
            statusRecords,
            'Auto Normal Exact Match'
          );

          if (linkRes.success && linkRes.relationship) {
            matchedPlan = plan;
            relSource = 'NORMAL_MATCH';
            relByVsId.set(vs.id, linkRes.relationship);
            relByPlanId.set(plan.id, linkRes.relationship);
            break;
          }
        }
      }
    }

    // Gate enrichment derived from linked plan (Authoritative plan-level gate fields)
    let gateSlip = '—';
    let vehicleArrived = 'Pending';
    let vehicleNumber = '—';
    let vehicleDispatch = 'Pending';
    let remarks = 'Pending';

    if (matchedPlan) {
      // Authoritative resolution from current enriched plan object
      if (matchedPlan.slipNumber) {
        gateSlip = matchedPlan.slipNumber;
        vehicleNumber = matchedPlan.vehicleNumber || '—';
        vehicleArrived = matchedPlan.vehicleIn || 'Pending';
        vehicleDispatch = matchedPlan.vehicleOut || 'Pending';
        remarks = matchedPlan.remarks || 'Dispatched';
      } else {
        // Fallback if raw plan was supplied
        const gateInfo = enrichPlanWithGateData(matchedPlan, gateRecords);
        gateSlip = gateInfo.gateSlip || '—';
        vehicleNumber = gateInfo.vehicleNumber || '—';
        vehicleArrived = gateInfo.vehicleIn || 'Pending';
        vehicleDispatch = gateInfo.vehicleOut || 'Pending';
        remarks = gateInfo.remarks || (gateInfo.gateSlip ? 'Gate In Processed' : 'Plan Linked');
      }
    }

    results.push({
      statusRecord: vs,
      matchedPlan,
      relationshipSource: relSource,
      gateSlip,
      vehicleArrived,
      vehicleNumber,
      vehicleDispatch,
      remarks,
    });
  }

  return results;
}
