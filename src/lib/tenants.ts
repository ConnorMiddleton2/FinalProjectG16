export type TenantCategory =
  | "active"
  | "pending"
  | "past_due"
  | "vacating"
  | "terminated";

/** Payment standing — optional on older records; derived from pendingDue when missing. */
export type PaymentStatus = "current" | "late" | "partial";

export type {
  TenantPaymentMethod,
} from "@/lib/payment-methods";

import {
  isTenantPaymentMethod,
  type TenantPaymentMethod,
} from "@/lib/payment-methods";

export type TenantRecord = {
  id: string;
  name: string;
  /** Unit or suite. */
  unit: string;
  /** Property / building leased (soft name link). */
  propertyLeased: string;
  /** Lease status. */
  category: TenantCategory;
  /** Balance currently owed (current month + arrears + late fees). */
  pendingDue: number;
  /** Contracted monthly rent / lease payment. */
  monthlyRent: number;
  /** Unit / suite rentable square footage. */
  sqft: number;
  ageYears: number;
  /** Lease start date (ISO yyyy-mm-dd). */
  dateLeased: string;
  /** Lease end date — optional for older seed/shared rows. */
  leaseEnd?: string;
  /** Explicit payment status — optional; falls back from pendingDue. */
  paymentStatus?: PaymentStatus;
  /**
   * Preferred rent payment method (ACH, check, debit card).
   * Synced with the tenant portal payment-method picker.
   */
  paymentMethod?: TenantPaymentMethod;
  /**
   * @deprecated Prefer paymentMethod. Kept in sync: true when paymentMethod === "ach".
   */
  achAutopay?: boolean;
  /**
   * Set when an overdue case cures via payment — tenant stays on the roster
   * but is flagged for the delinquency infraction.
   */
  collectionsInfraction?: {
    flaggedAt: string;
    reason: string;
    daysPastDueAtCure: number;
    amountAtCure: number;
    noticeCount: number;
  };
};

export const TENANT_CATEGORIES: { value: TenantCategory; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "past_due", label: "Past due" },
  { value: "vacating", label: "Vacating" },
  { value: "terminated", label: "Terminated / evicted" },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "late", label: "Late" },
  { value: "partial", label: "Partial" },
];

export function tenantCategoryLabel(value: TenantCategory): string {
  return TENANT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function paymentStatusLabel(value: PaymentStatus): string {
  return PAYMENT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

/** Outstanding balance (existing pendingDue field). */
export function getOutstandingBalance(t: TenantRecord): number {
  return Number.isFinite(t.pendingDue) ? t.pendingDue : 0;
}

export function getLeaseStart(t: TenantRecord): string {
  return t.dateLeased || "";
}

export function getLeaseEnd(t: TenantRecord): string {
  return t.leaseEnd || "";
}

export function getMonthlyRent(t: TenantRecord): number {
  return typeof t.monthlyRent === "number" && Number.isFinite(t.monthlyRent)
    ? t.monthlyRent
    : 0;
}

/** Prefer stored paymentStatus; otherwise infer from outstanding balance. */
export function getPaymentStatus(t: TenantRecord): PaymentStatus {
  if (t.paymentStatus) return t.paymentStatus;
  const due = getOutstandingBalance(t);
  if (due <= 0) return "current";
  if (t.category === "past_due") return "late";
  return "partial";
}

export function isLeaseExpiringWithinDays(
  t: TenantRecord,
  days: number,
  now = new Date()
): boolean {
  const end = getLeaseEnd(t);
  if (!end) return false;
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(endDate.getTime())) return false;
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const cutoff = new Date(startOfToday);
  cutoff.setDate(cutoff.getDate() + days);
  return endDate >= startOfToday && endDate <= cutoff;
}

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDay(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Categories that mean the tenancy has ended. */
function categoryMeansFormer(category: string): boolean {
  return (
    category === "former" ||
    category === "expired" ||
    category === "terminated"
  );
}

/**
 * Former / expired: lease end before today, or category indicates former/expired/terminated.
 */
export function isFormerOrExpired(
  t: TenantRecord,
  now = new Date()
): boolean {
  if (categoryMeansFormer(t.category)) return true;
  const end = parseDay(getLeaseEnd(t));
  const today = startOfDay(now);
  return !!end && end < today;
}

/**
 * Currently occupying: started on/before today, not former/expired,
 * and lease end is missing (open-ended) or on/after today.
 */
export function isCurrentlyOccupying(
  t: TenantRecord,
  now = new Date()
): boolean {
  if (isFormerOrExpired(t, now)) return false;
  const today = startOfDay(now);
  const start = parseDay(getLeaseStart(t));
  if (!start || start > today) return false;
  const end = parseDay(getLeaseEnd(t));
  if (!end) return true;
  return end >= today;
}

/** Current tenant = currently occupying (may also be vacating or expiring). */
export function isCurrentTenant(t: TenantRecord, now = new Date()): boolean {
  return isCurrentlyOccupying(t, now);
}

/** Vacating: currently occupying and category is vacating. */
export function isVacatingOccupant(
  t: TenantRecord,
  now = new Date()
): boolean {
  return isCurrentlyOccupying(t, now) && t.category === "vacating";
}

/** Expiring within N days while still occupying. */
export function isExpiringOccupant(
  t: TenantRecord,
  days: number,
  now = new Date()
): boolean {
  return (
    isCurrentlyOccupying(t, now) && isLeaseExpiringWithinDays(t, days, now)
  );
}

/** Late-paying among current (occupying) tenants. */
export function isLatePayingCurrent(
  t: TenantRecord,
  now = new Date()
): boolean {
  return isCurrentTenant(t, now) && getPaymentStatus(t) === "late";
}

/**
 * Concise lease-status label for the tenant master-list overview column.
 * Does not incorporate payment status.
 */
export function leaseStatusOverviewLabel(
  t: TenantRecord,
  now = new Date()
): string {
  if (isFormerOrExpired(t, now)) {
    return t.category === "terminated" ? "Evicted" : "Former";
  }
  if (t.category === "past_due") return "Past due";
  if (t.category === "pending") return "Pending";
  if (isExpiringOccupant(t, 90, now)) return "Expiring";
  if (isCurrentTenant(t, now)) return "Current";
  return tenantCategoryLabel(t.category);
}

export type OccupancyFilter =
  | "all"
  | "current"
  | "expiring90"
  | "vacating"
  | "former";

export const OCCUPANCY_FILTERS: {
  value: OccupancyFilter;
  label: string;
}[] = [
  { value: "all", label: "All tenant records" },
  { value: "current", label: "Current tenants" },
  { value: "expiring90", label: "Expiring within 90 days" },
  { value: "vacating", label: "Vacating" },
  { value: "former", label: "Former or expired tenants" },
];

export function matchesOccupancyFilter(
  t: TenantRecord,
  filter: OccupancyFilter,
  now = new Date()
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "current":
      return isCurrentTenant(t, now);
    case "expiring90":
      return isExpiringOccupant(t, 90, now);
    case "vacating":
      return isVacatingOccupant(t, now);
    case "former":
      return isFormerOrExpired(t, now);
    default:
      return true;
  }
}

export function emptyTenant(): Omit<TenantRecord, "id"> {
  return {
    name: "",
    unit: "",
    propertyLeased: "",
    category: "active",
    pendingDue: 0,
    monthlyRent: 0,
    sqft: 0,
    ageYears: 0,
    dateLeased: new Date().toISOString().slice(0, 10),
    leaseEnd: "",
    paymentStatus: "current",
    paymentMethod: "ach",
    achAutopay: true,
  };
}

/** Resolve payment method from new field or legacy achAutopay. */
export function getPaymentMethod(t: TenantRecord): TenantPaymentMethod {
  if (isTenantPaymentMethod(t.paymentMethod)) return t.paymentMethod;
  if (t.achAutopay === true) return "ach";
  return "check";
}

/** Apply payment method and keep achAutopay derived for older consumers. */
export function withPaymentMethod(
  t: TenantRecord,
  method: TenantPaymentMethod
): TenantRecord {
  return {
    ...t,
    paymentMethod: method,
    achAutopay: method === "ach",
  };
}

/** Whether the tenant has ACH as their payment method. */
export function hasAchAutopay(t: TenantRecord): boolean {
  return getPaymentMethod(t) === "ach";
}

export function seedTenants(): TenantRecord[] {
  // Portfolio data is seeded into shared_records via scripts/seed-portfolio.mjs
  return [];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Professional label for optional fields that were never filled on older records. */
export const MISSING_FIELD_LABEL = "Not entered";

export function formatOptionalLeaseDate(iso: string): string {
  if (!iso) return MISSING_FIELD_LABEL;
  return formatLeaseDate(iso);
}

export function formatOptionalRent(amount: number): string {
  if (!amount) return MISSING_FIELD_LABEL;
  return formatCurrency(amount);
}

export function formatLeaseDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Soft name match for property / building labels across collections (no FK). */
export function softPropertyNamesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Count master-list tenants whose propertyLeased soft-matches a property name. */
export function countMasterTenantsForProperty(
  tenants: TenantRecord[],
  propertyName: string
): number {
  if (!propertyName.trim()) return 0;
  return tenants.filter((t) =>
    softPropertyNamesMatch(t.propertyLeased, propertyName)
  ).length;
}
