/**
 * Shared Weight Formatter and Normalizer
 * Rule:
 * 300 Kgs = 0.300 MT
 * 06 Ton = 6.000 MT
 * 11 Ton = 11.000 MT
 * If value is exactly 18 MT: display "18 Ton" (not 18.000).
 * If value has decimals: display e.g. "17.3 Ton".
 */

export function parseWeightToMt(input: string | number): number {
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }
  if (!input) return 0;

  const text = String(input).trim();
  // If there are multiple parts separated by '+' or '/' or ','
  const parts = text.split(/[+,/]/);
  let totalMt = 0;

  for (const part of parts) {
    const p = part.trim().toLowerCase();
    if (!p) continue;

    // Check for "kg" or "kgs"
    const kgMatch = p.match(/([\d.]+)\s*(?:kg|kgs)/i);
    if (kgMatch) {
      const kg = parseFloat(kgMatch[1]);
      if (!isNaN(kg)) totalMt += kg / 1000;
      continue;
    }

    // Check for "ton", "tons", "mt", "tonne"
    const tonMatch = p.match(/([\d.]+)\s*(?:ton|tons|mt|tonne|tonnes)/i);
    if (tonMatch) {
      const ton = parseFloat(tonMatch[1]);
      if (!isNaN(ton)) totalMt += ton;
      continue;
    }

    // Direct number
    const num = parseFloat(p.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) {
      // If number is > 100, assume it is kg, otherwise ton
      if (num >= 500) {
        totalMt += num / 1000;
      } else {
        totalMt += num;
      }
    }
  }

  return Math.round(totalMt * 1000) / 1000;
}

export function formatWeight(weightMt: number): string {
  if (isNaN(weightMt) || weightMt === 0) return '0 Ton';

  // If integer
  if (Math.abs(weightMt - Math.round(weightMt)) < 0.0001) {
    return `${Math.round(weightMt)} Ton`;
  }

  // Float up to 3 decimal places without trailing zeroes
  const formatted = parseFloat(weightMt.toFixed(3)).toString();
  return `${formatted} Ton`;
}
