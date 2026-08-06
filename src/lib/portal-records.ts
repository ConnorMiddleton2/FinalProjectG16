export type TenantContract = {
  id: string;
  property: string;
  term: string;
  rent: string;
  status: "Active" | "Renewal pending";
  /** Owning portal user — required for tenant-facing views. */
  ownerUserId?: string;
  ownerEmail?: string;
  /** Links contract to a managed property + occupied unit. */
  propertyId?: string;
  unit?: string;
  tenantName?: string;
  tenantEmail?: string;
};

export type TenantInvoice = {
  id: string;
  label: string;
  amount: string;
  /** Display due string (legacy portal). */
  due: string;
  status: "Paid" | "Due" | "Overdue";
  /** Managed property id when known (AR ↔ Management budgets). */
  propertyId?: string;
  propertyName?: string;
  /** Unit label when invoice is for a specific lease. */
  unit?: string;
  tenantName?: string;
  /** Lowercase email — portal billing filters on this. */
  tenantEmail?: string;
  /** ISO date preferred for year/month attribution. */
  dueDate?: string;
  /** ISO date when marked Paid — used for revenue year. */
  paidAt?: string;
  /** Owning portal user — required for tenant-facing views. */
  ownerUserId?: string;
  ownerEmail?: string;
};

export function emptyTenantContract(): Omit<TenantContract, "id"> {
  return {
    property: "",
    term: "",
    rent: "",
    status: "Active",
    propertyId: "",
    unit: "",
    tenantName: "",
    tenantEmail: "",
  };
}

export function emptyTenantInvoice(): Omit<TenantInvoice, "id"> {
  return {
    label: "",
    amount: "",
    due: "",
    status: "Due",
    propertyId: "",
    propertyName: "",
    unit: "",
    tenantName: "",
    tenantEmail: "",
    dueDate: "",
    paidAt: "",
  };
}

export function seedTenantContracts(): TenantContract[] {
  // Portfolio data lives in shared_records (scripts/seed-portfolio.mjs).
  return [];
}

function monthDue(year: number, monthIndex: number, day = 1) {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Seed paid AR history so Management budgets can pull exact prior-year revenue. */
export function seedTenantInvoices(): TenantInvoice[] {
  // Portfolio data lives in shared_records (scripts/seed-portfolio.mjs).
  return [];
}
