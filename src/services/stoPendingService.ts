import { VehiclePlan, GateRecord, ExtraStoRecord, PlanChild } from '../types/models';

export interface StoPendingItem {
  id: string; // Composite unique key: e.g. `${plan.id}-${sto}`
  planId: string;
  date: string;
  cfa: string;
  loading: string;
  weight: string;
  weightMt: number;
  location: string;
  sto: string;
  vehicleNumber?: string;
  gateSlip?: string;
  vehicleIn?: string;
  vehicleOut?: string;
  status: 'CORE_PENDING' | 'PARTIAL_PENDING';
  isFulfilled?: boolean;
}

const NON_STO_KEYWORDS = new Set([
  'main',
  'dros',
  'aqua',
  'ecom',
  'bakal',
  'tolagaon',
  'waluj',
  'butibori',
  'pune',
  'plant',
  'loc',
  'location',
  'cfa',
  'loading',
  'weight',
  'ton',
  'kgs',
  'kg',
  'mt',
  'total',
  'nan',
  'null',
  'undefined',
]);

/**
 * Normalizes an individual STO string:
 * - Trims whitespace
 * - Strips trailing .0 from Excel numbers
 * - Converts scientific notation
 */
export function cleanStoNumber(sto: string | null | undefined): string {
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

/**
 * Validates whether a value is a genuine numeric STO
 * Must be pure numeric digits between 5 and 15 characters, not matching reserved keywords.
 */
export function isNumericSto(val: string): boolean {
  const cleaned = cleanStoNumber(val);
  if (!cleaned) return false;
  if (NON_STO_KEYWORDS.has(cleaned.toLowerCase())) return false;
  return /^\d{5,15}$/.test(cleaned);
}

/**
 * Bulk parses input text (comma, space, tab, newline separated)
 * and returns valid, deduplicated numeric STO strings.
 */
export function parseAndValidateStoTokens(rawText: string): string[] {
  if (!rawText) return [];
  const rawTokens = rawText.split(/[\s,;\t\r\n]+/);
  const validStos: string[] = [];
  const seen = new Set<string>();

  for (const raw of rawTokens) {
    const cleaned = cleanStoNumber(raw);
    if (isNumericSto(cleaned) && !seen.has(cleaned)) {
      seen.add(cleaned);
      validStos.push(cleaned);
    }
  }

  return validStos;
}

/**
 * Checks if a vehicle has dispatched (Vehicle Out has happened)
 */
export function isVehicleOutDone(vehicleOut: string | null | undefined): boolean {
  if (!vehicleOut) return false;
  const v = vehicleOut.trim().toLowerCase();
  return (
    v !== '' &&
    v !== 'pending' &&
    v !== '—' &&
    v !== '-' &&
    v !== 'null' &&
    v !== 'undefined'
  );
}

/**
 * Builds a lookup set of STOs that have confirmed Gate Out dispatch
 * based on GateRecord entries.
 */
export function buildGateOutStosSet(gateRecords: GateRecord[] = []): Set<string> {
  const set = new Set<string>();
  for (const g of gateRecords) {
    if (!g.sto) continue;
    const isGateOutType = g.type === 'GATE_OUT';
    const isDispatchedRemark = Boolean(
      g.remarks && g.remarks.trim().toLowerCase() === 'dispatched'
    );
    const hasOutTime = Boolean(
      g.vehicleOutTime &&
        g.vehicleOutTime.trim() !== '' &&
        g.vehicleOutTime.trim() !== '—' &&
        g.vehicleOutTime.trim() !== '-' &&
        g.vehicleOutTime.trim().toLowerCase() !== 'pending' &&
        g.vehicleOutTime.trim().toLowerCase() !== 'null'
    );

    if (isGateOutType || isDispatchedRemark || hasOutTime) {
      const tokens = g.sto.split(/[\s,;\t\r\n/]+/).map(cleanStoNumber).filter(Boolean);
      for (const t of tokens) {
        set.add(t);
      }
    }
  }
  return set;
}

/**
 * Evaluates whether an individual STO is completed/fulfilled.
 *
 * Sources of truth:
 * 1. Explicitly present in the completedStos registry / set
 * 2. PlanChild has explicit completion flag or completed/dispatched status
 * 3. Authoritative Gate Out / Dispatched confirmed for this specific STO
 * 4. Extra STO confirmed merged & dispatched
 */
export function isStoCompleted(
  sto: string,
  child: PlanChild | null | undefined,
  completedSet: Set<string>,
  gateOutStosSet: Set<string>,
  extraCompletedStosSet?: Set<string>
): boolean {
  const clean = cleanStoNumber(sto);
  if (!clean) return false;

  // 1. Explicit completion in completedStos
  if (completedSet.has(clean)) {
    return true;
  }

  // 2. Child-level explicit completed flag/status
  if (child) {
    if (child.isCompleted === true) return true;
    const childStatus = (child.status || '').trim().toLowerCase();
    if (childStatus === 'completed' || childStatus === 'dispatched') return true;
  }

  // 3. Gate Out / Dispatched gate record for this specific STO
  if (gateOutStosSet.has(clean)) {
    return true;
  }

  // 4. Extra STO completed
  if (extraCompletedStosSet && extraCompletedStosSet.has(clean)) {
    return true;
  }

  return false;
}

/**
 * Computes Core Pending and Partial Pending STO datasets.
 *
 * Requirements (Sections 2-24):
 * For each active Vehicle Plan:
 * 1. Identify its individual STOs.
 * 2. Determine Vehicle Out state.
 * 3. If Vehicle Out is NOT DONE:
 *    Unblocked incomplete STOs → Core Pending.
 * 4. If Vehicle Out IS DONE:
 *    Evaluate EACH individual STO:
 *    - Completed STOs → exclude.
 *    - Incomplete STOs → Partial Pending.
 * 5. Blocked STOs → exclude from both.
 * 6. Deduplicated by exact STO identity; strict mutual exclusivity.
 */
export function computeStoPendingDatasets(
  plans: VehiclePlan[],
  blockedStos: string[],
  completedStos: string[] = [],
  gateRecords: GateRecord[] = [],
  extraStos: ExtraStoRecord[] = []
): {
  corePending: StoPendingItem[];
  partialPending: StoPendingItem[];
} {
  const blockedSet = new Set(blockedStos.map(cleanStoNumber).filter(Boolean));
  const completedSet = new Set(completedStos.map(cleanStoNumber).filter(Boolean));
  const gateOutStosSet = buildGateOutStosSet(gateRecords);

  const extraCompletedStosSet = new Set<string>();
  if (extraStos && extraStos.length > 0) {
    for (const ex of extraStos) {
      const cleanEx = cleanStoNumber(ex.stoNumber);
      if (cleanEx && gateOutStosSet.has(cleanEx)) {
        extraCompletedStosSet.add(cleanEx);
      }
    }
  }

  const corePending: StoPendingItem[] = [];
  const partialPending: StoPendingItem[] = [];

  const seenCoreStos = new Set<string>();
  const seenPartialStos = new Set<string>();

  const activePlans = plans.filter((p) => !p.isCancelled);

  for (const plan of activePlans) {
    const outDone = isVehicleOutDone(plan.vehicleOut);

    // Extract child STOs or fallback to primary loc if no children
    const childEntries =
      plan.children && plan.children.length > 0
        ? plan.children
        : [{ id: `${plan.id}-default`, location: plan.loc, sto: '' }];

    for (const child of childEntries) {
      const sto = cleanStoNumber(child.sto);
      if (!isNumericSto(sto)) continue;

      // Rule: Blocked/Cancelled STOs are excluded from BOTH Core & Partial Pending
      if (blockedSet.has(sto)) {
        continue;
      }

      // Determine whether this individual STO is completed/dispatched
      const stoIsDone = isStoCompleted(
        sto,
        child,
        completedSet,
        gateOutStosSet,
        extraCompletedStosSet
      );

      if (!outDone) {
        // CORE PENDING: Vehicle Out has NOT happened yet
        // Unblocked incomplete STOs belong to Core Pending
        if (!stoIsDone) {
          if (!seenCoreStos.has(sto) && !seenPartialStos.has(sto)) {
            seenCoreStos.add(sto);
            corePending.push({
              id: `${plan.id}-${sto}`,
              planId: plan.id,
              date: plan.date,
              cfa: plan.cfa,
              loading: plan.loading,
              weight: child.weight || plan.rawWeight,
              weightMt: child.weightMt !== undefined ? child.weightMt : plan.weightMt,
              location: child.location || plan.loc,
              sto,
              vehicleNumber: plan.vehicleNumber,
              gateSlip: plan.slipNumber || '',
              vehicleIn: plan.vehicleIn,
              vehicleOut: plan.vehicleOut,
              status: 'CORE_PENDING',
            });
          }
        }
      } else {
        // PARTIAL PENDING: Vehicle Out IS DONE (vehicle has dispatched)
        // Evaluate EACH individual STO:
        // - Completed STOs → exclude
        // - Incomplete STOs → Partial Pending
        if (!stoIsDone) {
          if (!seenPartialStos.has(sto) && !seenCoreStos.has(sto)) {
            seenPartialStos.add(sto);
            partialPending.push({
              id: `${plan.id}-${sto}`,
              planId: plan.id,
              date: plan.date,
              cfa: plan.cfa,
              loading: plan.loading,
              weight: child.weight || plan.rawWeight,
              weightMt: child.weightMt !== undefined ? child.weightMt : plan.weightMt,
              location: child.location || plan.loc,
              sto,
              vehicleNumber: plan.vehicleNumber,
              gateSlip: plan.slipNumber || '',
              vehicleIn: plan.vehicleIn,
              vehicleOut: plan.vehicleOut,
              status: 'PARTIAL_PENDING',
              isFulfilled: false,
            });
          }
        }
      }
    }
  }

  return { corePending, partialPending };
}

/**
 * Generates clean Tab-Separated Values (TSV) for clipboard Excel copying.
 * Does not include internal IDs or action buttons.
 */
export function formatPendingItemsForExcel(
  items: StoPendingItem[],
  typeLabel: string
): string {
  const headers = [
    'Date',
    'CFA',
    'Loading',
    'Weight',
    'Location',
    'STO Number',
    'Gate Slip',
    'Vehicle Number',
    'Vehicle In',
    'Vehicle Out',
    'Status',
  ];

  const rows = items.map((item) => [
    item.date,
    item.cfa,
    item.loading,
    item.weight,
    item.location,
    item.sto,
    item.gateSlip || '',
    item.vehicleNumber || '',
    item.vehicleIn || '',
    item.vehicleOut || '',
    typeLabel,
  ]);

  return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
}
