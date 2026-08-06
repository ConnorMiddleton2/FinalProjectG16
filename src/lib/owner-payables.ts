import { seededRentCollected, SEED_MONTHS } from "@/lib/accounts-receivable";
import { monthDay, monthPeriodLabel, monthSlug, shiftDays } from "@/lib/seed-dates";

export type OwnerPaymentType =
  | "monthly_distribution"
  | "security_deposit_return"
  | "capital_improvement"
  | "year_end_trueup"
  | "other";

export type OwnerPaymentMethod = "ach" | "check" | "wire" | "";

export type OwnerPayableStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "on_hold";

/**
 * Owner remittance for a property/period.
 * Dollar fields are entered manually for now; once rent/A/R and expense
 * modules are merged on main we can wire these to live totals.
 */
export type OwnerPayable = {
  id: string;
  paymentId: string;
  ownerName: string;
  ownerId: string;
  property: string;
  period: string;
  paymentType: OwnerPaymentType;
  /** Total rental income collected for the property and period. */
  grossRentCollected: number;
  /** Harborline's management fee is fixed at 10% of gross rental income. */
  managementFeePercent: number;
  managementFeeAmount: number;
  reimbursableExpenses: number;
  reservesWithheld: number;
  /** Net amount owed to the owner after the remittance waterfall. */
  amount: number;
  amountPaid: number;
  onHold: boolean;
  statementApproved: boolean;
  invoiceDate: string;
  dueDate: string;
  paymentMethod: OwnerPaymentMethod;
  paymentReference: string;
  fileName: string;
  notes: string;
  createdAt: string;
};

export const OWNER_PAYMENT_TYPES: {
  value: OwnerPaymentType;
  label: string;
}[] = [
  { value: "monthly_distribution", label: "Monthly owner distribution" },
  { value: "security_deposit_return", label: "Security deposit return" },
  {
    value: "capital_improvement",
    label: "Capital improvement reimbursement",
  },
  { value: "year_end_trueup", label: "Year-end true-up" },
  { value: "other", label: "Other" },
];

export const OWNER_PAYMENT_METHODS: {
  value: Exclude<OwnerPaymentMethod, "">;
  label: string;
}[] = [
  { value: "ach", label: "ACH" },
  { value: "check", label: "Check" },
  { value: "wire", label: "Wire" },
];

export function ownerPaymentTypeLabel(value: string) {
  return (
    OWNER_PAYMENT_TYPES.find((t) => t.value === value)?.label ??
    value.charAt(0).toUpperCase() + value.slice(1)
  );
}

export function ownerPaymentMethodLabel(value: string) {
  return (
    OWNER_PAYMENT_METHODS.find((m) => m.value === value)?.label ??
    (value ? value.toUpperCase() : "—")
  );
}

export function money(n: number) {
  const value = Number.isFinite(n) ? n : 0;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function balanceOf(row: OwnerPayable) {
  return Math.max(0, round2(row.amount - row.amountPaid));
}

export function statusOf(row: OwnerPayable): OwnerPayableStatus {
  if (row.onHold) return "on_hold";
  if (balanceOf(row) <= 0) return "paid";
  if (row.amountPaid > 0) return "partially_paid";
  return "unpaid";
}

export function ownerPayableStatusLabel(status: OwnerPayableStatus) {
  switch (status) {
    case "paid":
      return "Paid";
    case "partially_paid":
      return "Partially paid";
    case "on_hold":
      return "On hold";
    default:
      return "Unpaid";
  }
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function daysLate(row: OwnerPayable, today = todayIso()) {
  if (!row.dueDate) return 0;
  const due = Date.parse(`${row.dueDate}T00:00:00`);
  const now = Date.parse(`${today}T00:00:00`);
  if (Number.isNaN(due) || Number.isNaN(now)) return 0;
  return Math.round((now - due) / 86_400_000);
}

export function isOverdue(row: OwnerPayable, today = todayIso()) {
  return balanceOf(row) > 0 && !row.onHold && daysLate(row, today) > 0;
}

export function parsePositiveAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return round2(value);
}

export function parseNonNegativeAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return round2(value);
}

export function parsePercent(raw: string): number | null {
  const cleaned = raw.replace(/[%\s,]/g, "");
  if (!cleaned) return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return round2(value);
}

export const MANAGEMENT_FEE_PERCENT = 10;

export function feeAmountFromPercent(gross: number, percent = MANAGEMENT_FEE_PERCENT) {
  return round2((gross * percent) / 100);
}

/** Gross rent less Harborline's fee, reimbursable expenses, and reserves. */
export function computeNetDue(input: {
  grossRentCollected: number;
  managementFeeAmount: number;
  reimbursableExpenses: number;
  reservesWithheld: number;
}) {
  return round2(
    Math.max(
      0,
      input.grossRentCollected -
        input.managementFeeAmount -
        input.reimbursableExpenses -
        input.reservesWithheld
    )
  );
}

/**
 * Normalizes older fixed-fee owner-payable records into the current
 * remittance-waterfall shape so the UI does not crash on stale seed data.
 */
export function normalizeOwnerPayable(
  row: Partial<OwnerPayable> &
    Pick<
      OwnerPayable,
      | "id"
      | "paymentId"
      | "ownerName"
      | "ownerId"
      | "property"
      | "period"
      | "paymentType"
      | "amountPaid"
      | "onHold"
      | "statementApproved"
      | "invoiceDate"
      | "dueDate"
      | "paymentMethod"
      | "paymentReference"
      | "fileName"
      | "notes"
      | "createdAt"
    > & { rentalIncomeCollected?: number; amount?: number }
): OwnerPayable {
  const isLegacy =
    row.grossRentCollected == null && row.rentalIncomeCollected != null;
  const grossRentCollected =
    row.grossRentCollected ?? row.rentalIncomeCollected ?? 0;
  const managementFeePercent =
    row.managementFeePercent ??
    (row.paymentType === "monthly_distribution" ? MANAGEMENT_FEE_PERCENT : 0);
  const managementFeeAmount =
    row.managementFeeAmount ??
    (row.paymentType === "monthly_distribution"
      ? feeAmountFromPercent(grossRentCollected, managementFeePercent)
      : 0);
  const reimbursableExpenses = row.reimbursableExpenses ?? 0;
  const reservesWithheld = row.reservesWithheld ?? 0;
  const amount =
    isLegacy && row.paymentType === "monthly_distribution"
      ? computeNetDue({
          grossRentCollected,
          managementFeeAmount,
          reimbursableExpenses,
          reservesWithheld,
        })
      : (row.amount ??
        computeNetDue({
          grossRentCollected,
          managementFeeAmount,
          reimbursableExpenses,
          reservesWithheld,
        }));

  return {
    ...row,
    grossRentCollected,
    managementFeePercent,
    managementFeeAmount,
    reimbursableExpenses,
    reservesWithheld,
    amount,
  };
}

export function emptyOwnerPayableForm() {
  return {
    paymentId: "",
    ownerName: "",
    ownerId: "",
    property: "",
    period: "",
    paymentType: "monthly_distribution" as OwnerPaymentType,
    grossRentCollected: "",
    managementFeePercent: String(MANAGEMENT_FEE_PERCENT),
    managementFeeAmount: "",
    reimbursableExpenses: "",
    reservesWithheld: "",
    amount: "",
    amountPaid: "",
    onHold: false,
    statementApproved: false,
    invoiceDate: todayIso(),
    dueDate: "",
    paymentMethod: "" as OwnerPaymentMethod,
    paymentReference: "",
    fileName: "",
    notes: "",
  };
}

export type OwnerPayableFormState = ReturnType<typeof emptyOwnerPayableForm>;

type OwnerContract = {
  code: string;
  ownerName: string;
  ownerId: string;
  property: string;
  /** Property costs reimbursed from rent before the owner distribution. */
  reimbursableExpenses: number[];
  /** Cash retained each month for future property needs. */
  monthlyReserve: number;
};

/**
 * Owner remittance terms. Harborline earns 10% of rental income and distributes
 * the remaining cash after property expenses and reserves.
 */
export const OWNER_CONTRACTS: OwnerContract[] = [
  {
    code: "RB",
    ownerName: "Riverbend Holdings LLC",
    ownerId: "OWN-1001",
    property: "Riverbend Commerce Center",
    reimbursableExpenses: [2150, 2200, 2050, 2300, 2100, 2250],
    monthlyReserve: 1000,
  },
  {
    code: "P12",
    ownerName: "Pier Twelve Partners",
    ownerId: "OWN-1002",
    property: "Pier 12 Commerce Center",
    reimbursableExpenses: [3200, 3350, 3100, 3450, 3250, 3300],
    monthlyReserve: 1500,
  },
  {
    code: "CY",
    ownerName: "Canal Yard Investors",
    ownerId: "OWN-1003",
    property: "Canal Yard",
    reimbursableExpenses: [1450, 1525, 1400, 1600, 1475, 1500],
    monthlyReserve: 800,
  },
];

type RemittanceException = {
  paid?: number;
  method?: OwnerPaymentMethod;
  reference?: string;
  notes?: string;
};

/**
 * Anything not listed here was remitted in full, so the open owner balances sit
 * in the current and prior month where a collections manager would expect them.
 */
const REMITTANCE_EXCEPTIONS: Record<string, RemittanceException> = {
  "0:RB": {
    paid: 0,
    notes:
      "Current-period distribution. Two suites have not paid rent yet, so only collected rent is included.",
  },
  "0:CY": {
    paid: 0,
    notes:
      "No rent has been collected at this property yet this month; no owner distribution is currently due.",
  },
  "1:CY": {
    paid: 4000,
    method: "check",
    reference: "CHK-4419",
    notes:
      "Partial check issued while the owner's banking change is verified. Balance still open and now past due.",
  },
};

export function seedOwnerPayables(): OwnerPayable[] {
  // Portfolio data lives in shared_records (scripts/seed-portfolio.mjs).
  return [];
}

/** One-off owner payables that sit outside the recurring rent distribution. */
function specialOwnerPayables(): OwnerPayable[] {
  return [
    {
      id: "op-2004",
      paymentId: "OWN-SD-RB",
      ownerName: "Riverbend Holdings LLC",
      ownerId: "OWN-1001",
      property: "Riverbend Commerce Center",
      period: monthPeriodLabel(0),
      paymentType: "security_deposit_return",
      grossRentCollected: 0,
      managementFeePercent: 0,
      managementFeeAmount: 0,
      reimbursableExpenses: 450,
      reservesWithheld: 0,
      amount: 3550,
      amountPaid: 0,
      onHold: true,
      statementApproved: false,
      invoiceDate: shiftDays(-4),
      dueDate: shiftDays(14),
      paymentMethod: "check",
      paymentReference: "",
      fileName: "riverbend-suite210-deposit-return.pdf",
      notes:
        "Suite 210 deposit return after move-out. On hold pending the final damages inspection.",
      createdAt: shiftDays(-4),
    },
    {
      id: "op-2005",
      paymentId: "OWN-CI-P12",
      ownerName: "Pier Twelve Partners",
      ownerId: "OWN-1002",
      property: "Pier 12 Commerce Center",
      period: monthPeriodLabel(0),
      paymentType: "capital_improvement",
      grossRentCollected: 0,
      managementFeePercent: 0,
      managementFeeAmount: 0,
      reimbursableExpenses: 0,
      reservesWithheld: 0,
      amount: 18500,
      amountPaid: 0,
      onHold: false,
      statementApproved: true,
      invoiceDate: shiftDays(-12),
      dueDate: shiftDays(3),
      paymentMethod: "wire",
      paymentReference: "",
      fileName: "pier12-lobby-reno-reimbursement.pdf",
      notes:
        "Owner-approved lobby renovation draw. Reimbursement from the owner's reserve account.",
      createdAt: shiftDays(-12),
    },
    {
      id: "op-2006",
      paymentId: "OWN-YE-CY",
      ownerName: "Canal Yard Investors",
      ownerId: "OWN-1003",
      property: "Canal Yard",
      period: "Prior year",
      paymentType: "year_end_trueup",
      grossRentCollected: 64000,
      managementFeePercent: MANAGEMENT_FEE_PERCENT,
      managementFeeAmount: 6400,
      reimbursableExpenses: 46800,
      reservesWithheld: 4400,
      amount: 6400,
      amountPaid: 0,
      onHold: false,
      statementApproved: false,
      invoiceDate: shiftDays(-25),
      dueDate: shiftDays(20),
      paymentMethod: "wire",
      paymentReference: "",
      fileName: "canal-yard-prior-year-trueup.pdf",
      notes:
        "Residual owed after the prior-year reconciliation of the fixed contract. Statement not yet approved by the owner's CPA.",
      createdAt: shiftDays(-25),
    },
    {
      id: "op-2007",
      paymentId: "OWN-DEMO-BOB",
      ownerName: "Bob Owner",
      ownerId: "OWN-1004",
      property: "Riverbend Commerce Center",
      period: monthPeriodLabel(0),
      paymentType: "other",
      grossRentCollected: 10000,
      managementFeePercent: MANAGEMENT_FEE_PERCENT,
      managementFeeAmount: 1000,
      reimbursableExpenses: 0,
      reservesWithheld: 0,
      amount: 9000,
      amountPaid: 0,
      onHold: false,
      statementApproved: true,
      invoiceDate: shiftDays(-2),
      dueDate: shiftDays(13),
      paymentMethod: "ach",
      paymentReference: "",
      fileName: "bob-owner-current-statement.pdf",
      notes:
        "Demo owner account used for the owner-portal walkthrough. Co-investor distribution after Harborline's 10% management fee.",
      createdAt: shiftDays(-2),
    },
  ];
}
