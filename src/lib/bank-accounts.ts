/**
 * Operating bank accounts for CPMC demo cash flow.
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

/** Normalize property labels for bank matching (strip suite suffixes, punctuation). */
export function normalizePropertyBankKey(name: string): string {
  return name
    .toLowerCase()
    .split("·")[0]
    .split("|")[0]
    .replace(/\bsuite\b.*$/i, "")
    .replace(/\bunit\b.*$/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find the operating bank for a managed property by id and/or name.
 * Prefers exact propertyId, then exact name, then soft name containment.
 */
export function resolvePropertyBankAccount(
  accounts: BankAccount[],
  input: { propertyId?: string; propertyName?: string }
): BankAccount | null {
  const propertyAccounts = accounts.filter((a) => a.kind === "property");
  const id = (input.propertyId || "").trim();
  if (id) {
    const byId = propertyAccounts.find((a) => a.propertyId === id || a.id === `bank-${id}`);
    if (byId) return byId;
  }

  const rawName = (input.propertyName || "").trim();
  if (!rawName) return null;
  const key = normalizePropertyBankKey(rawName);
  if (!key) return null;

  const exact = propertyAccounts.find(
    (a) => normalizePropertyBankKey(a.propertyName) === key
  );
  if (exact) return exact;

  const soft = propertyAccounts.find((a) => {
    const bankKey = normalizePropertyBankKey(a.propertyName);
    return (
      bankKey.includes(key) ||
      key.includes(bankKey) ||
      a.propertyName.toLowerCase().includes(rawName.toLowerCase()) ||
      rawName.toLowerCase().includes(a.propertyName.toLowerCase())
    );
  });
  return soft ?? null;
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
      name: "CPMC Corporate Operating",
      propertyId: "",
      propertyName: "CPMC Corporate",
      ownerAccountId: "",
      ownerEmail: "",
      ownerName: "CPMC Property Management Company",
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
    const existingCorp = byId.get(CORPORATE_BANK_ID)!;
    const renamed: BankAccount = {
      ...existingCorp,
      kind: "corporate",
      name: "CPMC Corporate Operating",
      propertyName: "CPMC Corporate",
      ownerName: "CPMC Property Management Company",
      updatedAt: now,
    };
    const needsRename =
      existingCorp.name !== renamed.name ||
      existingCorp.propertyName !== renamed.propertyName ||
      existingCorp.ownerName !== renamed.ownerName;
    if (needsRename) {
      await upsertSharedRecord(
        client,
        COLLECTIONS.bankAccounts,
        renamed.id,
        renamed as unknown as Record<string, unknown>
      );
      next.push(renamed);
    } else {
      next.push(existingCorp);
    }
  }

  for (const p of properties) {
    const id = `bank-${p.id}`;
    const existingAcct =
      byId.get(id) ||
      existing.find(
        (a) =>
          a.kind === "property" &&
          (a.propertyId === p.id ||
            normalizePropertyBankKey(a.propertyName) ===
              normalizePropertyBankKey(p.propertyName))
      );

    if (existingAcct) {
      const synced: BankAccount = {
        ...existingAcct,
        id: existingAcct.id.startsWith("bank-") ? existingAcct.id : id,
        propertyId: p.id,
        propertyName: p.propertyName,
        name: `${p.propertyName} Operating`,
        ownerAccountId: p.ownerAccountId || existingAcct.ownerAccountId,
        ownerEmail: p.ownerEmail || existingAcct.ownerEmail,
        ownerName:
          p.ownerContactName ||
          p.ownerLegalName ||
          existingAcct.ownerName,
        updatedAt: now,
      };
      if (
        synced.propertyName !== existingAcct.propertyName ||
        synced.propertyId !== existingAcct.propertyId ||
        synced.name !== existingAcct.name
      ) {
        await upsertSharedRecord(
          client,
          COLLECTIONS.bankAccounts,
          synced.id,
          synced as unknown as Record<string, unknown>
        );
      }
      next.push(synced);
      byId.set(synced.id, synced);
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
  period?: string;
}) {
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const account = resolvePropertyBankAccount(accounts, {
    propertyId: input.propertyId,
    propertyName: input.propertyName,
  });
  if (!account) {
    return {
      error: `No operating bank account for "${input.propertyName || input.propertyId}".` as const,
    };
  }
  if (input.amount <= 0) {
    return { error: "Payment amount must be positive." as const };
  }
  const result = await postLedger(account, {
    kind: "tenant_rent",
    amount: input.amount,
    direction: "credit",
    memo: `Rent · ${input.unit || "unit"} · ${input.method}`,
    counterparty: input.tenantName,
    relatedId: input.relatedId,
    period: input.period,
  });
  return { ok: true as const, ...result };
}

/** Sweep management fee from property → corporate. */
export async function sweepManagementFee(input: {
  propertyId: string;
  feePercent: number;
  rentBase: number;
  /** When set, used as the sweep amount instead of rentBase × feePercent. */
  feeAmount?: number;
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
  const fee =
    input.feeAmount != null && Number.isFinite(input.feeAmount)
      ? round2(input.feeAmount)
      : round2(input.rentBase * (input.feePercent / 100));
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
    counterparty: "CPMC Corporate",
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
  propertyId?: string;
  propertyName?: string;
  amount: number;
  vendorName: string;
  category: string;
  kind?: "property_expense" | "payroll";
  relatedId?: string;
  period?: string;
  /** Used when rebuilding ledgers so historical OpEx can post after rent deposits. */
  allowOverdraft?: boolean;
}) {
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const account = resolvePropertyBankAccount(accounts, {
    propertyId: input.propertyId,
    propertyName: input.propertyName,
  });
  if (!account) {
    return {
      error: `No operating bank account for "${input.propertyName || input.propertyId}".` as const,
    };
  }
  if (input.amount <= 0) {
    return { error: "Expense amount must be positive." as const };
  }
  if (!input.allowOverdraft && account.balance < input.amount) {
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
    period: input.period,
  });
  return { ok: true as const, ...result };
}

/**
 * Debit corporate or property operating cash for a payroll settlement slice
 * (direct deposits, tax remittance, or benefits).
 */
export async function postPayrollBankDebit(input: {
  costCenter: "corporate" | "property";
  propertyId?: string;
  propertyName?: string;
  amount: number;
  memo: string;
  counterparty: string;
  relatedId?: string;
  period?: string;
  allowOverdraft?: boolean;
}) {
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  if (input.amount <= 0) {
    return { error: "Payroll amount must be positive." as const };
  }

  let account: BankAccount | undefined;
  if (input.costCenter === "corporate") {
    account = accounts.find((a) => a.id === CORPORATE_BANK_ID);
  } else {
    account =
      resolvePropertyBankAccount(accounts, {
        propertyId: input.propertyId,
        propertyName: input.propertyName,
      }) ?? undefined;
  }
  if (!account) {
    return {
      error:
        input.costCenter === "corporate"
          ? ("No CPMC corporate bank account." as const)
          : (`No operating bank account for "${input.propertyName || input.propertyId}".` as const),
    };
  }
  if (!input.allowOverdraft && account.balance < input.amount) {
    return {
      error: `Insufficient funds in ${account.name} for payroll.` as const,
      shortfall: round2(input.amount - account.balance),
    };
  }
  const result = await postLedger(account, {
    kind: "payroll",
    amount: input.amount,
    direction: "debit",
    memo: input.memo,
    counterparty: input.counterparty,
    relatedId: input.relatedId,
    period: input.period,
  });
  return { ok: true as const, ...result };
}

/**
 * Rebuild property bank cash from operations in a compact, readable form:
 * one rent deposit per property (unit A/R + lease gap) and one withdrawal
 * per paid OpEx invoice. Wipes prior rent/expense posts so duplicates cannot
 * inflate balances, then recalculates cash from the ledger.
 */
export async function syncPropertyBanksFromLedgers() {
  await ensureBankAccounts();
  const client = await createClient();
  const [
    accounts,
    txns,
    rentalReceivables,
    payableInvoices,
    propertyTenants,
  ] = await Promise.all([
    listSharedRecords<BankAccount>(client, COLLECTIONS.bankAccounts),
    listSharedRecords<BankTransaction>(client, COLLECTIONS.bankTransactions),
    listSharedRecords<{
      id: string;
      property?: string;
      unit?: string;
      customerName?: string;
      description?: string;
      category?: string;
      amountReceived?: number;
      period?: string;
      paymentMethod?: string;
    }>(client, COLLECTIONS.rentalReceivables),
    listSharedRecords<{
      id: string;
      property?: string;
      vendorName?: string;
      category?: string;
      amountPaid?: number;
      invoiceDate?: string;
    }>(client, COLLECTIONS.payableInvoices),
    listSharedRecords<{
      id: string;
      propertyId?: string;
      propertyName?: string;
      unit?: string;
      name?: string;
      status?: string;
      monthlyRent?: string | number;
    }>(client, COLLECTIONS.propertyTenants),
  ]);

  const { operationalRentCollected } = await import(
    "@/lib/accounts-receivable"
  );
  const { deleteSharedRecord } = await import("@/lib/shared-store");

  let cleared = 0;
  let rentPosted = 0;
  let expensePosted = 0;
  const period = periodNow();
  const now = new Date().toISOString();

  // Clear rebuildable activity (keep fee sweeps / owner remits / cash calls / payroll).
  const toClear = txns.filter(
    (t) =>
      t.kind === "opening" ||
      t.kind === "tenant_rent" ||
      t.kind === "property_expense"
    // intentionally keep "payroll" — those come from HR payroll runs
  );
  for (let i = 0; i < toClear.length; i += 40) {
    const chunk = toClear.slice(i, i + 40);
    await Promise.all(
      chunk.map((txn) =>
        deleteSharedRecord(client, COLLECTIONS.bankTransactions, txn.id)
      )
    );
    cleared += chunk.length;
  }

  const propertyAccounts = accounts.filter((a) => a.kind === "property");

  for (const account of propertyAccounts) {
    const propertyName = (account.propertyName || "").trim();
    if (!propertyName) continue;
    const rentIn = operationalRentCollected(
      rentalReceivables as never,
      propertyName,
      period,
      propertyTenants
    );
    if (rentIn <= 0) continue;
    const relatedId = `rent-roll:${account.propertyId || propertyName}:${period}`;
    const txn: BankTransaction = {
      id: `btxn-rent:${relatedId}`,
      accountId: account.id,
      kind: "tenant_rent",
      amount: rentIn,
      direction: "credit",
      memo: `Rent collections · ${period}`,
      counterparty: "Tenants",
      propertyId: account.propertyId,
      propertyName: account.propertyName,
      relatedId,
      period,
      createdAt: now,
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.bankTransactions,
      txn.id,
      txn as unknown as Record<string, unknown>
    );
    rentPosted += 1;
  }

  for (const inv of payableInvoices) {
    const paid = round2(Number(inv.amountPaid) || 0);
    if (paid <= 0) continue;
    if ((inv.id || "").startsWith("mgmt-fee-ap:")) continue;
    const propertyName = (inv.property || "").trim();
    if (!propertyName) continue;
    const match = resolvePropertyBankAccount(accounts, { propertyName });
    if (!match) continue;
    const txn: BankTransaction = {
      id: `btxn-ap:${inv.id}`,
      accountId: match.id,
      kind: "property_expense",
      amount: paid,
      direction: "debit",
      memo: `${inv.category || "operating"} · ${inv.vendorName || "Vendor"}`,
      counterparty: inv.vendorName || "Vendor",
      propertyId: match.propertyId,
      propertyName: match.propertyName,
      relatedId: inv.id,
      period: (inv.invoiceDate || "").slice(0, 7) || period,
      createdAt: now,
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.bankTransactions,
      txn.id,
      txn as unknown as Record<string, unknown>
    );
    expensePosted += 1;
  }

  const allTxns = await listSharedRecords<BankTransaction>(
    client,
    COLLECTIONS.bankTransactions
  );
  const finalAccounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  let accountsUpdated = 0;
  for (const account of finalAccounts) {
    const signed = allTxns
      .filter((t) => t.accountId === account.id)
      .reduce((sum, t) => {
        const amt = Number(t.amount) || 0;
        return sum + (t.direction === "credit" ? amt : -amt);
      }, 0);
    const nextBal = round2(signed);
    if (nextBal === round2(account.balance)) continue;
    await upsertSharedRecord(client, COLLECTIONS.bankAccounts, account.id, {
      ...account,
      balance: nextBal,
      updatedAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
    accountsUpdated += 1;
  }

  return {
    ok: true as const,
    rentPosted,
    expensePosted,
    cleared,
    accountsUpdated,
  };
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

/** Pay an owner remittance from the property operating bank account. */
export async function payOwnerRemittanceFromBank(input: {
  propertyName: string;
  propertyId?: string;
  amount: number;
  payableId: string;
  ownerName?: string;
  period?: string;
  paymentMethod?: string;
}) {
  if (input.amount <= 0) {
    return { error: "Payment amount must be positive." as const };
  }
  await ensureBankAccounts();
  const client = await createClient();
  const accounts = await listSharedRecords<BankAccount>(
    client,
    COLLECTIONS.bankAccounts
  );
  const account = resolvePropertyBankAccount(accounts, {
    propertyId: input.propertyId,
    propertyName: input.propertyName,
  });
  if (!account) {
    return {
      error: `No operating bank account for "${input.propertyName}".` as const,
    };
  }
  const available = round2(
    account.balance - (account.reservedBalance || 0)
  );
  if (available + 0.001 < input.amount) {
    return {
      error: `Insufficient property cash to remit (${input.amount.toFixed(2)} needed, ${available.toFixed(2)} available).` as const,
      shortfall: round2(input.amount - available),
    };
  }

  // Owner remittance leaves the property operating account to the owner.
  // It must NOT credit CPMC Corporate (that path is management_fee only).
  const result = await postLedger(account, {
    kind: "owner_remittance",
    amount: input.amount,
    direction: "debit",
    memo: `Owner distribution to ${input.ownerName || account.ownerName || "owner"} · ${input.period || periodNow()}`,
    counterparty: input.ownerName || account.ownerName || "Owner",
    relatedId: input.payableId,
    period: input.period || periodNow(),
  });

  const updated: BankAccount = {
    ...result.account,
    lastOwnerRemitAt: new Date().toISOString(),
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.bankAccounts,
    updated.id,
    updated as unknown as Record<string, unknown>
  );

  return {
    ok: true as const,
    amount: input.amount,
    account: updated,
    txn: result.txn,
  };
}

/**
 * A/P owner payment settlement:
 * 1) Sweep proportional management fee property → CPMC corporate
 * 2) Debit property for owner remittance (visible on owner portal as paid)
 */
export async function settleOwnerRemittancePayment(input: {
  propertyName: string;
  propertyId?: string;
  /** Net amount going to the owner this payment. */
  ownerAmount: number;
  /** Full remittance net owed (for fee proportioning). */
  remittanceTotal: number;
  /** Contract management fee for this remittance period. */
  managementFeeTotal: number;
  feePercent: number;
  payableId: string;
  ownerName?: string;
  period?: string;
}) {
  if (input.ownerAmount <= 0) {
    return { error: "Payment amount must be positive." as const };
  }

  await ensureBankAccounts();
  const client = await createClient();
  const [accounts, txns] = await Promise.all([
    listSharedRecords<BankAccount>(client, COLLECTIONS.bankAccounts),
    listSharedRecords<BankTransaction>(client, COLLECTIONS.bankTransactions),
  ]);

  const propertyAcct = resolvePropertyBankAccount(accounts, {
    propertyId: input.propertyId,
    propertyName: input.propertyName,
  });
  const corporate = accounts.find((a) => a.id === CORPORATE_BANK_ID);
  if (!propertyAcct || !corporate) {
    return {
      error: `Bank accounts not ready for "${input.propertyName}".` as const,
    };
  }

  const feeRelatedPrefix = `mgmt-fee:${input.payableId}`;
  const feeAlreadySwept = round2(
    txns
      .filter(
        (t) =>
          t.accountId === propertyAcct.id &&
          t.kind === "management_fee" &&
          t.direction === "debit" &&
          (t.relatedId || "").startsWith(feeRelatedPrefix)
      )
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  );

  const feeRemaining = Math.max(
    0,
    round2(input.managementFeeTotal - feeAlreadySwept)
  );
  const remittanceTotal = Math.max(input.remittanceTotal, 0.01);
  const feeShare =
    feeRemaining <= 0
      ? 0
      : round2(
          Math.min(
            feeRemaining,
            (input.managementFeeTotal * input.ownerAmount) / remittanceTotal
          )
        );

  const totalLeaveProperty = round2(input.ownerAmount + feeShare);
  const available = round2(
    propertyAcct.balance - (propertyAcct.reservedBalance || 0)
  );
  if (available + 0.001 < totalLeaveProperty) {
    return {
      error: `Insufficient property cash (need ${totalLeaveProperty.toFixed(2)} for owner ${input.ownerAmount.toFixed(2)} + management fee ${feeShare.toFixed(2)}; ${available.toFixed(2)} available).` as const,
      shortfall: round2(totalLeaveProperty - available),
    };
  }

  const period = input.period || periodNow();
  let propertyBalance = propertyAcct.balance;
  let corporateBalance = corporate.balance;
  let feeSwept = 0;

  if (feeShare > 0) {
    const feeRelatedId = `${feeRelatedPrefix}:${crypto.randomUUID()}`;
    const propAfterFee = await postLedger(
      { ...propertyAcct, balance: propertyBalance },
      {
        kind: "management_fee",
        amount: feeShare,
        direction: "debit",
        memo: `Management fee ${input.feePercent}% · ${period}`,
        counterparty: "CPMC Corporate",
        relatedId: feeRelatedId,
        period,
      }
    );
    propertyBalance = propAfterFee.account.balance;

    const corpAfterFee = await postLedger(
      { ...corporate, balance: corporateBalance },
      {
        kind: "management_fee",
        amount: feeShare,
        direction: "credit",
        memo: `Fee from ${propertyAcct.propertyName} · ${period}`,
        counterparty: propertyAcct.propertyName,
        relatedId: feeRelatedId,
        period,
      }
    );
    corporateBalance = corpAfterFee.account.balance;
    feeSwept = feeShare;

    await upsertSharedRecord(
      client,
      COLLECTIONS.bankAccounts,
      propAfterFee.account.id,
      {
        ...propAfterFee.account,
        lastFeeSweepAt: new Date().toISOString(),
      } as unknown as Record<string, unknown>
    );
  }

  const remit = await postLedger(
    { ...propertyAcct, balance: propertyBalance },
    {
      kind: "owner_remittance",
      amount: input.ownerAmount,
      direction: "debit",
      memo: `Owner distribution to ${input.ownerName || propertyAcct.ownerName || "owner"} · ${period}`,
      counterparty: input.ownerName || propertyAcct.ownerName || "Owner",
      relatedId: input.payableId,
      period,
    }
  );

  const updatedProp: BankAccount = {
    ...remit.account,
    lastOwnerRemitAt: new Date().toISOString(),
    lastFeeSweepAt:
      feeSwept > 0
        ? new Date().toISOString()
        : propertyAcct.lastFeeSweepAt,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.bankAccounts,
    updatedProp.id,
    updatedProp as unknown as Record<string, unknown>
  );

  return {
    ok: true as const,
    ownerAmount: input.ownerAmount,
    feeSwept,
    totalDebited: totalLeaveProperty,
    account: updatedProp,
    corporateBalance,
    txn: remit.txn,
  };
}

/** Pay out last month's queued residual to the owner (uses property bank). */
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

  // Balance was already moved into pendingOwnerRemit at queue time — clear
  // the earmark and record the remittance against the monthly owner payable.
  const now = new Date().toISOString();
  const period = periodNow();
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
    period,
    createdAt: now,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.bankTransactions,
    txn.id,
    txn as unknown as Record<string, unknown>
  );

  // Apply to the bank-synced monthly remittance when present.
  const { monthlyOwnerRemittanceId, normalizeOwnerPayable } = await import(
    "@/lib/owner-payables"
  );
  const { monthSlug } = await import("@/lib/seed-dates");
  const payableId = monthlyOwnerRemittanceId(account.propertyId, monthSlug(0));
  const payables = await listSharedRecords<{ id: string } & Record<string, unknown>>(
    client,
    COLLECTIONS.ownerPayables
  );
  const existing = payables.find(
    (p) =>
      p.id === payableId ||
      ((p.property as string) || "").toLowerCase() ===
        account.propertyName.toLowerCase()
  );
  if (existing) {
    const normalized = normalizeOwnerPayable(
      existing as Parameters<typeof normalizeOwnerPayable>[0]
    );
    await upsertSharedRecord(client, COLLECTIONS.ownerPayables, existing.id, {
      ...normalized,
      amountPaid: round2(
        Math.min(
          normalized.amount,
          round2(normalized.amountPaid + amount)
        )
      ),
      paymentMethod: normalized.paymentMethod || "ach",
      paymentReference: txn.id,
      notes: `${normalized.notes || ""}\nBank residual remittance ${amount.toFixed(2)} (${period}).`.trim(),
    } as unknown as Record<string, unknown>);
  }

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
