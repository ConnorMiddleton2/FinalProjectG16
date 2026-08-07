"use server";

import { requireOpsModule } from "@/lib/team-auth";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { Receivable } from "@/lib/accounts-receivable";
import { round2 } from "@/lib/accounts-receivable";
import type { PayableInvoice } from "@/lib/accounts-payable";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { ensureBankAccounts, sweepManagementFee } from "@/lib/bank-accounts";
import { monthSlug } from "@/lib/seed-dates";
import {
  buildManagementFeePayable,
  buildManagementFeePreviews,
  buildManagementFeeReceivable,
  isManagementFeePayable,
  MGMT_FEE_AP_PREFIX,
  type ManagementFeePreviewRow,
} from "@/lib/management-fee-settlements";

async function loadFeeInputs(monthsAgo: number) {
  const client = await createClient();
  const [properties, rental, misc, payables, accounts, propertyTenants] =
    await Promise.all([
      listSharedRecords<ManagementContractDraft>(
        client,
        COLLECTIONS.managedProperties
      ),
      listSharedRecords<Receivable>(client, COLLECTIONS.rentalReceivables),
      listSharedRecords<Receivable>(
        client,
        COLLECTIONS.miscellaneousReceivables
      ),
      listSharedRecords<PayableInvoice>(client, COLLECTIONS.payableInvoices),
      ensureBankAccounts(),
      listSharedRecords<{
        id: string;
        propertyName?: string;
        status?: string;
        monthlyRent?: string | number;
      }>(client, COLLECTIONS.propertyTenants),
    ]);

  const bankBalancesByPropertyId: Record<string, number> = {};
  for (const acct of accounts) {
    if (acct.kind === "property" && acct.propertyId) {
      bankBalancesByPropertyId[acct.propertyId] = acct.balance;
    }
  }

  const previews = buildManagementFeePreviews({
    properties,
    receivables: rental,
    miscReceivables: misc,
    payables,
    propertyTenants,
    bankBalancesByPropertyId,
    monthsAgo,
  });

  return { client, misc, payables, previews };
}

async function collectFeeForProperty(input: {
  propertyId: string;
  monthsAgo: number;
}) {
  const { client, misc, payables, previews } = await loadFeeInputs(
    input.monthsAgo
  );
  const row = previews.find((r) => r.propertyId === input.propertyId);
  if (!row) return { error: "Property not found for this period." as const };
  if (row.feeAmount <= 0.009) {
    return { error: "Fee amount is zero for this property." as const };
  }

  const receivable =
    misc.find((r) => r.id === row.receivableId) ??
    buildManagementFeeReceivable(row);
  const payable =
    payables.find((p) => p.id === row.payableId) ??
    buildManagementFeePayable(row);

  if (!misc.some((r) => r.id === receivable.id)) {
    await upsertSharedRecord(
      client,
      COLLECTIONS.miscellaneousReceivables,
      receivable.id,
      receivable as unknown as Record<string, unknown>
    );
  }
  if (!payables.some((p) => p.id === payable.id)) {
    await upsertSharedRecord(
      client,
      COLLECTIONS.payableInvoices,
      payable.id,
      payable as unknown as Record<string, unknown>
    );
  }

  const balanceDue = round2(
    Math.max(0, receivable.amount - receivable.amountReceived)
  );
  if (balanceDue <= 0.009) {
    return { error: "This management fee is already collected." as const };
  }

  const sweep = await sweepManagementFee({
    propertyId: row.propertyId,
    feePercent: row.feePercent,
    rentBase: row.rentCollected,
    feeAmount: balanceDue,
    period: row.period,
  });
  if ("error" in sweep) return { error: sweep.error };

  const paidReceivable: Receivable = {
    ...receivable,
    amount: row.feeAmount,
    amountReceived: row.feeAmount,
    paymentMethod: "Property bank → CPMC Corporate",
    paymentReference: `Fee sweep · ${row.period}`,
  };
  const paidPayable: PayableInvoice = {
    ...payable,
    amount: row.feeAmount,
    amountPaid: row.feeAmount,
  };

  await upsertSharedRecord(
    client,
    COLLECTIONS.miscellaneousReceivables,
    paidReceivable.id,
    paidReceivable as unknown as Record<string, unknown>
  );
  await upsertSharedRecord(
    client,
    COLLECTIONS.payableInvoices,
    paidPayable.id,
    paidPayable as unknown as Record<string, unknown>
  );

  return {
    ok: true as const,
    fee: sweep.fee,
    propertyName: row.propertyName,
    period: row.period,
  };
}

/** Preview fee rows for a billing period (rent collected × contract fee). */
export async function previewManagementFeesAction(input: {
  monthsAgo?: number;
}) {
  await requireOpsModule("ar");
  const monthsAgo = input.monthsAgo ?? 0;
  const { previews } = await loadFeeInputs(monthsAgo);
  const creatable = previews.filter((r) => r.feeAmount > 0.009);
  const totalFee = round2(
    creatable.reduce((sum, r) => sum + r.feeAmount, 0)
  );
  return {
    ok: true as const,
    monthsAgo,
    period: previews[0]?.period ?? "",
    rows: previews,
    totalFee,
    propertyCount: creatable.length,
  };
}

/**
 * Generate CPMC AR (misc receivable) + property payable for every
 * managed property with a positive fee for the period.
 */
export async function generateManagementFeesAction(input: {
  monthsAgo?: number;
}) {
  await requireOpsModule("ar");
  const monthsAgo = input.monthsAgo ?? 0;
  const { client, misc, payables, previews } = await loadFeeInputs(monthsAgo);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const generated: ManagementFeePreviewRow[] = [];

  for (const row of previews) {
    if (row.feeAmount <= 0.009) {
      skipped += 1;
      continue;
    }
    if (row.alreadyCollected) {
      skipped += 1;
      continue;
    }

    const existingAr = misc.find((r) => r.id === row.receivableId) ?? null;
    const existingAp = payables.find((p) => p.id === row.payableId) ?? null;

    const receivable = buildManagementFeeReceivable(row, existingAr);
    const payable = buildManagementFeePayable(row, existingAp);

    await upsertSharedRecord(
      client,
      COLLECTIONS.miscellaneousReceivables,
      receivable.id,
      receivable as unknown as Record<string, unknown>
    );
    await upsertSharedRecord(
      client,
      COLLECTIONS.payableInvoices,
      payable.id,
      payable as unknown as Record<string, unknown>
    );

    if (existingAr || existingAp) updated += 1;
    else created += 1;
    generated.push(row);
  }

  return {
    ok: true as const,
    monthsAgo,
    period: previews[0]?.period ?? "",
    created,
    updated,
    skipped,
    totalFee: round2(generated.reduce((sum, r) => sum + r.feeAmount, 0)),
    count: generated.length,
  };
}

/**
 * Collect one property's management fee: property bank → CPMC corporate,
 * then mark the linked AR receivable and AP payable paid.
 */
export async function collectManagementFeeAction(input: {
  propertyId: string;
  monthsAgo?: number;
}) {
  await requireOpsModule("ar");
  return collectFeeForProperty({
    propertyId: input.propertyId,
    monthsAgo: input.monthsAgo ?? 0,
  });
}

/**
 * Collect every unpaid generated management fee for the period (best-effort).
 */
export async function collectAllManagementFeesAction(input: {
  monthsAgo?: number;
}) {
  await requireOpsModule("ar");
  const monthsAgo = input.monthsAgo ?? 0;
  const { previews } = await loadFeeInputs(monthsAgo);
  const targets = previews.filter(
    (r) => r.feeAmount > 0.009 && r.alreadyGenerated && !r.alreadyCollected
  );

  let collected = 0;
  let failed = 0;
  const errors: string[] = [];
  let total = 0;

  for (const row of targets) {
    const result = await collectFeeForProperty({
      propertyId: row.propertyId,
      monthsAgo,
    });
    if ("error" in result) {
      failed += 1;
      errors.push(`${row.propertyName}: ${result.error}`);
    } else {
      collected += 1;
      total = round2(total + result.fee);
    }
  }

  return {
    ok: true as const,
    collected,
    failed,
    total,
    errors,
    period: previews[0]?.period ?? "",
  };
}

/** Used by A/P pay flow when settling a management-fee payable invoice. */
export async function collectManagementFeeFromPayableAction(input: {
  payableId: string;
}) {
  await requireOpsModule("ap");
  if (!isManagementFeePayable({ id: input.payableId })) {
    return { error: "Not a management fee payable." as const };
  }

  const rest = input.payableId.slice(MGMT_FEE_AP_PREFIX.length);
  const colon = rest.lastIndexOf(":");
  if (colon < 0) {
    return { error: "Invalid management fee payable id." as const };
  }
  const propertyId = rest.slice(0, colon);
  const periodSlug = rest.slice(colon + 1);

  const match = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    .map((monthsAgo) => ({ monthsAgo, slug: monthSlug(monthsAgo) }))
    .find((o) => o.slug === periodSlug);
  if (!match) {
    return {
      error: "Could not resolve billing period for this payable." as const,
    };
  }

  return collectFeeForProperty({
    propertyId,
    monthsAgo: match.monthsAgo,
  });
}

/**
 * A/R approves a tenant-reported check → credit property bank, apply AR,
 * and notify the tenant portal.
 */
export async function approvePendingCheckPaymentAction(input: {
  pendingId: string;
  notes?: string;
}) {
  const session = await requireOpsModule("ar");
  const client = await createClient();
  const rows = await listSharedRecords<
    import("@/lib/pending-check-payments").PendingCheckPayment
  >(client, COLLECTIONS.pendingCheckPayments);
  const pending = rows.find((r) => r.id === input.pendingId);
  if (!pending) return { error: "Pending check payment not found." as const };
  if (pending.status !== "pending_ar") {
    return { error: `This check is already ${pending.status}.` as const };
  }

  const { postTenantRentPayment, ensureBankAccounts, resolvePropertyBankAccount } =
    await import("@/lib/bank-accounts");
  await ensureBankAccounts();
  const accounts = await ensureBankAccounts();
  const match = resolvePropertyBankAccount(accounts, {
    propertyId: pending.propertyId,
    propertyName: pending.propertyName,
  });
  if (!match) {
    return {
      error:
        "No property bank account matched this check. Link the unit to a managed property first." as const,
    };
  }

  const bankResult = await postTenantRentPayment({
    propertyId: match.propertyId,
    propertyName: match.propertyName,
    tenantName: pending.tenantName,
    tenantEmail: pending.tenantEmail,
    unit: pending.unit,
    amount: pending.amount,
    method: `Check (${pending.delivery} — A/R approved)`,
  });
  if ("error" in bankResult) return bankResult;

  // Apply to open rental receivables (same approach as portal debit pay)
  try {
    const receivables = await listSharedRecords<Receivable>(
      client,
      COLLECTIONS.rentalReceivables
    );
    const tenantId = pending.tenantRecordId || "";
    const propKey = match.propertyName.toLowerCase();
    const unitKey = (pending.unit || "").trim().toLowerCase();
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

    let remaining = pending.amount;
    for (const row of open) {
      if (remaining <= 0) break;
      const bal = Math.max(0, row.amount - row.amountReceived);
      const apply = Math.min(bal, remaining);
      if (apply <= 0) continue;
      await upsertSharedRecord(client, COLLECTIONS.rentalReceivables, row.id, {
        ...row,
        amountReceived: Math.round((row.amountReceived + apply) * 100) / 100,
        paymentMethod: "Check",
        paymentReference: bankResult.txn.id,
        property: row.property || match.propertyName,
      } as unknown as Record<string, unknown>);
      remaining = Math.round((remaining - apply) * 100) / 100;
    }
  } catch {
    /* AR apply best-effort */
  }

  const confirmationNumber = `HL-CHK-${bankResult.txn.id.slice(0, 8).toUpperCase()}`;
  const reviewedBy =
    session.kind === "admin"
      ? "A/R admin"
      : session.employee.email ||
        `${session.employee.firstName} ${session.employee.lastName}`.trim() ||
        "Accounts Receivable";

  await upsertSharedRecord(client, COLLECTIONS.pendingCheckPayments, pending.id, {
    ...pending,
    status: "approved",
    reviewedAt: new Date().toISOString(),
    reviewedBy: String(reviewedBy),
    reviewNotes: (input.notes || "").trim(),
    bankTxnId: bankResult.txn.id,
    confirmationNumber,
  } as unknown as Record<string, unknown>);

  try {
    const { postTenantPortalMessage } = await import(
      "@/lib/tenant-portal-accounts"
    );
    await postTenantPortalMessage({
      tenantAccountId: pending.tenantAccountId,
      tenantEmail: pending.tenantEmail,
      fromRole: "system",
      subject: "Check payment approved",
      body: [
        `Accounts Receivable approved your check payment of $${pending.amount.toFixed(2)} for ${pending.propertyName}${pending.unit ? ` · ${pending.unit}` : ""}.`,
        `Confirmation: ${confirmationNumber}`,
        "Funds have been deposited to the property operating account and applied to your rent balance.",
      ].join("\n"),
      relatedApplicationId: "",
      availabilityJson: "",
    });
  } catch {
    /* notify best-effort */
  }

  return {
    ok: true as const,
    confirmationNumber,
    accountBalance: bankResult.account.balance,
    propertyName: match.propertyName,
  };
}

export async function declinePendingCheckPaymentAction(input: {
  pendingId: string;
  notes?: string;
}) {
  const session = await requireOpsModule("ar");
  const client = await createClient();
  const rows = await listSharedRecords<
    import("@/lib/pending-check-payments").PendingCheckPayment
  >(client, COLLECTIONS.pendingCheckPayments);
  const pending = rows.find((r) => r.id === input.pendingId);
  if (!pending) return { error: "Pending check payment not found." as const };
  if (pending.status !== "pending_ar") {
    return { error: `This check is already ${pending.status}.` as const };
  }

  const reviewedBy =
    session.kind === "admin"
      ? "A/R admin"
      : session.employee.email ||
        `${session.employee.firstName} ${session.employee.lastName}`.trim() ||
        "Accounts Receivable";

  await upsertSharedRecord(client, COLLECTIONS.pendingCheckPayments, pending.id, {
    ...pending,
    status: "declined",
    reviewedAt: new Date().toISOString(),
    reviewedBy: String(reviewedBy),
    reviewNotes: (input.notes || "").trim() || "Declined by Accounts Receivable",
  } as unknown as Record<string, unknown>);

  try {
    const { releasePortalBalanceClaim } = await import(
      "@/lib/portal/payment-guard"
    );
    await releasePortalBalanceClaim({
      tenantAccountId: pending.tenantAccountId,
      tenantEmail: pending.tenantEmail,
      tenantName: pending.tenantName,
      tenantRecordId: pending.tenantRecordId,
      propertyId: pending.propertyId,
      propertyName: pending.propertyName,
      unit: pending.unit,
    });
  } catch {
    /* claim release best-effort */
  }

  try {
    const { postTenantPortalMessage } = await import(
      "@/lib/tenant-portal-accounts"
    );
    await postTenantPortalMessage({
      tenantAccountId: pending.tenantAccountId,
      tenantEmail: pending.tenantEmail,
      fromRole: "system",
      subject: "Check payment needs attention",
      body: [
        `Accounts Receivable could not approve your check payment of $${pending.amount.toFixed(2)} for ${pending.propertyName}${pending.unit ? ` · ${pending.unit}` : ""}.`,
        input.notes?.trim()
          ? `Note from A/R: ${input.notes.trim()}`
          : "Please contact management or resubmit after delivering the check.",
      ].join("\n"),
      relatedApplicationId: "",
      availabilityJson: "",
    });
  } catch {
    /* notify best-effort */
  }

  return { ok: true as const };
}
