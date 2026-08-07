/**
 * Client-safe bank account types, constants, and empty seeds.
 * Server ledger logic lives in `bank-accounts.ts` (do not import that from client components).
 */

import { periodsMatch } from "@/lib/seed-dates";

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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Cash free to remit after reserved / earmarked balances. */
export function bankCashAvailable(
  account: Pick<BankAccount, "balance" | "reservedBalance">
) {
  return Math.max(
    0,
    round2(
      (Number(account.balance) || 0) - (Number(account.reservedBalance) || 0)
    )
  );
}

/** Sum bank ledger activity for a property (by propertyId or name) and period. */
export function sumBankTxnAmount(
  txns: Pick<
    BankTransaction,
    | "propertyId"
    | "propertyName"
    | "period"
    | "kind"
    | "direction"
    | "amount"
    | "accountId"
  >[],
  input: {
    propertyId?: string;
    propertyName?: string;
    accountId?: string;
    period?: string;
    kinds?: BankTxnKind[];
    direction?: "credit" | "debit";
  }
) {
  const nameKey = (input.propertyName || "").trim().toLowerCase();
  const kinds = input.kinds ? new Set(input.kinds) : null;
  return round2(
    txns
      .filter((t) => {
        if (input.accountId && t.accountId !== input.accountId) return false;
        if (input.propertyId) {
          if (t.propertyId && t.propertyId !== input.propertyId) return false;
          if (
            !t.propertyId &&
            nameKey &&
            (t.propertyName || "").trim().toLowerCase() !== nameKey
          ) {
            return false;
          }
        } else if (nameKey) {
          if ((t.propertyName || "").trim().toLowerCase() !== nameKey) {
            return false;
          }
        }
        if (input.period && !periodsMatch(t.period || "", input.period)) {
          return false;
        }
        if (kinds && !kinds.has(t.kind)) return false;
        if (input.direction && t.direction !== input.direction) return false;
        return true;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  );
}
