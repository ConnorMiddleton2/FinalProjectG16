import { SEED_MONTHS } from "@/lib/accounts-receivable";
import { monthCode, monthDay, normalizePeriodKey, shiftDays } from "@/lib/seed-dates";

export type PayableCategory =
  | "maintenance"
  | "utilities"
  | "lawncare"
  | "gas"
  | "insurance"
  | "property_taxes"
  | "janitorial"
  | "security"
  | "repairs"
  | "supplies"
  | "professional_fees"
  | "other";

export type PayableStatus = "unpaid" | "partially_paid" | "paid" | "disputed";

export type PayableInvoice = {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  vendorId: string;
  category: PayableCategory;
  property: string;
  amount: number;
  amountPaid: number;
  disputed: boolean;
  invoiceDate: string;
  dueDate: string;
  fileName: string;
  notes: string;
  createdAt: string;
};

export const PAYABLE_CATEGORIES: {
  value: PayableCategory;
  label: string;
}[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "utilities", label: "Utilities" },
  { value: "lawncare", label: "Lawncare" },
  { value: "gas", label: "Gas" },
  { value: "insurance", label: "Insurance" },
  { value: "property_taxes", label: "Property taxes" },
  { value: "janitorial", label: "Janitorial" },
  { value: "security", label: "Security" },
  { value: "repairs", label: "Repairs" },
  { value: "supplies", label: "Supplies" },
  { value: "professional_fees", label: "Professional fees" },
  { value: "other", label: "Other" },
];

export function payableCategoryLabel(value: string) {
  return (
    PAYABLE_CATEGORIES.find((c) => c.value === value)?.label ??
    value.charAt(0).toUpperCase() + value.slice(1)
  );
}

/**
 * Map an AP invoice category onto Management budget department + line key
 * so paid invoices hit the correct property budget.
 */
export function payableCategoryToBudgetTarget(category: string): {
  department: "maintenance" | "executive";
  categoryKey: string;
} {
  switch (category) {
    case "lawncare":
      return { department: "maintenance", categoryKey: "landscaping" };
    case "janitorial":
      return { department: "maintenance", categoryKey: "janitorial" };
    case "security":
      return { department: "maintenance", categoryKey: "security" };
    case "repairs":
    case "maintenance":
      return { department: "maintenance", categoryKey: "general" };
    case "utilities":
    case "gas":
    case "insurance":
    case "property_taxes":
    case "supplies":
    case "other":
      return { department: "maintenance", categoryKey: "other" };
    case "professional_fees":
      return { department: "executive", categoryKey: "professional_services" };
    default:
      return { department: "maintenance", categoryKey: "other" };
  }
}

export function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Amount still owed on an invoice after payments applied. */
export function balanceOf(invoice: PayableInvoice) {
  return Math.max(0, round2(invoice.amount - invoice.amountPaid));
}

/**
 * Sum operating-expense cash for a property (location).
 * Uses amountPaid (money that left / leaves the property bank), not billed.
 * When `period` is provided ("2026-08" or "Aug 2026"), only invoices whose
 * invoiceDate falls in that month are included. Management-fee settlements
 * are excluded — those are CPMC's fee, already in the remittance waterfall.
 */
export function operatingExpensesForProperty(
  invoices: Pick<
    PayableInvoice,
    "id" | "property" | "amount" | "amountPaid" | "invoiceDate" | "disputed"
  >[],
  property: string,
  period?: string
) {
  const propertyKey = property.trim().toLowerCase();
  if (!propertyKey) return 0;
  const periodKey = period ? normalizePeriodKey(period) : null;

  return round2(
    invoices
      .filter((inv) => {
        if ((inv.property || "").trim().toLowerCase() !== propertyKey) {
          return false;
        }
        if (inv.id.startsWith("mgmt-fee-ap:")) return false;
        if (inv.disputed) return false;
        if (periodKey) {
          const invoiceMonth = (inv.invoiceDate || "").slice(0, 7);
          if (normalizePeriodKey(invoiceMonth) !== periodKey) return false;
        }
        return true;
      })
      .reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0)
  );
}

/**
 * Status is derived from the dollar amounts rather than stored separately, so a
 * row can never claim it is paid while a balance is still outstanding.
 */
export function statusOf(invoice: PayableInvoice): PayableStatus {
  if (invoice.disputed) return "disputed";
  if (balanceOf(invoice) <= 0) return "paid";
  if (invoice.amountPaid > 0) return "partially_paid";
  return "unpaid";
}

export function payableStatusLabel(status: PayableStatus) {
  switch (status) {
    case "paid":
      return "Paid";
    case "partially_paid":
      return "Partially paid";
    case "disputed":
      return "Disputed";
    default:
      return "Unpaid";
  }
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Days past the due date; negative means it is not due yet. */
export function daysLate(invoice: PayableInvoice, today = todayIso()) {
  if (!invoice.dueDate) return 0;
  const due = Date.parse(`${invoice.dueDate}T00:00:00`);
  const now = Date.parse(`${today}T00:00:00`);
  if (Number.isNaN(due) || Number.isNaN(now)) return 0;
  return Math.round((now - due) / 86_400_000);
}

export function isOverdue(invoice: PayableInvoice, today = todayIso()) {
  return balanceOf(invoice) > 0 && daysLate(invoice, today) > 0;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
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

export function emptyPayableForm() {
  return {
    invoiceNumber: "",
    vendorName: "",
    vendorId: "",
    category: "maintenance" as PayableCategory,
    property: "",
    amount: "",
    amountPaid: "",
    disputed: false,
    invoiceDate: todayIso(),
    dueDate: "",
    fileName: "",
    notes: "",
  };
}

export type PayableFormState = ReturnType<typeof emptyPayableForm>;

type RecurringVendor = {
  code: string;
  invoicePrefix: string;
  vendorName: string;
  vendorId: string;
  category: PayableCategory;
  property: string;
  /** Amount per month, indexed by how many months ago the invoice was issued. */
  amounts: number[];
  invoiceDay: number;
  dueDay: number;
  notes: string;
};

/**
 * Vendor contracts that bill every month. Seeding them across six months keeps
 * the monthly margin history realistic instead of showing empty prior months.
 */
const RECURRING_VENDORS: RecurringVendor[] = [
  {
    code: "GG",
    invoicePrefix: "GG",
    vendorName: "Greenline Grounds",
    vendorId: "V-1003",
    category: "lawncare",
    property: "Canal Yard",
    amounts: [1650, 1650, 1650, 1650, 1450, 1450],
    invoiceDay: 2,
    dueDay: 28,
    notes: "Monthly grounds-maintenance contract.",
  },
  {
    code: "BRC",
    invoicePrefix: "BRC",
    vendorName: "Bright Path Janitorial",
    vendorId: "V-1007",
    category: "janitorial",
    property: "Riverbend Commerce Center",
    amounts: [1875, 1875, 1875, 1875, 1875, 1875],
    invoiceDay: 3,
    dueDay: 28,
    notes: "Nightly cleaning, three floors.",
  },
  {
    code: "SS",
    invoicePrefix: "SS",
    vendorName: "Sentry Shield Security",
    vendorId: "V-1006",
    category: "security",
    property: "Pier 12 Commerce Center",
    amounts: [2400, 2400, 2400, 2400, 2400, 2400],
    invoiceDay: 4,
    dueDay: 30,
    notes: "Overnight patrol coverage.",
  },
  {
    code: "MSPWR",
    invoicePrefix: "MSPWR",
    vendorName: "Magnolia State Power",
    vendorId: "V-1002",
    category: "utilities",
    property: "Pier 12 Commerce Center",
    amounts: [4218.44, 4402.1, 4890.75, 3980.22, 3610.48, 3455.9],
    invoiceDay: 5,
    dueDay: 25,
    notes: "Common-area electric service.",
  },
  {
    code: "GCG",
    invoicePrefix: "GCG",
    vendorName: "Gulf Coast Gas",
    vendorId: "V-1005",
    category: "gas",
    property: "Canal Yard",
    amounts: [962.18, 1045.6, 1120.35, 880.14, 742.66, 690.25],
    invoiceDay: 5,
    dueDay: 25,
    notes: "Boiler gas service.",
  },
];

type PayableException = {
  paid?: number;
  notes?: string;
};

/** Recurring invoices not paid in full; everything else was settled on time. */
const PAYABLE_EXCEPTIONS: Record<string, PayableException> = {
  "0:GG": { paid: 0 },
  "0:BRC": { paid: 0 },
  "0:SS": { paid: 0 },
  "0:MSPWR": { paid: 0 },
  "0:GCG": { paid: 0 },
  "1:GG": {
    paid: 800,
    notes:
      "Partial payment released while the balance waits on owner approval for extra storm cleanup.",
  },
  "1:GCG": {
    paid: 0,
    notes: "Boiler gas service. Past due, late-fee risk.",
  },
};

function recurringPayables(): PayableInvoice[] {
  const rows: PayableInvoice[] = [];

  for (let monthsAgo = SEED_MONTHS - 1; monthsAgo >= 0; monthsAgo -= 1) {
    for (const vendor of RECURRING_VENDORS) {
      const amount = vendor.amounts[monthsAgo] ?? vendor.amounts[0];
      const exception = PAYABLE_EXCEPTIONS[`${monthsAgo}:${vendor.code}`];
      const paid = exception ? (exception.paid ?? amount) : amount;
      const code = monthCode(monthsAgo);
      const invoiceNumber = `${vendor.invoicePrefix}-${code}`;
      const invoiceDate = monthDay(monthsAgo, vendor.invoiceDay);

      rows.push({
        id: `ap-${vendor.code}-${code}`.toLowerCase(),
        invoiceNumber,
        vendorName: vendor.vendorName,
        vendorId: vendor.vendorId,
        category: vendor.category,
        property: vendor.property,
        amount,
        amountPaid: paid,
        disputed: false,
        invoiceDate,
        dueDate: monthDay(monthsAgo, vendor.dueDay),
        fileName: `${invoiceNumber.toLowerCase()}.pdf`,
        notes: exception?.notes ?? vendor.notes,
        createdAt: invoiceDate,
      });
    }
  }

  return rows;
}

export function seedPayableInvoices(): PayableInvoice[] {
  // Portfolio data lives in shared_records (scripts/seed-portfolio.mjs).
  return [];
}
