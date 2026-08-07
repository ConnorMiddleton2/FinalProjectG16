import {
  monthDay,
  monthPeriodLabel,
  monthSlug,
  periodsMatch,
  shiftDays,
} from "@/lib/seed-dates";

export type ReceivableStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "disputed";

export type RentalChargeType =
  | "base_rent"
  | "cam_nnn"
  | "late_fee"
  | "parking_storage";

export type MiscChargeType =
  | "application_fee"
  | "damage_reimbursement"
  | "key_access"
  | "utility_reimbursement"
  | "management_fee"
  | "other";

export type ReceivableKind = "rental" | "miscellaneous";

export type Receivable = {
  id: string;
  receivableId: string;
  kind: ReceivableKind;
  customerName: string;
  customerId: string;
  property: string;
  unit: string;
  period: string;
  category: RentalChargeType | MiscChargeType;
  amount: number;
  amountReceived: number;
  disputed: boolean;
  invoiceDate: string;
  dueDate: string;
  paymentMethod: string;
  paymentReference: string;
  fileName: string;
  description: string;
  notes: string;
  createdAt: string;
};

export const RENTAL_CHARGE_TYPES: {
  value: RentalChargeType;
  label: string;
}[] = [
  { value: "base_rent", label: "Base rent" },
  { value: "cam_nnn", label: "CAM / NNN recovery" },
  { value: "late_fee", label: "Late fee" },
  { value: "parking_storage", label: "Parking / storage" },
];

export const MISC_CHARGE_TYPES: {
  value: MiscChargeType;
  label: string;
}[] = [
  { value: "application_fee", label: "Application fee" },
  { value: "damage_reimbursement", label: "Damage reimbursement" },
  { value: "key_access", label: "Key / access-card charge" },
  { value: "utility_reimbursement", label: "Utility reimbursement" },
  { value: "management_fee", label: "Management fee" },
  { value: "other", label: "Other" },
];

export function chargeTypeLabel(value: string) {
  return (
    [...RENTAL_CHARGE_TYPES, ...MISC_CHARGE_TYPES].find(
      (type) => type.value === value
    )?.label ??
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

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Portfolio / annual roll-up A/R rows (seed budget summaries). These are not
 * unit lease collections and must not drive bank deposits or remittance math.
 */
export function isAggregateRentReceivable(row: {
  id?: string;
  unit?: string;
  description?: string;
  customerName?: string;
}) {
  const id = (row.id || "").trim().toLowerCase();
  const unit = (row.unit || "").trim().toLowerCase();
  const desc = (row.description || "").toLowerCase();
  const customer = (row.customerName || "").toLowerCase();
  if (id.startsWith("ar-annual-")) return true;
  if (
    unit === "all" ||
    unit === "portfolio" ||
    unit === "—" ||
    unit === "-" ||
    unit === ""
  ) {
    return true;
  }
  if (unit.includes("portfolio")) return true;
  if (desc.includes("annual base rent") || desc.includes("rent roll")) {
    return true;
  }
  if (customer.includes("rent roll")) return true;
  return false;
}

/** True unit / suite lease collections (portal-aligned). */
export function isUnitLevelRentReceivable(row: {
  id?: string;
  unit?: string;
  description?: string;
  customerName?: string;
  category?: string;
}) {
  if (isAggregateRentReceivable(row)) return false;
  const category = (row.category || "").toLowerCase();
  if (category && category !== "base_rent") return false;
  return true;
}

/** Sum of active in-place lease rents for a property (from property_tenants). */
export function rentCollectedFromActiveLeases(
  tenants: {
    propertyName?: string;
    status?: string;
    monthlyRent?: string | number;
  }[],
  property: string
) {
  const propertyKey = property.trim().toLowerCase();
  return round2(
    tenants
      .filter(
        (t) =>
          (t.propertyName || "").trim().toLowerCase() === propertyKey &&
          (t.status || "").toLowerCase() === "active"
      )
      .reduce((sum, t) => sum + (Number(t.monthlyRent) || 0), 0)
  );
}

/**
 * Unit-level A/R collections for the period, plus active lease rents for units
 * that have no unit-level A/R row (portal / lease roster fills the gaps).
 */
export function operationalRentCollected(
  receivables: Pick<
    Receivable,
    | "id"
    | "property"
    | "period"
    | "category"
    | "amountReceived"
    | "unit"
    | "description"
    | "customerName"
  >[],
  property: string,
  period: string,
  tenants?: {
    propertyName?: string;
    unit?: string;
    status?: string;
    monthlyRent?: string | number;
  }[]
) {
  const fromAr = rentCollectedFromReceivables(receivables, property, period);
  if (!tenants?.length) return fromAr;

  const propertyKey = property.trim().toLowerCase();
  const coveredUnits = new Set(
    receivables
      .filter(
        (row) =>
          (row.property || "").trim().toLowerCase() === propertyKey &&
          isUnitLevelRentReceivable(row)
      )
      .map((row) => (row.unit || "").trim().toLowerCase())
  );

  const leaseGap = round2(
    tenants
      .filter(
        (t) =>
          (t.propertyName || "").trim().toLowerCase() === propertyKey &&
          (t.status || "").toLowerCase() === "active" &&
          !coveredUnits.has((t.unit || "").trim().toLowerCase())
      )
      .reduce((sum, t) => sum + (Number(t.monthlyRent) || 0), 0)
  );

  return round2(fromAr + leaseGap);
}

export function balanceOf(row: Receivable) {
  return Math.max(0, round2(row.amount - row.amountReceived));
}

export function statusOf(row: Receivable): ReceivableStatus {
  if (row.disputed) return "disputed";
  if (balanceOf(row) <= 0) return "paid";
  if (row.amountReceived > 0) return "partially_paid";
  return "unpaid";
}

export function receivableStatusLabel(status: ReceivableStatus) {
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

export function daysLate(row: Receivable, today = todayIso()) {
  if (!row.dueDate) return 0;
  const due = Date.parse(`${row.dueDate}T00:00:00`);
  const now = Date.parse(`${today}T00:00:00`);
  if (Number.isNaN(due) || Number.isNaN(now)) return 0;
  return Math.round((now - due) / 86_400_000);
}

export function isOverdue(row: Receivable, today = todayIso()) {
  return balanceOf(row) > 0 && daysLate(row, today) > 0;
}

export function parsePositiveAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return round2(value);
}

export function parseReceivedAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return round2(value);
}

export function emptyReceivableForm(kind: ReceivableKind) {
  return {
    receivableId: "",
    customerName: "",
    customerId: "",
    property: "",
    unit: "",
    period: "",
    category: (kind === "rental" ? "base_rent" : "other") as
      | RentalChargeType
      | MiscChargeType,
    amount: "",
    amountReceived: "",
    disputed: false,
    invoiceDate: todayIso(),
    dueDate: "",
    paymentMethod: "",
    paymentReference: "",
    fileName: "",
    description: "",
    notes: "",
  };
}

export type ReceivableFormState = ReturnType<typeof emptyReceivableForm>;

/** Months of history generated by the seed data, including the current month. */
export const SEED_MONTHS = 6;

type Lease = {
  code: string;
  customerName: string;
  customerId: string;
  property: string;
  unit: string;
  rent: number;
};

/**
 * Recurring rent roll behind the seeded receivables. Owner payables are sized
 * against these same figures so portfolio rent and owner remittances tie out.
 */
export const SEED_RENT_ROLL: Lease[] = [
  {
    code: "NR",
    customerName: "Northwind Retail LLC",
    customerId: "T-1001",
    property: "Riverbend Commerce Center",
    unit: "Suite 110",
    rent: 7200,
  },
  {
    code: "CD",
    customerName: "Cedar Dental Group",
    customerId: "T-1002",
    property: "Riverbend Commerce Center",
    unit: "Suite 210",
    rent: 4850,
  },
  {
    code: "LC",
    customerName: "Lumen Creative Co.",
    customerId: "T-1007",
    property: "Riverbend Commerce Center",
    unit: "Suite 305",
    rent: 7320,
  },
  {
    code: "BA",
    customerName: "Bluefinch Advisors",
    customerId: "T-1003",
    property: "Pier 12 Commerce Center",
    unit: "Floor 4",
    rent: 11800,
  },
  {
    code: "QH",
    customerName: "Quiet Harbor Legal",
    customerId: "T-1008",
    property: "Pier 12 Commerce Center",
    unit: "Suite 501",
    rent: 9400,
  },
  {
    code: "SR",
    customerName: "Summit Robotics Inc.",
    customerId: "T-1005",
    property: "Pier 12 Commerce Center",
    unit: "Lab 2B",
    rent: 8600,
  },
  {
    code: "MS",
    customerName: "Maple Street Bakery",
    customerId: "T-1004",
    property: "Canal Yard",
    unit: "Retail A",
    rent: 5100,
  },
  {
    code: "OI",
    customerName: "Oak & Iron Fitness",
    customerId: "T-1006",
    property: "Canal Yard",
    unit: "Gym Wing",
    rent: 6950,
  },
];

/**
 * Sum of base rent collected for a property/period from live (or any)
 * receivable rows — used to size owner remittances after A/R edits.
 * Ignores annual / portfolio aggregate rows.
 */
export function rentCollectedFromReceivables(
  rows: Pick<
    Receivable,
    | "id"
    | "property"
    | "period"
    | "category"
    | "amountReceived"
    | "unit"
    | "description"
    | "customerName"
  >[],
  property: string,
  period: string
) {
  const propertyKey = property.trim().toLowerCase();
  return round2(
    rows
      .filter(
        (row) =>
          (row.property || "").trim().toLowerCase() === propertyKey &&
          row.category === "base_rent" &&
          isUnitLevelRentReceivable(row) &&
          periodsMatch(row.period || "", period)
      )
      .reduce((sum, row) => sum + row.amountReceived, 0)
  );
}

/** Rent collected per property in a seed month (from the in-memory rent roll). */
export function seededRentCollected(property: string, monthsAgo: number) {
  return rentCollectedFromReceivables(
    seedRentalReceivables(),
    property,
    monthPeriodLabel(monthsAgo)
  );
}

type RentException = {
  received?: number;
  disputed?: boolean;
  notes?: string;
};

/**
 * Exceptions layered on top of the recurring rent roll. Anything not listed is
 * treated as collected in full, which keeps older months clean and concentrates
 * the collection problems in the two most recent months.
 */
const RENT_EXCEPTIONS: Record<string, RentException> = {
  "0:NR": {},
  "0:QH": {},
  "0:SR": {},
  "0:CD": {
    received: 0,
    notes: "Second rent reminder sent. Tenant reports a short-term cash-flow delay.",
  },
  "0:BA": {
    received: 6000,
    notes: "Partial ACH received. Balance promised before month end.",
  },
  "0:MS": { received: 0 },
  "0:OI": { received: 0 },
  "0:LC": {
    received: 0,
    disputed: true,
    notes:
      "Tenant disputes rent, claiming an offset for an HVAC outage. On collection hold pending review.",
  },
  "1:LC": {
    received: 0,
    disputed: true,
    notes: "Prior-month rent held under the same HVAC offset dispute.",
  },
  "1:MS": {
    received: 2500,
    notes: "Partial payment; remainder placed on a short repayment plan.",
  },
  "3:OI": {
    received: 3475,
    notes:
      "Half of the monthly rent was collected late after an equipment-financing delay.",
  },
};

/** CAM / NNN recoveries are billed quarterly to each property's anchor tenant. */
const CAM_RECOVERIES: { code: string; amount: number }[] = [
  { code: "NR", amount: 3200 },
  { code: "BA", amount: 2800 },
  { code: "MS", amount: 1900 },
];

const CAM_MONTHS = [0, 3];

function leaseOf(code: string) {
  const lease = SEED_RENT_ROLL.find((entry) => entry.code === code);
  if (!lease) throw new Error(`Unknown seeded lease code: ${code}`);
  return lease;
}

function rentalRow(input: {
  lease: Lease;
  monthsAgo: number;
  category: RentalChargeType;
  amount: number;
  received: number;
  disputed?: boolean;
  invoiceDay: number;
  dueDay: number;
  notes?: string;
  description: string;
  idSuffix: string;
  referencePrefix: string;
}): Receivable {
  const {
    lease,
    monthsAgo,
    category,
    amount,
    received,
    disputed = false,
    invoiceDay,
    dueDay,
    notes = "",
    description,
    idSuffix,
    referencePrefix,
  } = input;

  const slug = monthSlug(monthsAgo);
  const receivableId = `${referencePrefix}-${slug}-${lease.code}`;
  const invoiceDate = monthDay(monthsAgo, invoiceDay);

  return {
    id: `ar-${idSuffix}-${slug}-${lease.code}`.toLowerCase(),
    receivableId,
    kind: "rental",
    customerName: lease.customerName,
    customerId: lease.customerId,
    property: lease.property,
    unit: lease.unit,
    period: monthPeriodLabel(monthsAgo),
    category,
    amount,
    amountReceived: received,
    disputed,
    invoiceDate,
    dueDate: monthDay(monthsAgo, dueDay),
    paymentMethod: received > 0 ? "ACH" : "",
    paymentReference: received > 0 ? `PMT-${slug.replace("-", "")}-${lease.code}` : "",
    fileName: `${receivableId.toLowerCase()}.pdf`,
    description,
    notes,
    createdAt: invoiceDate,
  };
}

export function seedRentalReceivables(): Receivable[] {
  // Portfolio data lives in shared_records (scripts/seed-portfolio.mjs).
  return [];
}

export function seedMiscReceivables(): Receivable[] {
  return [];
}
