"use server";

import { postTenantRentPayment, ensureBankAccounts } from "@/lib/bank-accounts";
import { getTenantPortalSession } from "@/lib/tenant-portal-accounts";
import { getCurrentPortalTenant } from "@/lib/portal/auth-server";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { Receivable } from "@/lib/accounts-receivable";

function methodLabel(method: string) {
  const m = method.toLowerCase();
  if (m.includes("ach") || m.includes("auto") || m.includes("bank"))
    return "ACH autopay";
  if (m.includes("check")) return "Check / deliver";
  if (m.includes("month")) return "Monthly pay";
  return method || "Portal payment";
}

/**
 * Tenant portal rent payment → property operating bank (+ AR receipt when matched).
 */
export async function portalRecordRentPayment(input: {
  amount: number;
  method: string;
  propertyLabel?: string;
}) {
  if (input.amount <= 0) {
    return { error: "Payment amount must be positive." as const };
  }

  const session = await getCurrentPortalTenant();
  if (!session) return { error: "Sign in required." as const };

  const account = await getTenantPortalSession();
  const propertyId = account?.propertyId || session.propertyId || "";
  const propertyName =
    account?.propertyName ||
    session.propertyName ||
    input.propertyLabel ||
    "Property";
  const unit = account?.unit || session.unit || "";

  let bankResult: Awaited<ReturnType<typeof postTenantRentPayment>>;

  if (propertyId) {
    bankResult = await postTenantRentPayment({
      propertyId,
      propertyName,
      tenantName: session.displayName,
      tenantEmail: session.email,
      unit,
      amount: input.amount,
      method: methodLabel(input.method),
    });
  } else {
    const accounts = await ensureBankAccounts();
    const match = accounts.find(
      (a) =>
        a.kind === "property" &&
        a.propertyName
          .toLowerCase()
          .includes(propertyName.toLowerCase().split("·")[0].trim())
    );
    if (!match) {
      return {
        error:
          "No property bank account matched. Complete lease activation so your unit is linked." as const,
      };
    }
    bankResult = await postTenantRentPayment({
      propertyId: match.propertyId,
      propertyName: match.propertyName,
      tenantName: session.displayName,
      tenantEmail: session.email,
      unit,
      amount: input.amount,
      method: methodLabel(input.method),
    });
  }

  if ("error" in bankResult) return bankResult;

  try {
    const client = await createClient();
    const receivables = await listSharedRecords<Receivable>(
      client,
      COLLECTIONS.rentalReceivables
    );
    const open = receivables
      .filter((r) => {
        const bal = r.amount - r.amountReceived;
        if (bal <= 0) return false;
        const nameMatch = r.customerName
          .toLowerCase()
          .includes(session.displayName.toLowerCase().slice(0, 6));
        const propMatch =
          !propertyName ||
          r.property
            .toLowerCase()
            .includes(propertyName.toLowerCase().split("·")[0].trim());
        return nameMatch || propMatch;
      })
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

    let remaining = input.amount;
    for (const row of open) {
      if (remaining <= 0) break;
      const bal = Math.max(0, row.amount - row.amountReceived);
      const apply = Math.min(bal, remaining);
      if (apply <= 0) continue;
      await upsertSharedRecord(client, COLLECTIONS.rentalReceivables, row.id, {
        ...row,
        amountReceived: Math.round((row.amountReceived + apply) * 100) / 100,
        paymentMethod: methodLabel(input.method),
      } as unknown as Record<string, unknown>);
      remaining = Math.round((remaining - apply) * 100) / 100;
    }
  } catch {
    /* AR update best-effort */
  }

  return {
    ok: true as const,
    confirmationNumber: `HL-BANK-${bankResult.txn.id.slice(0, 8).toUpperCase()}`,
    accountBalance: bankResult.account.balance,
  };
}
