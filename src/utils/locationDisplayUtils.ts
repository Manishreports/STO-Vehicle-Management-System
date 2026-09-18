/**
 * Location and CFA Display Numbering Utility
 *
 * Implements strict occurrence-based numbering:
 * - If base name appears ONLY ONCE in the current visible list: display base name without number (e.g. "Thane")
 * - If base name appears TWICE: display "Base 1", "Base 2"
 * - If base name appears THREE times: display "Base 1", "Base 2", "Base 3"
 *
 * When determining the BASE NAME:
 * - Ignores existing trailing numeric suffixes (e.g. "Thane", "Thane 1", "Thane 2" -> base "Thane").
 * - Does NOT alter underlying source values.
 */

/**
 * Normalizes location by removing any trailing numeric suffix to extract the canonical base name.
 * Examples:
 * - "Thane 1" -> "Thane"
 * - "Thane 2" -> "Thane"
 * - "Thane"   -> "Thane"
 * - "Ghaziabad 8" -> "Ghaziabad"
 * - "Zirakpur 3"  -> "Zirakpur"
 * - "Goa 1"       -> "Goa"
 */
export function getBaseLocationName(loc: string | null | undefined): string {
  if (!loc) return '';
  const trimmed = String(loc).trim();
  // Strip trailing whitespace followed by digits (e.g. "Thane 1", "Pune 2", "Loc 10")
  return trimmed.replace(/\s+\d+$/, '').trim();
}

/**
 * Computes display location names for a list of items based on base name occurrence count:
 * - If base name appears exactly once in the list: returns base name alone (e.g. "Thane")
 * - If base name appears 2+ times: returns "Base 1", "Base 2", ... in appearance order
 *
 * Preserves the original list sorting order.
 */
export function computeDisplayLocationNames<T>(
  items: T[],
  getLocation: (item: T) => string | null | undefined
): string[] {
  if (!items || items.length === 0) return [];

  // Step 1: Count total occurrences of each base name across the dataset
  const baseCounts = new Map<string, number>();
  const itemBaseNames: string[] = [];

  for (const item of items) {
    const raw = getLocation(item) || '';
    const base = getBaseLocationName(raw);
    itemBaseNames.push(base);
    if (base) {
      baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
    }
  }

  // Step 2: Track incremental sequence for base names that appear more than once
  const baseSequence = new Map<string, number>();

  return itemBaseNames.map((base) => {
    if (!base) return '';
    const totalCount = baseCounts.get(base) || 0;

    // Rule: If ONLY ONE occurrence of the base name exists, display base ONLY (e.g. "Thane", NOT "Thane 1")
    if (totalCount <= 1) {
      return base;
    }

    // Rule: If TWO or more occurrences exist, display numbered sequence "Base 1", "Base 2", etc.
    const seq = (baseSequence.get(base) || 0) + 1;
    baseSequence.set(base, seq);
    return `${base} ${seq}`;
  });
}
