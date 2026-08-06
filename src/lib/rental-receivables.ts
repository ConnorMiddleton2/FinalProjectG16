/**
 * Read-only view of AR teammate `rental_receivables` rows.
 * Do not write this collection from Collections features.
 */

export type RentalReceivable = {
  id: string;
  receivableId?: string;
  kind?: string;
  category: string;
  amount: number;
  amountReceived: number;
  disputed?: boolean;
  dueDate: string;
  invoiceDate?: string;
  period?: string;
  property?: string;
  unit?: string;
  customerId: string;
  customerName?: string;
  description?: string;
  notes?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt?: string;
  fileName?: string;
};

/** Normalize AR customerId (T-1006) to tenants.id (t-1006). */
export function normalizeCustomerId(customerId: string): string {
  return customerId.trim().toLowerCase();
}

export function openReceivableAmount(r: RentalReceivable): number {
  const amount = Number(r.amount) || 0;
  const received = Number(r.amountReceived) || 0;
  return Math.max(0, amount - received);
}

/** Optional AR status — exclude when a supported canceled/void value is present. */
export function isCanceledReceivable(r: RentalReceivable): boolean {
  const raw = (r as RentalReceivable & { status?: string }).status;
  if (typeof raw !== "string") return false;
  const status = raw.trim().toLowerCase();
  return (
    status === "canceled" ||
    status === "cancelled" ||
    status === "void" ||
    status === "voided"
  );
}

/**
 * Open A/R contributing to profile Amount due:
 * max(amount − amountReceived, 0) > 0, not canceled/void when status exists.
 * Disputed open amounts are included here; they do not drive collections aging.
 */
export function isOpenReceivableForAmountDue(r: RentalReceivable): boolean {
  if (isCanceledReceivable(r)) return false;
  return openReceivableAmount(r) > 0;
}

/** Sum of open A/R for a tenant (customerId ↔ tenants.id, case-normalized). */
export function tenantAmountDue(
  tenantId: string,
  receivables: RentalReceivable[]
): number {
  const id = normalizeCustomerId(tenantId);
  let sum = 0;
  for (const r of receivables) {
    if (normalizeCustomerId(r.customerId) !== id) continue;
    if (!isOpenReceivableForAmountDue(r)) continue;
    sum += openReceivableAmount(r);
  }
  return sum;
}

/**
 * Current rent due: open balance on the most recent base_rent row with
 * dueDate on or before today. Returns null when no applicable row exists
 * (UI shows an em dash). Disputed rows may appear; they do not age collections.
 * Does not sum historical periods or use tenants.pendingDue.
 */
export function tenantCurrentRentDue(
  tenantId: string,
  receivables: RentalReceivable[],
  now = new Date()
): number | null {
  const id = normalizeCustomerId(tenantId);
  const today = startOfDay(now);
  let best: RentalReceivable | null = null;
  let bestIso = "";

  for (const r of receivables) {
    if (normalizeCustomerId(r.customerId) !== id) continue;
    if (r.category !== "base_rent") continue;
    if (isCanceledReceivable(r)) continue;
    const due = parseIsoDay(r.dueDate);
    if (!due || due > today) continue;
    const iso = r.dueDate.slice(0, 10);
    if (
      !best ||
      iso > bestIso ||
      (iso === bestIso && r.id > best.id)
    ) {
      best = r;
      bestIso = iso;
    }
  }

  if (!best) return null;
  return openReceivableAmount(best);
}

/**
 * Sum of qualifying overdue base-rent open balances (same gate as collections aging).
 */
export function tenantRentOverdue(
  tenantId: string,
  receivables: RentalReceivable[],
  now = new Date()
): number {
  const id = normalizeCustomerId(tenantId);
  let sum = 0;
  for (const r of receivables) {
    if (normalizeCustomerId(r.customerId) !== id) continue;
    if (!isQualifyingOverdueBaseRent(r, now)) continue;
    sum += openReceivableAmount(r);
  }
  return sum;
}

function parseIsoDay(iso: string): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Inclusive calendar-day difference: today − dueDate (Aug 2 − Aug 1 = 1). */
export function calendarDaysBetween(later: Date, earlier: Date): number {
  const a = startOfDay(later).getTime();
  const b = startOfDay(earlier).getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

/**
 * Qualifying unpaid base rent for Collections:
 * category base_rent, open balance, not disputed, valid dueDate before today.
 */
export function isQualifyingOverdueBaseRent(
  r: RentalReceivable,
  now = new Date()
): boolean {
  if (r.category !== "base_rent") return false;
  if (r.disputed === true) return false;
  if (openReceivableAmount(r) <= 0) return false;
  const due = parseIsoDay(r.dueDate);
  if (!due) return false;
  const today = startOfDay(now);
  return due < today;
}

/** Days overdue: due date itself is not overdue; day after = 1. */
export function daysOverdueForReceivable(
  r: RentalReceivable,
  now = new Date()
): number {
  const due = parseIsoDay(r.dueDate);
  if (!due) return 0;
  const days = calendarDaysBetween(startOfDay(now), due);
  return Math.max(0, days);
}

export function obligationDisplayId(r: RentalReceivable): string {
  return r.receivableId || r.id;
}

/**
 * Prefer explicit AR `period` (e.g. "Jul 2026"); otherwise derive from due date.
 */
export function getRentPeriodLabel(r: RentalReceivable): string {
  const explicit = typeof r.period === "string" ? r.period.trim() : "";
  if (explicit) return explicit;
  if (!r.dueDate) return "—";
  const d = new Date(`${r.dueDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
