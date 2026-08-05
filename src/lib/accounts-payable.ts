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

function shiftDays(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function seedPayableInvoices(): PayableInvoice[] {
  const rows: Array<
    Omit<PayableInvoice, "createdAt"> & { invoiceOffset: number }
  > = [
    {
      id: "ap-1001",
      invoiceNumber: "OXF-4412",
      vendorName: "Oxford HVAC Pros",
      vendorId: "V-1001",
      category: "maintenance",
      property: "Riverbend Commerce Center",
      amount: 850,
      amountPaid: 0,
      disputed: false,
      invoiceDate: shiftDays(-12),
      dueDate: shiftDays(18),
      fileName: "oxford-hvac-4412.pdf",
      notes: "Suite 210 rooftop unit service call and refrigerant top-off.",
      invoiceOffset: -12,
    },
    {
      id: "ap-1002",
      invoiceNumber: "MSPWR-88301",
      vendorName: "Magnolia State Power",
      vendorId: "V-1002",
      category: "utilities",
      property: "Pier 12 Commerce Center",
      amount: 4218.44,
      amountPaid: 4218.44,
      disputed: false,
      invoiceDate: shiftDays(-40),
      dueDate: shiftDays(-10),
      fileName: "magnolia-power-jul.pdf",
      notes: "Common area electric, July cycle. Paid in full.",
      invoiceOffset: -40,
    },
    {
      id: "ap-1003",
      invoiceNumber: "GG-2214",
      vendorName: "Greenline Grounds",
      vendorId: "V-1003",
      category: "lawncare",
      property: "Canal Yard",
      amount: 1650,
      amountPaid: 800,
      disputed: false,
      invoiceDate: shiftDays(-33),
      dueDate: shiftDays(-3),
      fileName: "greenline-2214.pdf",
      notes: "Monthly grounds contract. Partial payment sent pending owner approval.",
      invoiceOffset: -33,
    },
    {
      id: "ap-1004",
      invoiceNumber: "DR-7788",
      vendorName: "Delta Roofing",
      vendorId: "V-1004",
      category: "repairs",
      property: "Riverbend Commerce Center",
      amount: 9750,
      amountPaid: 0,
      disputed: true,
      invoiceDate: shiftDays(-26),
      dueDate: shiftDays(4),
      fileName: "delta-roofing-7788.pdf",
      notes:
        "Billed for full membrane replacement; approved scope was a patch. Disputed with vendor.",
      invoiceOffset: -26,
    },
    {
      id: "ap-1005",
      invoiceNumber: "GCG-5567",
      vendorName: "Gulf Coast Gas",
      vendorId: "V-1005",
      category: "gas",
      property: "Canal Yard",
      amount: 962.18,
      amountPaid: 0,
      disputed: false,
      invoiceDate: shiftDays(-35),
      dueDate: shiftDays(-5),
      fileName: "gulf-coast-gas-5567.pdf",
      notes: "Boiler gas service. Past due, late fee risk.",
      invoiceOffset: -35,
    },
    {
      id: "ap-1006",
      invoiceNumber: "SS-3390",
      vendorName: "Sentry Shield Security",
      vendorId: "V-1006",
      category: "security",
      property: "Pier 12 Commerce Center",
      amount: 2400,
      amountPaid: 0,
      disputed: false,
      invoiceDate: shiftDays(-6),
      dueDate: shiftDays(24),
      fileName: "sentry-shield-3390.pdf",
      notes: "Overnight patrol coverage, current month.",
      invoiceOffset: -6,
    },
    {
      id: "ap-1007",
      invoiceNumber: "BRC-1120",
      vendorName: "Bright Path Janitorial",
      vendorId: "V-1007",
      category: "janitorial",
      property: "Riverbend Commerce Center",
      amount: 1875,
      amountPaid: 0,
      disputed: false,
      invoiceDate: shiftDays(-20),
      dueDate: shiftDays(-1),
      fileName: "bright-path-1120.pdf",
      notes: "Nightly cleaning, three floors.",
      invoiceOffset: -20,
    },
    {
      id: "ap-1008",
      invoiceNumber: "HFA-2026-02",
      vendorName: "Harbor First Assurance",
      vendorId: "V-1008",
      category: "insurance",
      property: "Canal Yard",
      amount: 7300,
      amountPaid: 3650,
      disputed: false,
      invoiceDate: shiftDays(-18),
      dueDate: shiftDays(12),
      fileName: "harbor-first-2026-02.pdf",
      notes: "Property liability premium billed semi-annually; first half remitted.",
      invoiceOffset: -18,
    },
    {
      id: "ap-1009",
      invoiceNumber: "TCA-4402",
      vendorName: "Tidewater CPA Group",
      vendorId: "V-1009",
      category: "professional_fees",
      property: "Pier 12 Commerce Center",
      amount: 3200,
      amountPaid: 0,
      disputed: false,
      invoiceDate: shiftDays(-9),
      dueDate: shiftDays(21),
      fileName: "tidewater-cpa-4402.pdf",
      notes: "Owner reporting package and annual CAM reconciliation support.",
      invoiceOffset: -9,
    },
  ];

  return rows.map(({ invoiceOffset, ...row }) => ({
    ...row,
    createdAt: shiftDays(invoiceOffset),
  }));
}
