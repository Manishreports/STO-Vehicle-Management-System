let planSeq = 1;
let vsSeq = 1;
let relSeq = 1;

export function setInitialSequences(maxPlan: number, maxVs: number, maxRel: number) {
  if (maxPlan >= planSeq) planSeq = maxPlan + 1;
  if (maxVs >= vsSeq) vsSeq = maxVs + 1;
  if (maxRel >= relSeq) relSeq = maxRel + 1;
}

export function normalizePlanIdSequence(plans: { id: string }[]): number {
  let max = 0;
  for (const p of plans) {
    const m = p.id.match(/\d+/);
    if (m) {
      const val = parseInt(m[0], 10);
      if (!isNaN(val) && val > max) max = val;
    }
  }
  return max;
}

export function generatePlanId(explicitSeq?: number): string {
  const num = explicitSeq !== undefined ? explicitSeq + 1 : planSeq++;
  const pad = String(num).padStart(4, '0');
  return `PLAN-${pad}`;
}

export function generateVsId(explicitSeq?: number): string {
  const num = explicitSeq !== undefined ? explicitSeq + 1 : vsSeq++;
  const pad = String(num).padStart(4, '0');
  return `VS-${pad}`;
}

export function generateRelId(explicitSeq?: number): string {
  const num = explicitSeq !== undefined ? explicitSeq + 1 : relSeq++;
  const pad = String(num).padStart(4, '0');
  return `REL-${pad}`;
}

export function generateUniqueId(prefix: string = 'ID'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}
