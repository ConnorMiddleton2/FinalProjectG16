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
  pendingDue: number;
  ageYears: number;
  dateLeased: string;
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
    ageYears: 0,
    dateLeased: new Date().toISOString().slice(0, 10),
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
  },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatLeaseDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
