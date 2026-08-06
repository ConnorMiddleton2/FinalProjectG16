/** Shared money helpers for Maintenance, AP, and AR (same conventions). */

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Parses a currency text field, returning null when it is not a valid positive amount. */
export function parsePositiveAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return round2(value);
}

/** Parses an optional payment amount; blank counts as zero. */
export function parsePaidAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return round2(value);
}

/** Add calendar days to an ISO date (YYYY-MM-DD). */
export function addDaysIso(isoDate: string, days: number) {
  const base = Date.parse(`${isoDate}T00:00:00`);
  if (Number.isNaN(base)) return "";
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
