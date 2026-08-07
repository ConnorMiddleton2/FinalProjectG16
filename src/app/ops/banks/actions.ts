"use server";

import {
  ensureBankAccounts,
  fundOwnerCashCall,
  payOwnerRemittanceFromBank,
  queueOwnerResidual,
  remitPendingToOwner,
  requestOwnerCashCall,
  settleOwnerRemittancePayment,
  sweepManagementFee,
  syncPropertyBanksFromLedgers,
  postPropertyExpense,
  postTenantRentPayment,
} from "@/lib/bank-accounts";
import { requireOpsModule, getTeamSession } from "@/lib/team-auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { ManagementContractDraft } from "@/lib/management-contract";
import type { PayableInvoice } from "@/lib/accounts-payable";
import {
  normalizeOwnerPayable,
  round2,
  type OwnerPayable,
} from "@/lib/owner-payables";

export async function provisionBankAccountsAction() {
  await requireOpsModule("banks");
  const accounts = await ensureBankAccounts();
  return { ok: true as const, count: accounts.length };
}

/** Rebuild deposits/withdrawals from unit rents + paid OpEx. */
export async function syncBanksFromLedgersAction() {
  const session = await getTeamSession();
  if (!session) redirect("/team");
  if (
    session.kind !== "admin" &&
    !session.modules.includes("banks") &&
    !session.modules.includes("ap") &&
    !session.modules.includes("ar")
  ) {
    redirect("/ops");
  }
  return syncPropertyBanksFromLedgers();
}

export async function runMonthlyFeeSweepAction(input: { propertyId: string }) {
  await requireOpsModule("banks");
  const client = await createClient();
  const properties = await listSharedRecords<ManagementContractDraft>(
    client,
    COLLECTIONS.managedProperties
  );
  const property = properties.find((p) => p.id === input.propertyId);
  if (!property) return { error: "Property not found." as const };
  const feePercent = Number(property.feePercent) || 0;
  const rentBase = Number(property.monthlyRentRoll) || 0;
  return sweepManagementFee({
    propertyId: property.id,
    feePercent,
    rentBase,
  });
}

export async function queueResidualAction(input: { propertyId: string }) {
  await requireOpsModule("banks");
  const client = await createClient();
  const properties = await listSharedRecords<ManagementContractDraft>(
    client,
    COLLECTIONS.managedProperties
  );
  const property = properties.find((p) => p.id === input.propertyId);
  if (!property) return { error: "Property not found." as const };
  const payables = await listSharedRecords<PayableInvoice>(
    client,
    COLLECTIONS.payableInvoices
  );
  const accrued = payables
    .filter(
      (p) =>
        (p.property || "").toLowerCase() ===
        (property.propertyName || "").toLowerCase()
    )
    .reduce(
      (sum, p) => sum + Math.max(0, (p.amount || 0) - (p.amountPaid || 0)),
      0
    );
  return queueOwnerResidual({
    propertyId: property.id,
    monthlyRentRoll: Number(property.monthlyRentRoll) || 0,
    accruedLiabilities: accrued,
  });
}

export async function remitOwnerAction(input: { propertyId: string }) {
  await requireOpsModule("banks");
  return remitPendingToOwner(input);
}

export async function requestCashCallAction(input: {
  propertyId: string;
  amount: number;
  reason: string;
}) {
  await requireOpsModule("banks");
  return requestOwnerCashCall(input);
}

export async function fundCashCallAction(input: { cashCallId: string }) {
  await requireOpsModule("banks");
  return fundOwnerCashCall(input);
}

export async function payExpenseFromBankAction(input: {
  propertyId: string;
  amount: number;
  vendorName: string;
  category: string;
  kind?: "property_expense" | "payroll";
  relatedId?: string;
}) {
  await requireOpsModule("banks");
  return postPropertyExpense(input);
}

/** Used by portal payments — credits property bank from tenant rent. */
export async function recordTenantRentToBankAction(input: {
  propertyId: string;
  propertyName: string;
  tenantName: string;
  tenantEmail?: string;
  unit: string;
  amount: number;
  method: string;
  relatedId?: string;
}) {
  return postTenantRentPayment(input);
}

/**
 * Pay an owner remittance from the property operating bank and mark the
 * payable-to-owners row paid. Used by Accounts Payable → Payable to owners.
 *
 * Cash movement:
 *  - Proportional management fee → CPMC corporate bank
 *  - Owner remittance amount → leaves property bank (owner portal shows paid)
 */
export async function payOwnerRemittanceAction(input: {
  payableId: string;
  amount: number;
}) {
  await requireOpsModule("ap");
  if (input.amount <= 0) {
    return { error: "Payment amount must be positive." as const };
  }

  const client = await createClient();
  const rows = await listSharedRecords<OwnerPayable>(
    client,
    COLLECTIONS.ownerPayables
  );
  const raw = rows.find((r) => r.id === input.payableId);
  if (!raw) return { error: "Owner remittance not found." as const };
  const payable = normalizeOwnerPayable(raw);

  if (!payable.statementApproved) {
    return {
      error: "Owner statement must be approved before payment." as const,
    };
  }
  if (payable.onHold) {
    return { error: "This remittance is on hold and cannot be paid." as const };
  }

  const balance = Math.max(0, round2(payable.amount - payable.amountPaid));
  if (input.amount > balance + 0.001) {
    return {
      error: `Payment cannot exceed the remaining balance of ${balance.toFixed(2)}.` as const,
    };
  }

  const managed = await listSharedRecords<ManagementContractDraft>(
    client,
    COLLECTIONS.managedProperties
  );
  const property = managed.find(
    (p) =>
      p.propertyName.trim().toLowerCase() ===
      payable.property.trim().toLowerCase()
  );

  const bank = await settleOwnerRemittancePayment({
    propertyName: payable.property,
    propertyId: property?.id,
    ownerAmount: input.amount,
    remittanceTotal: payable.amount,
    managementFeeTotal: payable.managementFeeAmount,
    feePercent: payable.managementFeePercent,
    payableId: payable.id,
    ownerName: payable.ownerName,
    period: payable.period,
  });
  if ("error" in bank) return { error: bank.error };

  const next: OwnerPayable = {
    ...payable,
    amountPaid: round2(payable.amountPaid + input.amount),
    paymentMethod: payable.paymentMethod || "ach",
    paymentReference: bank.txn.id,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerPayables,
    next.id,
    next as unknown as Record<string, unknown>
  );

  return {
    ok: true as const,
    amount: input.amount,
    feeSwept: bank.feeSwept,
    payable: next,
    bankBalance: bank.account.balance,
    corporateBalance: bank.corporateBalance,
  };
}

export type BankCashOverviewRow = {
  id: string;
  name: string;
  kind: "corporate" | "property";
  propertyId: string;
  propertyName: string;
  ownerName: string;
  ownerEmail: string;
  balance: number;
  reservedBalance: number;
  pendingOwnerRemit: number;
  rentIn: number;
  expensesOut: number;
};

/** Compact cash view: balance + rent deposits + expense withdrawals. */
export async function loadBanksCashOverviewAction() {
  await requireOpsModule("banks");
  await ensureBankAccounts();
  const client = await createClient();
  const [accounts, txns] = await Promise.all([
    listSharedRecords<{
      id: string;
      name?: string;
      kind?: "corporate" | "property";
      propertyId?: string;
      propertyName?: string;
      ownerName?: string;
      ownerEmail?: string;
      balance?: number;
      reservedBalance?: number;
      pendingOwnerRemit?: number;
    }>(client, COLLECTIONS.bankAccounts),
    listSharedRecords<{
      id: string;
      accountId?: string;
      kind?: string;
      direction?: string;
      amount?: number;
    }>(client, COLLECTIONS.bankTransactions),
  ]);

  const rentByAccount = new Map<string, number>();
  const expenseByAccount = new Map<string, number>();
  for (const t of txns) {
    const accountId = t.accountId || "";
    const amount = round2(Number(t.amount) || 0);
    if (!accountId || amount <= 0) continue;
    if (t.kind === "tenant_rent" && t.direction === "credit") {
      rentByAccount.set(accountId, round2((rentByAccount.get(accountId) || 0) + amount));
    }
    if (
      (t.kind === "property_expense" || t.kind === "payroll") &&
      t.direction === "debit"
    ) {
      expenseByAccount.set(
        accountId,
        round2((expenseByAccount.get(accountId) || 0) + amount)
      );
    }
  }

  const rows: BankCashOverviewRow[] = accounts
    .map((a): BankCashOverviewRow => ({
      id: a.id,
      name: a.name || "Account",
      kind: a.kind === "corporate" ? "corporate" : "property",
      propertyId: a.propertyId || "",
      propertyName: a.propertyName || "",
      ownerName: a.ownerName || "",
      ownerEmail: a.ownerEmail || "",
      balance: round2(Number(a.balance) || 0),
      reservedBalance: round2(Number(a.reservedBalance) || 0),
      pendingOwnerRemit: round2(Number(a.pendingOwnerRemit) || 0),
      rentIn: rentByAccount.get(a.id) || 0,
      expensesOut: expenseByAccount.get(a.id) || 0,
    }))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "corporate" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return { ok: true as const, rows };
}

/** Recent ledger lines for one account (keeps the Banks tab light). */
export async function loadAccountLedgerAction(accountId: string) {
  await requireOpsModule("banks");
  if (!accountId.trim()) return { ok: true as const, txns: [] };
  const client = await createClient();
  const txns = await listSharedRecords<{
    id: string;
    accountId?: string;
    kind?: string;
    direction?: "credit" | "debit";
    amount?: number;
    memo?: string;
    counterparty?: string;
    createdAt?: string;
  }>(client, COLLECTIONS.bankTransactions);

  const filtered = txns
    .filter((t) => t.accountId === accountId)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 50)
    .map((t) => ({
      id: t.id,
      kind: t.kind || "",
      direction: t.direction === "debit" ? ("debit" as const) : ("credit" as const),
      amount: round2(Number(t.amount) || 0),
      memo: t.memo || "",
      counterparty: t.counterparty || "",
      createdAt: t.createdAt || "",
    }));

  return { ok: true as const, txns: filtered };
}
