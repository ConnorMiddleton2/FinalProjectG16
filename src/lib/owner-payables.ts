import {
  operationalRentCollected,
  type Receivable,
} from "@/lib/accounts-receivable";
import {
  operatingExpensesForProperty,
  type PayableInvoice,
} from "@/lib/accounts-payable";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  bankCashAvailable,
  sumBankTxnAmount,
  type BankAccount,
  type BankTransaction,
} from "@/lib/bank-accounts-shared";
import { monthPeriodLabel, monthSlug, periodsMatch, shiftDays } from "@/lib/seed-dates";

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
 * Gross rent and fee % prefer live A/R collections and the signed
 * management contract for the property.
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
  /** CPMC management fee % from the signed contract (fallback default). */
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

/**
 * Fallback when no signed management contract is found for the property.
 * Matches the default fee on new management contracts.
 */
export const DEFAULT_MANAGEMENT_FEE_PERCENT = 4;

/** @deprecated Prefer DEFAULT_MANAGEMENT_FEE_PERCENT / resolveManagementFee. */
export const MANAGEMENT_FEE_PERCENT = DEFAULT_MANAGEMENT_FEE_PERCENT;

export function feeAmountFromPercent(
  gross: number,
  percent = DEFAULT_MANAGEMENT_FEE_PERCENT
) {
  return round2((gross * percent) / 100);
}

export type ManagedFeeFields = Pick<
  ManagementContractDraft,
  "propertyName" | "feeStructure" | "feePercent" | "feeFlatAmount"
>;

export type ResolvedManagementFee = {
  percent: number;
  amount: number;
  source: "contract" | "default";
  feeStructure?: ManagementContractDraft["feeStructure"];
};

export function findManagedProperty(
  properties: ManagedFeeFields[],
  propertyName: string
) {
  const needle = propertyName.trim().toLowerCase();
  if (!needle) return undefined;
  return properties.find(
    (p) => p.propertyName.trim().toLowerCase() === needle
  );
}

/**
 * Resolve CPMC's management fee for a remittance from the signed
 * management contract when available; otherwise use the portfolio default %.
 */
export function resolveManagementFee(
  propertyName: string,
  grossRentCollected: number,
  properties: ManagedFeeFields[] = []
): ResolvedManagementFee {
  const contract = findManagedProperty(properties, propertyName);
  if (!contract) {
    const percent = DEFAULT_MANAGEMENT_FEE_PERCENT;
    return {
      percent,
      amount: feeAmountFromPercent(grossRentCollected, percent),
      source: "default",
    };
  }

  const structure = contract.feeStructure;
  if (structure === "flat_monthly" || structure === "flat_annual") {
    const flat = parseNonNegativeAmount(contract.feeFlatAmount ?? "") ?? 0;
    const amount =
      structure === "flat_annual" ? round2(flat / 12) : flat;
    const percent =
      grossRentCollected > 0
        ? round2((amount / grossRentCollected) * 100)
        : 0;
    return {
      percent,
      amount,
      source: "contract",
      feeStructure: structure,
    };
  }

  const parsed = parsePercent(contract.feePercent ?? "");
  const percent =
    parsed != null && parsed > 0 ? parsed : DEFAULT_MANAGEMENT_FEE_PERCENT;
  return {
    percent,
    amount: feeAmountFromPercent(grossRentCollected, percent),
    source: "contract",
    feeStructure: structure,
  };
}

export type BankSyncedRemittanceInputs = {
  propertyName: string;
  propertyId?: string;
  period: string;
  reservesWithheld?: number;
  amountPaid?: number;
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
  >[];
  /** Active lease roster — used when unit A/R is absent for a property. */
  propertyTenants?: {
    propertyName?: string;
    status?: string;
    monthlyRent?: string | number;
  }[];
  managedProperties?: ManagedFeeFields[];
  operatingExpenses?: Pick<
    PayableInvoice,
    "id" | "property" | "amount" | "amountPaid" | "invoiceDate" | "disputed"
  >[];
  bankAccount?: Pick<
    BankAccount,
    "id" | "propertyId" | "propertyName" | "balance" | "reservedBalance"
  > | null;
  bankTxns?: Pick<
    BankTransaction,
    | "propertyId"
    | "propertyName"
    | "period"
    | "kind"
    | "direction"
    | "amount"
    | "accountId"
  >[];
};

/**
 * Bank-synced owner remittance waterfall:
 * rent collected (unit A/R or active leases, prefer bank rent credits when
 * present) − management fee − operating expenses paid − reserves, then capped
 * to cash still available in the property operating account.
 */
export function computeBankSyncedRemittance(input: BankSyncedRemittanceInputs) {
  const arRent = operationalRentCollected(
    input.receivables,
    input.propertyName,
    input.period,
    input.propertyTenants
  );
  const bankRent = input.bankTxns
    ? sumBankTxnAmount(input.bankTxns, {
        propertyId: input.propertyId,
        propertyName: input.propertyName,
        accountId: input.bankAccount?.id,
        period: input.period,
        kinds: ["tenant_rent"],
        direction: "credit",
      })
    : 0;
  // Prefer the larger of AR vs bank rent so partial posting still surfaces collections.
  const grossRentCollected = round2(Math.max(arRent, bankRent));

  const fee = resolveManagementFee(
    input.propertyName,
    grossRentCollected,
    input.managedProperties ?? []
  );

  const apExpensesPaid = operatingExpensesForProperty(
    input.operatingExpenses ?? [],
    input.propertyName,
    input.period
  );
  const bankExpenses = input.bankTxns
    ? sumBankTxnAmount(input.bankTxns, {
        propertyId: input.propertyId,
        propertyName: input.propertyName,
        accountId: input.bankAccount?.id,
        period: input.period,
        kinds: ["property_expense", "payroll"],
        direction: "debit",
      })
    : 0;
  const reimbursableExpenses = round2(Math.max(apExpensesPaid, bankExpenses));

  const feeSwept = input.bankTxns
    ? sumBankTxnAmount(input.bankTxns, {
        propertyId: input.propertyId,
        propertyName: input.propertyName,
        accountId: input.bankAccount?.id,
        period: input.period,
        kinds: ["management_fee"],
        direction: "debit",
      })
    : 0;
  const feePendingInBank = Math.max(0, round2(fee.amount - feeSwept));

  const reservesWithheld = input.reservesWithheld ?? 0;
  const amountPaid = input.amountPaid ?? 0;
  const computed = computeNetDue({
    grossRentCollected,
    managementFeeAmount: fee.amount,
    reimbursableExpenses,
    reservesWithheld,
  });

  const bankAvailable = input.bankAccount
    ? Math.max(
        0,
        round2(bankCashAvailable(input.bankAccount) - feePendingInBank)
      )
    : computed;

  const amount = Math.max(
    amountPaid,
    round2(Math.min(computed, bankAvailable))
  );

  return {
    grossRentCollected,
    managementFeePercent: fee.percent,
    managementFeeAmount: fee.amount,
    reimbursableExpenses,
    reservesWithheld,
    amount,
    bankAvailable,
    feePendingInBank,
    feeSwept,
    arRent,
    bankRent,
  };
}

/**
 * Rebuild a monthly remittance from live A/R, paid operating expenses, bank
 * cash, and the management contract. Leaves statement approval / hold flags.
 */
export function applyLiveRentToRemittance(
  row: OwnerPayable,
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
  managedProperties: ManagedFeeFields[] = [],
  operatingExpenses: Pick<
    PayableInvoice,
    "id" | "property" | "amount" | "amountPaid" | "invoiceDate" | "disputed"
  >[] = [],
  bankAccount?: BankSyncedRemittanceInputs["bankAccount"],
  bankTxns: BankSyncedRemittanceInputs["bankTxns"] = [],
  propertyTenants: BankSyncedRemittanceInputs["propertyTenants"] = []
): OwnerPayable {
  if (row.paymentType !== "monthly_distribution") return row;

  const synced = computeBankSyncedRemittance({
    propertyName: row.property,
    propertyId: bankAccount?.propertyId,
    period: row.period,
    reservesWithheld: row.reservesWithheld,
    amountPaid: row.amountPaid,
    receivables,
    propertyTenants,
    managedProperties,
    operatingExpenses,
    bankAccount,
    bankTxns,
  });

  if (
    synced.grossRentCollected === row.grossRentCollected &&
    synced.managementFeePercent === row.managementFeePercent &&
    synced.managementFeeAmount === row.managementFeeAmount &&
    synced.reimbursableExpenses === row.reimbursableExpenses &&
    synced.amount === row.amount
  ) {
    return row;
  }

  return {
    ...row,
    grossRentCollected: synced.grossRentCollected,
    managementFeePercent: synced.managementFeePercent,
    managementFeeAmount: synced.managementFeeAmount,
    reimbursableExpenses: synced.reimbursableExpenses,
    amount: synced.amount,
  };
}

/** Stable id for a property's monthly owner remittance. */
export function monthlyOwnerRemittanceId(
  propertyId: string,
  periodSlug: string
) {
  return `opay-${propertyId}-${periodSlug}`;
}

export function findMonthlyOwnerRemittance(
  rows: OwnerPayable[],
  propertyName: string,
  period: string
) {
  const needle = propertyName.trim().toLowerCase();
  return rows.find(
    (row) =>
      row.paymentType === "monthly_distribution" &&
      (row.property || "").trim().toLowerCase() === needle &&
      periodsMatch(row.period || "", period)
  );
}

/**
 * Build (or refresh) the current-period monthly remittance for a managed
 * property from rent collections, paid OpEx, bank cash, and the contract.
 */
export function buildMonthlyOwnerRemittance(input: {
  property: ManagementContractDraft;
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
  >[];
  propertyTenants?: BankSyncedRemittanceInputs["propertyTenants"];
  operatingExpenses?: Pick<
    PayableInvoice,
    "id" | "property" | "amount" | "amountPaid" | "invoiceDate" | "disputed"
  >[];
  bankAccount?: BankSyncedRemittanceInputs["bankAccount"];
  bankTxns?: BankSyncedRemittanceInputs["bankTxns"];
  monthsAgo?: number;
  existing?: OwnerPayable | null;
}): OwnerPayable {
  const monthsAgo = input.monthsAgo ?? 0;
  const periodSlug = monthSlug(monthsAgo);
  const periodLabel = monthPeriodLabel(monthsAgo);
  const period = periodSlug;
  const propertyName = input.property.propertyName;
  const reservesWithheld = input.existing?.reservesWithheld ?? 0;
  const amountPaid = input.existing?.amountPaid ?? 0;

  const synced = computeBankSyncedRemittance({
    propertyName,
    propertyId: input.property.id,
    period,
    reservesWithheld,
    amountPaid,
    receivables: input.receivables,
    propertyTenants: input.propertyTenants,
    managedProperties: [input.property],
    operatingExpenses: input.operatingExpenses ?? [],
    bankAccount: input.bankAccount,
    bankTxns: input.bankTxns ?? [],
  });

  const ownerName =
    input.property.ownerLegalName ||
    input.property.ownerContactName ||
    propertyName;
  const ownerId =
    input.property.ownerAccountId ||
    `OWN-${input.property.id.slice(0, 8).toUpperCase()}`;

  if (input.existing) {
    return {
      ...input.existing,
      ownerName: input.existing.ownerName || ownerName,
      ownerId: input.existing.ownerId || ownerId,
      property: propertyName,
      period: input.existing.period || period,
      grossRentCollected: synced.grossRentCollected,
      managementFeePercent: synced.managementFeePercent,
      managementFeeAmount: synced.managementFeeAmount,
      reimbursableExpenses: synced.reimbursableExpenses,
      amount: synced.amount,
    };
  }

  return {
    id: monthlyOwnerRemittanceId(input.property.id, periodSlug),
    paymentId: `OWN-DIST-${periodSlug}-${input.property.id.slice(0, 8).toUpperCase()}`,
    ownerName,
    ownerId,
    property: propertyName,
    period,
    paymentType: "monthly_distribution",
    grossRentCollected: synced.grossRentCollected,
    managementFeePercent: synced.managementFeePercent,
    managementFeeAmount: synced.managementFeeAmount,
    reimbursableExpenses: synced.reimbursableExpenses,
    reservesWithheld,
    amount: synced.amount,
    amountPaid: 0,
    onHold: false,
    statementApproved: false,
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: shiftDays(15),
    paymentMethod: "",
    paymentReference: "",
    fileName: "",
    notes: `Bank-synced remittance for ${propertyName} · ${periodLabel}. Net = rent in bank − management fee − OpEx paid from bank − reserves, capped to property operating cash.`,
    createdAt: new Date().toISOString(),
  };
}

/** Gross rent less CPMC's fee, operating expenses, and reserves. */
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
    (row.paymentType === "monthly_distribution"
      ? DEFAULT_MANAGEMENT_FEE_PERCENT
      : 0);
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
    managementFeePercent: String(DEFAULT_MANAGEMENT_FEE_PERCENT),
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
  /** Contract management fee % when no managed_properties row is present yet. */
  feePercent: number;
  /** Property costs reimbursed from rent before the owner distribution. */
  reimbursableExpenses: number[];
  /** Cash retained each month for future property needs. */
  monthlyReserve: number;
};

/**
 * Owner remittance terms. Fee % follows the signed management contract when
 * available (seed defaults match the 4% contract default).
 */
export const OWNER_CONTRACTS: OwnerContract[] = [
  {
    code: "RB",
    ownerName: "Riverbend Holdings LLC",
    ownerId: "OWN-1001",
    property: "Riverbend Commerce Center",
    feePercent: 4,
    reimbursableExpenses: [2150, 2200, 2050, 2300, 2100, 2250],
    monthlyReserve: 1000,
  },
  {
    code: "P12",
    ownerName: "Pier Twelve Partners",
    ownerId: "OWN-1002",
    property: "Pier 12 Commerce Center",
    feePercent: 4,
    reimbursableExpenses: [3200, 3350, 3100, 3450, 3250, 3300],
    monthlyReserve: 1500,
  },
  {
    code: "CY",
    ownerName: "Canal Yard Investors",
    ownerId: "OWN-1003",
    property: "Canal Yard",
    feePercent: 4,
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
      managementFeePercent: DEFAULT_MANAGEMENT_FEE_PERCENT,
      managementFeeAmount: feeAmountFromPercent(64000, DEFAULT_MANAGEMENT_FEE_PERCENT),
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
        "Residual owed after the prior-year reconciliation. Statement not yet approved by the owner's CPA.",
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
      managementFeePercent: DEFAULT_MANAGEMENT_FEE_PERCENT,
      managementFeeAmount: feeAmountFromPercent(10000, DEFAULT_MANAGEMENT_FEE_PERCENT),
      reimbursableExpenses: 0,
      reservesWithheld: 0,
      amount: computeNetDue({
        grossRentCollected: 10000,
        managementFeeAmount: feeAmountFromPercent(
          10000,
          DEFAULT_MANAGEMENT_FEE_PERCENT
        ),
        reimbursableExpenses: 0,
        reservesWithheld: 0,
      }),
      amountPaid: 0,
      onHold: false,
      statementApproved: true,
      invoiceDate: shiftDays(-2),
      dueDate: shiftDays(13),
      paymentMethod: "ach",
      paymentReference: "",
      fileName: "bob-owner-current-statement.pdf",
      notes:
        `Demo owner account used for the owner-portal walkthrough. Co-investor distribution after CPMC's ${DEFAULT_MANAGEMENT_FEE_PERCENT}% management fee.`,
      createdAt: shiftDays(-2),
    },
  ];
}
