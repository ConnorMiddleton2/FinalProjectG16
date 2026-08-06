"use server";

import {
  ensureBankAccounts,
  fundOwnerCashCall,
  queueOwnerResidual,
  remitPendingToOwner,
  requestOwnerCashCall,
  sweepManagementFee,
  postPropertyExpense,
  postTenantRentPayment,
} from "@/lib/bank-accounts";
import { requireOpsModule } from "@/lib/team-auth";
import { createClient } from "@/lib/supabase/server";
import { COLLECTIONS, listSharedRecords } from "@/lib/shared-store";
import type { ManagementContractDraft } from "@/lib/management-contract";
import type { PayableInvoice } from "@/lib/accounts-payable";

export async function provisionBankAccountsAction() {
  await requireOpsModule("banks");
  const accounts = await ensureBankAccounts();
  return { ok: true as const, count: accounts.length };
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
