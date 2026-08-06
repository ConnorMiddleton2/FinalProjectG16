/**
 * Client-safe bank account types, constants, and empty seeds.
 * Server ledger logic lives in `bank-accounts.ts` (do not import that from client components).
 */

export const CORPORATE_BANK_ID = "bank-corporate";
export const CONSERVATIVE_MARGIN_RATE = 0.05; // 5% of monthly rent roll held back

export type BankAccountKind = "property" | "corporate";

export type BankAccount = {
  id: string;
  kind: BankAccountKind;
  name: string;
  propertyId: string;
  propertyName: string;
  ownerAccountId: string;
  ownerEmail: string;
  ownerName: string;
  balance: number;
  /** Held for accrued liabilities + margin (not remittable yet). */
  reservedBalance: number;
  /** Residual queued to remit next month. */
  pendingOwnerRemit: number;
  lastFeeSweepAt: string;
  lastOwnerRemitAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BankTxnKind =
  | "tenant_rent"
  | "management_fee"
  | "property_expense"
  | "payroll"
  | "owner_remittance"
  | "owner_cash_call"
  | "opening"
  | "transfer"
  | "other";

export type BankTransaction = {
  id: string;
  accountId: string;
  kind: BankTxnKind;
  amount: number;
  /** Positive = credit (in), negative = debit (out) already encoded in amount. */
  direction: "credit" | "debit";
  memo: string;
  counterparty: string;
  propertyId: string;
  propertyName: string;
  relatedId: string;
  period: string;
  createdAt: string;
};

export type OwnerCashCallStatus =
  | "requested"
  | "approved"
  | "funded"
  | "declined";

export type OwnerCashCall = {
  id: string;
  propertyId: string;
  propertyName: string;
  ownerAccountId: string;
  ownerEmail: string;
  amount: number;
  reason: string;
  status: OwnerCashCallStatus;
  requestedAt: string;
  resolvedAt: string;
  notes: string;
};

export function seedBankAccounts(): BankAccount[] {
  return [];
}

export function seedBankTransactions(): BankTransaction[] {
  return [];
}

export function seedOwnerCashCalls(): OwnerCashCall[] {
  return [];
}
