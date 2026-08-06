export type TenantCategory =
  | "active"
  | "pending"
  | "past_due"
  | "vacating";

/** Payment standing — optional on older records; derived from pendingDue when missing. */
export type PaymentStatus = "current" | "late" | "partial";

export type TenantRecord = {
  id: string;
  name: string;
  /** Unit or suite. */
  unit: string;
  /** Property / building leased (soft name link). */
  propertyLeased: string;
  /** Lease status. */
  category: TenantCategory;
  /** Outstanding balance. */
  pendingDue: number;
  ageYears: number;
  /** Lease start date (ISO yyyy-mm-dd). */
  dateLeased: string;
  /** Lease end date — optional for older seed/shared rows. */
  leaseEnd?: string;
  /** Monthly rent — optional for older seed/shared rows. */
  monthlyRent?: number;
  /** Explicit payment status — optional; falls back from pendingDue. */
  paymentStatus?: PaymentStatus;
};

export const TENANT_CATEGORIES: { value: TenantCategory; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "past_due", label: "Past due" },
  { value: "vacating", label: "Vacating" },
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

/** Categories that mean the tenancy has ended (none in current enum; checked for safety). */
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
  if (isFormerOrExpired(t, now)) return "Former";
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
    ageYears: 0,
    dateLeased: new Date().toISOString().slice(0, 10),
    leaseEnd: "",
    monthlyRent: 0,
    paymentStatus: "current",
  };
}

export function seedTenants(): TenantRecord[] {
  return SEED_TENANTS.map((t) => ({ ...t }));
}

export const SEED_TENANTS: TenantRecord[] = [
  {
    id: "t-1001",
    name: "Northwind Retail LLC",
    unit: "Suite 110",
    propertyLeased: "Harborline Commons",
    category: "active",
    pendingDue: 0,
    ageYears: 8,
    dateLeased: "2022-03-01",
    leaseEnd: "2027-02-28",
    monthlyRent: 4200,
    paymentStatus: "current",
  },
  {
    id: "t-1002",
    name: "Cedar Dental Group",
    unit: "Suite 210",
    propertyLeased: "Harborline Commons",
    category: "past_due",
    pendingDue: 4850,
    ageYears: 12,
    dateLeased: "2021-06-15",
    leaseEnd: "2026-06-14",
    monthlyRent: 5100,
    paymentStatus: "late",
  },
  {
    id: "t-1003",
    name: "Bluefinch Advisors",
    unit: "Floor 4",
    propertyLeased: "Pierpoint Tower",
    category: "active",
    pendingDue: 0,
    ageYears: 5,
    dateLeased: "2023-01-01",
    leaseEnd: "2028-12-31",
    monthlyRent: 8900,
    paymentStatus: "current",
  },
  {
    id: "t-1004",
    name: "Maple Street Bakery",
    unit: "Retail A",
    propertyLeased: "Riverside Pavilion",
    category: "pending",
    pendingDue: 1200,
    ageYears: 3,
    dateLeased: "2024-09-01",
    leaseEnd: "2026-08-31",
    monthlyRent: 2800,
    paymentStatus: "partial",
  },
  {
    id: "t-1005",
    name: "Summit Robotics Inc.",
    unit: "Lab 2B",
    propertyLeased: "Pierpoint Tower",
    category: "vacating",
    pendingDue: 0,
    ageYears: 7,
    dateLeased: "2020-11-01",
    leaseEnd: "2026-05-31",
    monthlyRent: 7600,
    paymentStatus: "current",
  },
  {
    id: "t-1006",
    name: "Oak & Iron Fitness",
    unit: "Gym Wing",
    propertyLeased: "Riverside Pavilion",
    category: "active",
    pendingDue: 950,
    ageYears: 4,
    dateLeased: "2023-08-15",
    leaseEnd: "2026-08-14",
    monthlyRent: 3500,
    paymentStatus: "partial",
  },
  {
    id: "t-1007",
    name: "Lumen Creative Co.",
    unit: "Suite 305",
    propertyLeased: "Harborline Commons",
    category: "past_due",
    pendingDue: 7320,
    ageYears: 6,
    dateLeased: "2019-04-01",
    leaseEnd: "2026-03-31",
    monthlyRent: 3900,
    paymentStatus: "late",
  },
  {
    id: "t-1008",
    name: "Quiet Harbor Legal",
    unit: "Suite 501",
    propertyLeased: "Pierpoint Tower",
    category: "pending",
    pendingDue: 0,
    ageYears: 15,
    dateLeased: "2025-02-01",
    leaseEnd: "2030-01-31",
    monthlyRent: 6200,
    paymentStatus: "current",
  },
];

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
  if (Number.isNaN(date.getTime())) return "—";
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
