/**
 * Operating bank accounts for Harborline demo cash flow.
 *
 * Flow:
 *  1. Tenant rent → property operating account (funds appear from thin air).
 *  2. Monthly management fee → corporate account (from property).
 *  3. Property pays OpEx / payroll from its account.
 *  4. Residual after accrued liabilities + conservative margin → owner
 *     (prior-month residual pays next month).
 *  5. If short, management can raise an owner cash call.
 *
 * Client components must import types/seeds from `bank-accounts-shared.ts` only.
 */

import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  CORPORATE_BANK_ID,
  CONSERVATIVE_MARGIN_RATE,
  type BankAccount,
  type BankTransaction,
  type BankTxnKind,
  type OwnerCashCall,
} from "@/lib/bank-accounts-shared";

export {
  CORPORATE_BANK_ID,
  CONSERVATIVE_MARGIN_RATE,
  seedBankAccounts,
  seedBankTransactions,
  seedOwnerCashCalls,
  type BankAccountKind,
  type BankAccount,
  type BankTxnKind,
  type BankTransaction,
  type OwnerCashCallStatus,
  type OwnerCashCall,
} from "@/lib/bank-accounts-shared";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function periodNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function ensureBankAccounts(): Promise<BankAccount[]> {
  const client = await createClient();
  const [existing, properties] = await Promise.all([
    listSharedRecords<BankAccount>(client, COLLECTIONS.bankAccounts),
    listSharedRecords<ManagementContractDraft>(
      client,
      COLLECTIONS.managedProperties
    ),
  ]);
  const byId = new Map(existing.map((a) => [a.id, a]));
  const now = new Date().toISOString();
  const next: BankAccount[] = [];

  if (!byId.has(CORPORATE_BANK_ID)) {
    const corp: BankAccount = {
      id: CORPORATE_BANK_ID,
      kind: "corporate",
      name: "Harborline Corporate Operating",
      propertyId: "",
      propertyName: "Harborline Corporate",
      ownerAccountId: "",
      ownerEmail: "",
      ownerName: "Harborline Management",
      balance: 0,
      reservedBalance: 0,
      pendingOwnerRemit: 0,
      lastFeeSweepAt: "",
      lastOwnerRemitAt: "",
      createdAt: now,
      updatedAt: now,
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.bankAccounts,
      corp.id,
      corp as unknown as Record<string, unknown>
    );
    next.push(corp);
  } else {
    next.push(byId.get(CORPORATE_BANK_ID)!);
  }

  for (const p of properties) {
    const id = `bank-${p.id}`;
    if (byId.has(id)) {
      next.push(byId.get(id)!);
      continue;
    }
    const acct: BankAccount = {
      id,
      kind: "property",
      name: `${p.propertyName} Operating`,
      propertyId: p.id,
      propertyName: p.propertyName,
      ownerAccountId: p.ownerAccountId || "",
      ownerEmail: p.ownerEmail || "",
      ownerName: p.ownerContactName || p.ownerLegalName || "",
      balance: 0,
      reservedBalance: 0,
      pendingOwnerRemit: 0,
      lastFeeSweepAt: "",
      lastOwnerRemitAt: "",
      createdAt: now,
      updatedAt: now,
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.bankAccounts,
      acct.id,
      acct as unknown as Record<string, unknown>
    );
    next.push(acct);
  }

  return next;
}

async function postLedger(
  account: BankAccount,
  input: {
    kind: BankTxnKind;
    amount: number;
    direction: "credit" | "debit";
    memo: string;
    counterparty?: string;
    relatedId?: string;
    period?: string;
  }
): Promise<{ account: BankAccount; txn: BankTransaction }> {
  const client = await createClient();
  const signed =
    input.direction === "credit"
      ? Math.abs(input.amount)
      : -Math.abs(input.amount);
  const nextBalance = round2(account.balance + signed);
  const now = new Date().toISOString();
  const updated: BankAccount = {
    ...account,
    balance: nextBalance,
    updatedAt: now,
  };
  const txn: BankTransaction = {
    id: crypto.randomUUID(),
    accountId: account.id,
    kind: input.kind,
    amount: round2(Math.abs(input.amount)),
    direction: input.direction,
    memo: input.memo,
    counterparty: input.counterparty || "",
    propertyId: account.propertyId,
    propertyName: account.propertyName,
    relatedId: input.relatedId || "",
    period: input.period || periodNow(),
    createdAt: now,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.bankAccounts,
    updated.id,
    updated as unknown as Record<string, unknown>
  );
  await upsertSharedRecord(
    client,
    COLLECTIONS.bankTransactions,
    txn.id,
    txn as unknown as Record<string, unknown>
  );
  return { account: updated, txn };
}

/** Tenant rent appears and credits the property operating account. */
export async function postTenantRentPayment(input: {
  propertyId: string;
  propertyName: string;
  tenantName: string;
  tenantEmail?: string;
  unit: string;
  amount: number;
  method: string;
  relatedId?: string;
}) {
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const account = accounts.find(
    (a) => a.kind === "property" && a.propertyId === input.propertyId
  );
  if (!account) {
    return { error: "No operating bank account for that property." as const };
  }
  if (input.amount <= 0) {
    return { error: "Payment amount must be positive." as const };
  }
  const result = await postLedger(account, {
    kind: "tenant_rent",
    amount: input.amount,
    direction: "credit",
    memo: `Rent · ${input.unit} · ${input.method}`,
    counterparty: input.tenantName,
    relatedId: input.relatedId,
  });
  return { ok: true as const, ...result };
}

/** Sweep management fee from property → corporate. */
export async function sweepManagementFee(input: {
  propertyId: string;
  feePercent: number;
  rentBase: number;
  period?: string;
}) {
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const propertyAcct = accounts.find(
    (a) => a.kind === "property" && a.propertyId === input.propertyId
  );
  const corporate = accounts.find((a) => a.id === CORPORATE_BANK_ID);
  if (!propertyAcct || !corporate) {
    return { error: "Bank accounts not provisioned." as const };
  }
  const fee = round2(input.rentBase * (input.feePercent / 100));
  if (fee <= 0) return { error: "Fee amount is zero." as const };
  if (propertyAcct.balance < fee) {
    return {
      error: `Insufficient property cash for fee (${fee.toFixed(2)} needed, ${propertyAcct.balance.toFixed(2)} available).` as const,
    };
  }
  const period = input.period || periodNow();
  const debit = await postLedger(propertyAcct, {
    kind: "management_fee",
    amount: fee,
    direction: "debit",
    memo: `Management fee ${input.feePercent}% · ${period}`,
    counterparty: "Harborline Corporate",
    period,
  });
  const credit = await postLedger(corporate, {
    kind: "management_fee",
    amount: fee,
    direction: "credit",
    memo: `Fee from ${propertyAcct.propertyName} · ${period}`,
    counterparty: propertyAcct.propertyName,
    relatedId: debit.txn.id,
    period,
  });
  const updatedProp: BankAccount = {
    ...debit.account,
    lastFeeSweepAt: new Date().toISOString(),
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.bankAccounts,
    updatedProp.id,
    updatedProp as unknown as Record<string, unknown>
  );
  return {
    ok: true as const,
    fee,
    propertyAccount: updatedProp,
    corporateAccount: credit.account,
  };
}

/** Pay a property expense (OpEx / payroll) from the property account. */
export async function postPropertyExpense(input: {
  propertyId: string;
  amount: number;
  vendorName: string;
  category: string;
  kind?: "property_expense" | "payroll";
  relatedId?: string;
}) {
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const account = accounts.find(
    (a) => a.kind === "property" && a.propertyId === input.propertyId
  );
  if (!account) {
    return { error: "No operating bank account for that property." as const };
  }
  if (input.amount <= 0) {
    return { error: "Expense amount must be positive." as const };
  }
  if (account.balance < input.amount) {
    return {
      error: `Insufficient funds in ${account.name}.` as const,
      shortfall: round2(input.amount - account.balance),
    };
  }
  const result = await postLedger(account, {
    kind: input.kind || "property_expense",
    amount: input.amount,
    direction: "debit",
    memo: `${input.category} · ${input.vendorName}`,
    counterparty: input.vendorName,
    relatedId: input.relatedId,
  });
  return { ok: true as const, ...result };
}

/**
 * Compute remittable residual for a property:
 * available = balance - reserved (liabilities + margin) - already-pending
 * Then queue that residual into pendingOwnerRemit for NEXT month payout.
 */
export async function queueOwnerResidual(input: {
  propertyId: string;
  monthlyRentRoll: number;
  accruedLiabilities: number;
}) {
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const account = accounts.find(
    (a) => a.kind === "property" && a.propertyId === input.propertyId
  );
  if (!account) {
    return { error: "No operating bank account for that property." as const };
  }
  const margin = round2(input.monthlyRentRoll * CONSERVATIVE_MARGIN_RATE);
  const reserve = round2(Math.max(0, input.accruedLiabilities) + margin);
  const available = round2(account.balance - reserve);
  const toQueue = Math.max(0, available);
  const updated: BankAccount = {
    ...account,
    reservedBalance: reserve,
    pendingOwnerRemit: round2(account.pendingOwnerRemit + toQueue),
    balance: round2(account.balance - toQueue),
    updatedAt: new Date().toISOString(),
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.bankAccounts,
    updated.id,
    updated as unknown as Record<string, unknown>
  );
  if (toQueue > 0) {
    await postLedger(
      { ...account, balance: updated.balance + toQueue },
      {
        kind: "other",
        amount: toQueue,
        direction: "debit",
        memo: `Queue owner residual (margin ${CONSERVATIVE_MARGIN_RATE * 100}% + liabilities)`,
        counterparty: account.ownerName || "Owner",
      }
    );
  }
  return { ok: true as const, queued: toQueue, account: updated, reserve };
}

/** Pay out last month's queued residual to the owner. */
export async function remitPendingToOwner(input: { propertyId: string }) {
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const account = accounts.find(
    (a) => a.kind === "property" && a.propertyId === input.propertyId
  );
  if (!account) {
    return { error: "No operating bank account for that property." as const };
  }
  const amount = round2(account.pendingOwnerRemit);
  if (amount <= 0) {
    return { error: "No pending owner remittance queued." as const };
  }
  const now = new Date().toISOString();
  const updated: BankAccount = {
    ...account,
    pendingOwnerRemit: 0,
    lastOwnerRemitAt: now,
    updatedAt: now,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.bankAccounts,
    updated.id,
    updated as unknown as Record<string, unknown>
  );
  const txn: BankTransaction = {
    id: crypto.randomUUID(),
    accountId: account.id,
    kind: "owner_remittance",
    amount,
    direction: "debit",
    memo: "Owner remittance (prior-month residual)",
    counterparty: account.ownerName || account.ownerEmail || "Owner",
    propertyId: account.propertyId,
    propertyName: account.propertyName,
    relatedId: "",
    period: periodNow(),
    createdAt: now,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.bankTransactions,
    txn.id,
    txn as unknown as Record<string, unknown>
  );

  // Surface on owner payables for owner dashboard visibility
  const payableId = `op-bank-${account.propertyId}-${periodNow()}`;
  await upsertSharedRecord(client, COLLECTIONS.ownerPayables, payableId, {
    id: payableId,
    ownerName: account.ownerName || "Owner",
    ownerEmail: account.ownerEmail,
    property: account.propertyName,
    propertyId: account.propertyId,
    period: periodNow(),
    amount,
    amountPaid: amount,
    status: "paid",
    notes: "Bank residual remittance (prior month queue)",
    paymentMethod: "ach",
    paidAt: now,
    createdAt: now,
  } as unknown as Record<string, unknown>);

  return { ok: true as const, amount, account: updated, txn };
}

export async function requestOwnerCashCall(input: {
  propertyId: string;
  amount: number;
  reason: string;
}) {
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const account = accounts.find(
    (a) => a.kind === "property" && a.propertyId === input.propertyId
  );
  if (!account) {
    return { error: "No operating bank account for that property." as const };
  }
  if (input.amount <= 0) {
    return { error: "Cash call amount must be positive." as const };
  }
  const call: OwnerCashCall = {
    id: crypto.randomUUID(),
    propertyId: account.propertyId,
    propertyName: account.propertyName,
    ownerAccountId: account.ownerAccountId,
    ownerEmail: account.ownerEmail,
    amount: round2(input.amount),
    reason: input.reason.trim(),
    status: "requested",
    requestedAt: new Date().toISOString(),
    resolvedAt: "",
    notes: "",
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerCashCalls,
    call.id,
    call as unknown as Record<string, unknown>
  );
  return { ok: true as const, call };
}

/** Owner funds a cash call → credits property bank. */
export async function fundOwnerCashCall(input: { cashCallId: string }) {
  const client = await createClient();
  const calls = await listSharedRecords<OwnerCashCall>(
    client,
    COLLECTIONS.ownerCashCalls
  );
  const call = calls.find((c) => c.id === input.cashCallId);
  if (!call) return { error: "Cash call not found." as const };
  if (call.status === "funded") {
    return { error: "Already funded." as const };
  }
  await ensureBankAccounts();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const account = accounts.find(
    (a) => a.kind === "property" && a.propertyId === call.propertyId
  );
  if (!account) {
    return { error: "Property bank account missing." as const };
  }
  const posted = await postLedger(account, {
    kind: "owner_cash_call",
    amount: call.amount,
    direction: "credit",
    memo: `Owner cash call · ${call.reason}`,
    counterparty: call.ownerEmail || "Owner",
    relatedId: call.id,
  });
  const updatedCall: OwnerCashCall = {
    ...call,
    status: "funded",
    resolvedAt: new Date().toISOString(),
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerCashCalls,
    updatedCall.id,
    updatedCall as unknown as Record<string, unknown>
  );
  return { ok: true as const, call: updatedCall, account: posted.account };
}
