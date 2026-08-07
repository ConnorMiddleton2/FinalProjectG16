"use server";

import {
  postTenantRentPayment,
  ensureBankAccounts,
  resolvePropertyBankAccount,
} from "@/lib/bank-accounts";
import { getTenantPortalSession } from "@/lib/tenant-portal-accounts";
import { getCurrentPortalTenant } from "@/lib/portal/auth-server";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { Receivable } from "@/lib/accounts-receivable";
import {
  portalKindToPaymentMethod,
  type TenantPaymentMethod,
} from "@/lib/payment-methods";
import { withPaymentMethod, type TenantRecord } from "@/lib/tenants";
import {
  assertTenantCanSubmitBalancePayment,
  releasePortalBalanceClaim,
} from "@/lib/portal/payment-guard";

function methodLabel(method: string) {
  const m = method.toLowerCase();
  if (m.includes("ach") || m.includes("bank")) return "ACH";
  if (m.includes("check")) return "Check";
  if (m.includes("debit") || m.includes("card")) return "Debit card";
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
  const tenantAccountId =
    account?.id || session.tenantAccountId || session.userId;

  const identity = {
    tenantAccountId,
    tenantEmail: account?.email || session.email,
    tenantName: account?.fullName || session.displayName,
    tenantRecordId: account?.tenantRecordId || session.tenantRecordId || "",
    propertyId,
    propertyName,
    unit,
  };

  const guard = await assertTenantCanSubmitBalancePayment(
    identity,
    input.amount,
    "debit_card"
  );
  if ("error" in guard) return { error: guard.error };

  const accounts = await ensureBankAccounts();
  const match = resolvePropertyBankAccount(accounts, {
    propertyId,
    propertyName,
  });
  if (!match) {
    await releasePortalBalanceClaim(identity);
    return {
      error:
        "No property bank account matched. Complete lease activation so your unit is linked to a CPMC-managed property." as const,
    };
  }

  const bankResult = await postTenantRentPayment({
    propertyId: match.propertyId,
    propertyName: match.propertyName,
    tenantName: session.displayName,
    tenantEmail: session.email,
    unit,
    amount: input.amount,
    method: methodLabel(input.method),
  });

  if ("error" in bankResult) {
    await releasePortalBalanceClaim(identity);
    return bankResult;
  }

  try {
    const client = await createClient();
    const receivables = await listSharedRecords<Receivable>(
      client,
      COLLECTIONS.rentalReceivables
    );
    const tenantId =
      account?.tenantRecordId || session.tenantRecordId || "";
    const propKey = match.propertyName.toLowerCase();
    const unitKey = unit.trim().toLowerCase();
    const open = receivables
      .filter((r) => {
        const bal = r.amount - r.amountReceived;
        if (bal <= 0) return false;
        if (
          tenantId &&
          r.customerId.trim().toLowerCase() === tenantId.trim().toLowerCase()
        ) {
          return true;
        }
        const prop = (r.property || "").toLowerCase();
        const unitMatch =
          !unitKey || (r.unit || "").trim().toLowerCase() === unitKey;
        const propMatch =
          prop.includes(propKey) ||
          propKey.includes(prop) ||
          prop.includes(propKey.split(" ")[0] || "");
        return propMatch && unitMatch;
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
        paymentReference: bankResult.txn.id,
        property: row.property || match.propertyName,
      } as unknown as Record<string, unknown>);
      remaining = Math.round((remaining - apply) * 100) / 100;
    }
  } catch {
    /* AR update best-effort — bank credit already succeeded */
  }

  return {
    ok: true as const,
    confirmationNumber: `HL-BANK-${bankResult.txn.id.slice(0, 8).toUpperCase()}`,
    accountBalance: bankResult.account.balance,
    propertyName: match.propertyName,
  };
}

/**
 * Persist the tenant's preferred payment method onto the shared tenant record
 * (and portal account when present) so ops and portal stay in sync.
 */
export async function portalSavePaymentMethodAction(input: {
  method: TenantPaymentMethod | string;
  last4?: string;
}) {
  const session = await getCurrentPortalTenant();
  if (!session) return { error: "Sign in required." as const };

  const account = await getTenantPortalSession();
  const method = portalKindToPaymentMethod(input.method);
  const last4 = (input.last4 || "").replace(/\D/g, "").slice(-4);

  const tenantId =
    account?.tenantRecordId || session.tenantRecordId || "";

  if (tenantId) {
    const client = await createClient();
    const tenants = await listSharedRecords<TenantRecord>(
      client,
      COLLECTIONS.tenants
    );
    const current = tenants.find((t) => t.id === tenantId);
    if (current) {
      const next = withPaymentMethod(current, method);
      await upsertSharedRecord(
        client,
        COLLECTIONS.tenants,
        next.id,
        next as unknown as Record<string, unknown>
      );
    }
  }

  if (account) {
    const { saveTenantAccount } = await import("@/lib/tenant-portal-accounts");
    await saveTenantAccount({
      ...account,
      preferredPaymentMethod: method,
      paymentMethodLast4: last4 || account.paymentMethodLast4,
      updatedAt: new Date().toISOString(),
    });
  }

  if (!tenantId && !account) {
    return { error: "No linked tenant account." as const };
  }

  return {
    ok: true as const,
    paymentMethod: method,
    last4,
  };
}

/**
 * Tenant confirms a check was mailed/handed to management.
 * Does NOT credit the bank — A/R must approve first.
 */
export async function portalConfirmCheckDelivery(input: {
  amount: number;
  delivery: "mailed" | "handed";
}) {
  if (input.amount <= 0) {
    return { error: "Payment amount must be positive." as const };
  }
  if (input.delivery !== "mailed" && input.delivery !== "handed") {
    return { error: "Select how the check was delivered." as const };
  }

  const session = await getCurrentPortalTenant();
  if (!session) return { error: "Sign in required." as const };

  const account = await getTenantPortalSession();
  const accountId = account?.id || session.tenantAccountId || session.userId;
  const propertyId = account?.propertyId || session.propertyId || "";
  const propertyName =
    account?.propertyName || session.propertyName || "Property";
  const unit = account?.unit || session.unit || "";

  const identity = {
    tenantAccountId: accountId,
    tenantEmail: account?.email || session.email,
    tenantName: account?.fullName || session.displayName,
    tenantRecordId:
      account?.tenantRecordId || session.tenantRecordId || "",
    propertyId,
    propertyName,
    unit,
  };

  const guard = await assertTenantCanSubmitBalancePayment(
    identity,
    input.amount,
    "check"
  );
  if ("error" in guard) return { error: guard.error };

  try {
    await portalSavePaymentMethodAction({ method: "check" });

    const client = await createClient();
    const id = crypto.randomUUID();
    const row = {
      id,
      tenantAccountId: accountId,
      tenantEmail: account?.email || session.email,
      tenantName: account?.fullName || session.displayName,
      tenantRecordId:
        account?.tenantRecordId || session.tenantRecordId || "",
      propertyId,
      propertyName,
      unit,
      amount: Math.round(input.amount * 100) / 100,
      delivery: input.delivery,
      status: "pending_ar" as const,
      submittedAt: new Date().toISOString(),
    };

    await upsertSharedRecord(
      client,
      COLLECTIONS.pendingCheckPayments,
      id,
      row as unknown as Record<string, unknown>
    );

    try {
      const { postTenantPortalMessage } = await import(
        "@/lib/tenant-portal-accounts"
      );
      await postTenantPortalMessage({
        tenantAccountId: accountId,
        tenantEmail: row.tenantEmail,
        fromRole: "system",
        subject: "Check payment submitted — awaiting A/R approval",
        body: [
          `We recorded your confirmation that a check for $${row.amount.toFixed(2)} was ${input.delivery === "mailed" ? "mailed" : "handed"} to management for ${row.propertyName}${row.unit ? ` · ${row.unit}` : ""}.`,
          "",
          "Accounts Receivable must approve the check before funds are deposited to the property bank account. You will get another message when it is approved or if more information is needed.",
        ].join("\n"),
        relatedApplicationId: "",
        availabilityJson: "",
      });
    } catch {
      /* message is best-effort */
    }

    return {
      ok: true as const,
      pendingId: id,
      status: "pending_ar" as const,
      amount: row.amount,
      delivery: input.delivery,
      message:
        "Check confirmed. Waiting for Accounts Receivable to approve before the bank deposit.",
    };
  } catch (err) {
    await releasePortalBalanceClaim(identity);
    return {
      error:
        err instanceof Error
          ? err.message
          : ("Could not submit check confirmation." as const),
    };
  }
}
