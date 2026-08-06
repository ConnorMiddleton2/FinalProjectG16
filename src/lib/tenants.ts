export type TenantCategory =
  | "active"
  | "pending"
  | "past_due"
  | "vacating";

export type TenantRecord = {
  id: string;
  name: string;
  unit: string;
  propertyLeased: string;
  category: TenantCategory;
  /** Balance currently owed (current month + arrears + late fees). */
  pendingDue: number;
  /** Contracted monthly rent / lease payment. */
  monthlyRent: number;
  /** Unit / suite rentable square footage. */
  sqft: number;
  ageYears: number;
  dateLeased: string;
  leaseEnd?: string;
};

export const TENANT_CATEGORIES: { value: TenantCategory; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "past_due", label: "Past due" },
  { value: "vacating", label: "Vacating" },
];

export function tenantCategoryLabel(value: TenantCategory): string {
  return TENANT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
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
  };
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
