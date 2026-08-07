"use server";

import {
  ensureBankAccounts,
  postPropertyExpense,
  postTenantRentPayment,
  resolvePropertyBankAccount,
} from "@/lib/bank-accounts";

/** Resolve property bank by id or name, then credit rent. */
export async function creditPropertyBankFromAr(input: {
  propertyName: string;
  propertyId?: string;
  tenantName: string;
  unit: string;
  amount: number;
  method: string;
  relatedId?: string;
}) {
  if (input.amount <= 0) return { error: "Amount must be positive." as const };
  const accounts = await ensureBankAccounts();
  const match = resolvePropertyBankAccount(accounts, {
    propertyId: input.propertyId,
    propertyName: input.propertyName,
  });
  if (!match) {
    return {
      error: `No bank account for property "${input.propertyName}".` as const,
    };
  }
  return postTenantRentPayment({
    propertyId: match.propertyId,
    propertyName: match.propertyName,
    tenantName: input.tenantName,
    unit: input.unit,
    amount: input.amount,
    method: input.method || "AR receipt",
    relatedId: input.relatedId,
  });
}

/** Debit property bank when paying an AP invoice. */
export async function debitPropertyBankFromAp(input: {
  propertyName: string;
  vendorName: string;
  category: string;
  amount: number;
  relatedId?: string;
  kind?: "property_expense" | "payroll";
}) {
  if (input.amount <= 0) return { error: "Amount must be positive." as const };
  const accounts = await ensureBankAccounts();
  const match = resolvePropertyBankAccount(accounts, {
    propertyName: input.propertyName,
  });
  if (!match) {
    return {
      error: `No bank account for property "${input.propertyName}".` as const,
    };
  }
  return postPropertyExpense({
    propertyId: match.propertyId,
    propertyName: match.propertyName,
    amount: input.amount,
    vendorName: input.vendorName,
    category: input.category,
    kind: input.kind || "property_expense",
    relatedId: input.relatedId,
  });
}
