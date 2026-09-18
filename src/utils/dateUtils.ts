/**
 * Date normalization and comparison utilities
 */

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

export function normalizeDate(input: string | number | Date | null | undefined): string {
  if (input === null || input === undefined) return '';

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '';
    const day = String(input.getDate()).padStart(2, '0');
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const year = input.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const trimmed = String(input).trim();
  if (!trimmed) return '';

  // Check for Excel serial number (numeric between 25000 and 65000: years ~1968 to 2077)
  if (/^\d{5}(?:\.\d+)?$/.test(trimmed)) {
    const serial = parseFloat(trimmed);
    if (serial >= 25000 && serial <= 65000) {
      const utcDays = Math.floor(serial - 25569);
      const d = new Date(utcDays * 86400 * 1000);
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}-${month}-${year}`;
      }
    }
  }

  // If format starts with DD-MM-YYYY or DD/MM/YYYY (with optional time after)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s+.*|T.*)?$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${day}-${month}-${year}`;
  }

  // If format starts with YYYY-MM-DD or YYYY/MM/DD (with optional time after)
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+.*|T.*)?$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // If format has month names e.g. 14-Sep-2026, 14 Sep 2026, 14-September-26
  const textMonthMatch = trimmed.match(/^(\d{1,2})[-/.\s]+([A-Za-z]+)[-/.\s]+(\d{2,4})(?:\s+.*)?$/);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0');
    const mStr = textMonthMatch[2].toLowerCase();
    const month = MONTH_MAP[mStr] || MONTH_MAP[mStr.slice(0, 3)];
    let year = textMonthMatch[3];
    if (year.length === 2) year = `20${year}`;
    if (month) {
      return `${day}-${month}-${year}`;
    }
  }

  // If standard JS ISO date parseable
  if (trimmed.includes('T') || trimmed.includes(':')) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  return trimmed;
}

export function parseDateObj(dateStr: string): Date | null {
  const norm = normalizeDate(dateStr);
  const parts = norm.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Delayed calculation for Vehicle Gate In Pending:
 * today - Required Date
 * 0 or negative: "Same Day"
 * 1: "01 Days"
 * 2: "02 Days"
 * etc.
 */
export function calculateDelay(requiredDateStr: string, referenceDateStr?: string): { days: number; display: string } {
  const reqDate = parseDateObj(requiredDateStr);
  if (!reqDate) {
    return { days: 0, display: '—' };
  }

  const today = referenceDateStr ? parseDateObj(referenceDateStr) || new Date() : new Date();
  today.setHours(0, 0, 0, 0);
  reqDate.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - reqDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { days: diffDays, display: 'Same Day' };
  }

  const pad = String(diffDays).padStart(2, '0');
  return { days: diffDays, display: `${pad} Days` };
}

export function getTodayString(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}
