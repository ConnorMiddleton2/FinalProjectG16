"use server";

import {
  ensureBankAccounts,
  postPropertyExpense,
  postTenantRentPayment,
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
  let propertyId = input.propertyId || "";
  let propertyName = input.propertyName;
  if (!propertyId) {
    const match = accounts.find(
      (a) =>
        a.kind === "property" &&
        a.propertyName.toLowerCase() === propertyName.toLowerCase()
    );
    if (!match) {
      const soft = accounts.find(
        (a) =>
          a.kind === "property" &&
          (a.propertyName.toLowerCase().includes(propertyName.toLowerCase()) ||
            propertyName.toLowerCase().includes(a.propertyName.toLowerCase()))
      );
      if (!soft) return { error: "No bank account for that property." as const };
      propertyId = soft.propertyId;
      propertyName = soft.propertyName;
    } else {
      propertyId = match.propertyId;
      propertyName = match.propertyName;
    }
  }
  return postTenantRentPayment({
    propertyId,
    propertyName,
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
  const match =
    accounts.find(
      (a) =>
        a.kind === "property" &&
        a.propertyName.toLowerCase() === input.propertyName.toLowerCase()
    ) ||
    accounts.find(
      (a) =>
        a.kind === "property" &&
        (a.propertyName
          .toLowerCase()
          .includes(input.propertyName.toLowerCase()) ||
          input.propertyName
            .toLowerCase()
            .includes(a.propertyName.toLowerCase()))
    );
  if (!match) return { error: "No bank account for that property." as const };
  return postPropertyExpense({
    propertyId: match.propertyId,
    amount: input.amount,
    vendorName: input.vendorName,
    category: input.category,
    kind: input.kind || "property_expense",
    relatedId: input.relatedId,
  });
}
