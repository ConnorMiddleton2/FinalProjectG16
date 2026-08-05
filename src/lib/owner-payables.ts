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
  /** Rental income collected for this property and period (comparison only). */
  rentalIncomeCollected: number;
  /** Fixed amount contractually owed to the property owner for the period. */
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
  { value: "monthly_distribution", label: "Fixed contractual payment" },
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

/** Gross company spread before operating expenses. */
export function companySpread(row: Pick<OwnerPayable, "rentalIncomeCollected" | "amount">) {
  return round2(row.rentalIncomeCollected - row.amount);
}

export function emptyOwnerPayableForm() {
  return {
    paymentId: "",
    ownerName: "",
    ownerId: "",
    property: "",
    period: "",
    paymentType: "monthly_distribution" as OwnerPaymentType,
    rentalIncomeCollected: "",
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
  /** Fixed amount owed to the owner every period, regardless of collections. */
  fixedAmount: number;
};

/**
 * Fixed-fee management contracts. Harborline owes each owner the same amount
 * every period and keeps whatever rent it collects above that amount, so these
 * figures are deliberately set below the seeded rent roll for each property.
 */
export const OWNER_CONTRACTS: OwnerContract[] = [
  {
    code: "RB",
    ownerName: "Riverbend Holdings LLC",
    ownerId: "OWN-1001",
    property: "Riverbend Commerce Center",
    fixedAmount: 13500,
  },
  {
    code: "P12",
    ownerName: "Pier Twelve Partners",
    ownerId: "OWN-1002",
    property: "Pier 12 Commerce Center",
    fixedAmount: 21000,
  },
  {
    code: "CY",
    ownerName: "Canal Yard Investors",
    ownerId: "OWN-1003",
    property: "Canal Yard",
    fixedAmount: 8500,
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
      "Fixed contractual payment for the current period. Owed in full even though two suites have not paid rent yet.",
  },
  "0:CY": {
    paid: 0,
    notes:
      "Fixed contractual payment for the current period. No rent collected at this property yet this month.",
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
  const rows: OwnerPayable[] = [];

  for (let monthsAgo = SEED_MONTHS - 1; monthsAgo >= 0; monthsAgo -= 1) {
    for (const contract of OWNER_CONTRACTS) {
      const exception = REMITTANCE_EXCEPTIONS[`${monthsAgo}:${contract.code}`];
      const paid = exception
        ? (exception.paid ?? contract.fixedAmount)
        : contract.fixedAmount;
      const slug = monthSlug(monthsAgo);
      const paymentId = `OWN-${slug}-${contract.code}`;
      const invoiceDate = monthDay(monthsAgo, 1);

      rows.push({
        id: `op-${slug}-${contract.code}`.toLowerCase(),
        paymentId,
        ownerName: contract.ownerName,
        ownerId: contract.ownerId,
        property: contract.property,
        period: monthPeriodLabel(monthsAgo),
        paymentType: "monthly_distribution",
        rentalIncomeCollected: seededRentCollected(
          contract.property,
          monthsAgo
        ),
        amount: contract.fixedAmount,
        amountPaid: paid,
        onHold: false,
        statementApproved: true,
        invoiceDate,
        dueDate: monthDay(monthsAgo, 15),
        paymentMethod: exception?.method ?? "ach",
        paymentReference:
          exception?.reference ??
          (paid >= contract.fixedAmount
            ? `ACH-${slug.replace("-", "")}${contract.code}`
            : ""),
        fileName: `${paymentId.toLowerCase()}-owner-statement.pdf`,
        notes:
          exception?.notes ??
          "Fixed contractual payment remitted in full under the management agreement.",
        createdAt: invoiceDate,
      });
    }
  }

  return [...rows, ...specialOwnerPayables()];
}

/** One-off owner payables that sit outside the recurring fixed-fee schedule. */
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
      rentalIncomeCollected: 0,
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
      rentalIncomeCollected: 0,
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
      rentalIncomeCollected: 0,
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
      rentalIncomeCollected: 0,
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
        "Demo owner account used for the owner-portal walkthrough. Co-investor share of the Riverbend fixed payment.",
      createdAt: shiftDays(-2),
    },
  ];
}
