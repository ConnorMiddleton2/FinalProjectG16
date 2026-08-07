import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  deleteSharedRecord,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { BankTransaction } from "@/lib/bank-accounts-shared";
import type { PendingCheckPayment } from "@/lib/pending-check-payments";
import {
  normalizeCustomerId,
  openReceivableAmount,
  type RentalReceivable,
} from "@/lib/rental-receivables";

export type PortalPayIdentity = {
  tenantAccountId: string;
  tenantEmail: string;
  tenantName: string;
  tenantRecordId: string;
  propertyId: string;
  propertyName: string;
  unit: string;
};

export type PortalBalanceClaim = {
  id: string;
  tenantAccountId: string;
  tenantEmail: string;
  period: string;
  amount: number;
  method: "debit_card" | "check";
  status: "active" | "released";
  createdAt: string;
};

function billingPeriod(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function claimIdFor(identity: PortalPayIdentity, period = billingPeriod()) {
  return `bal-${identity.tenantAccountId}-${period}`;
}

function matchesTenantReceivable(
  r: RentalReceivable,
  identity: PortalPayIdentity
) {
  const tenantId = identity.tenantRecordId.trim();
  if (
    tenantId &&
    normalizeCustomerId(r.customerId) === normalizeCustomerId(tenantId)
  ) {
    return true;
  }
  const propKey = identity.propertyName.toLowerCase();
  const unitKey = identity.unit.trim().toLowerCase();
  const prop = (r.property || "").toLowerCase();
  const unitMatch =
    !unitKey || (r.unit || "").trim().toLowerCase() === unitKey;
  const propMatch =
    !propKey ||
    prop.includes(propKey) ||
    propKey.includes(prop) ||
    prop.includes(propKey.split(" ")[0] || "");
  return Boolean(propKey || unitKey) && propMatch && unitMatch;
}

/** Open rent AR for this tenant/unit, or null when no matching rows exist. */
export async function getOpenRentBalanceForTenant(
  identity: PortalPayIdentity
): Promise<number | null> {
  const client = await createClient();
  const receivables = await listSharedRecords<RentalReceivable>(
    client,
    COLLECTIONS.rentalReceivables
  );
  const matched = receivables.filter((r) =>
    matchesTenantReceivable(r, identity)
  );
  if (matched.length === 0) return null;
  return matched.reduce((sum, r) => sum + openReceivableAmount(r), 0);
}

export async function findPendingCheckForTenant(
  identity: PortalPayIdentity
): Promise<PendingCheckPayment | null> {
  const client = await createClient();
  const rows = await listSharedRecords<PendingCheckPayment>(
    client,
    COLLECTIONS.pendingCheckPayments
  );
  const email = identity.tenantEmail.toLowerCase();
  return (
    rows.find(
      (p) =>
        p.status === "pending_ar" &&
        (p.tenantAccountId === identity.tenantAccountId ||
          (p.tenantEmail || "").toLowerCase() === email)
    ) || null
  );
}

export async function findActiveBalanceClaim(
  identity: PortalPayIdentity
): Promise<PortalBalanceClaim | null> {
  const client = await createClient();
  const rows = await listSharedRecords<PortalBalanceClaim>(
    client,
    COLLECTIONS.portalBalanceClaims
  );
  const id = claimIdFor(identity);
  const byId = rows.find((r) => r.id === id && r.status === "active");
  if (byId) return byId;
  const email = identity.tenantEmail.toLowerCase();
  return (
    rows.find(
      (r) =>
        r.status === "active" &&
        r.period === billingPeriod() &&
        (r.tenantAccountId === identity.tenantAccountId ||
          (r.tenantEmail || "").toLowerCase() === email)
    ) || null
  );
}

/** Release balance claim so tenant can pay again (e.g. check declined). */
export async function releasePortalBalanceClaim(
  identity: PortalPayIdentity
): Promise<void> {
  const client = await createClient();
  const id = claimIdFor(identity);
  try {
    const rows = await listSharedRecords<PortalBalanceClaim>(
      client,
      COLLECTIONS.portalBalanceClaims
    );
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    await upsertSharedRecord(client, COLLECTIONS.portalBalanceClaims, id, {
      ...row,
      status: "released",
    } as unknown as Record<string, unknown>);
  } catch {
    try {
      await deleteSharedRecord(client, COLLECTIONS.portalBalanceClaims, id);
    } catch {
      /* best-effort */
    }
  }
}

async function claimPortalBalance(
  identity: PortalPayIdentity,
  amount: number,
  method: "debit_card" | "check"
): Promise<{ error: string } | { ok: true }> {
  const existing = await findActiveBalanceClaim(identity);
  if (existing) {
    return {
      error:
        existing.method === "check"
          ? "A check payment for this balance is already on file. You cannot submit another payment until Accounts Receivable finishes review."
          : "This balance was already paid. You cannot submit another payment for the same period.",
    };
  }

  const client = await createClient();
  const period = billingPeriod();
  const id = claimIdFor(identity, period);
  const row: PortalBalanceClaim = {
    id,
    tenantAccountId: identity.tenantAccountId,
    tenantEmail: identity.tenantEmail,
    period,
    amount: Math.round(amount * 100) / 100,
    method,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.portalBalanceClaims,
    id,
    row as unknown as Record<string, unknown>
  );
  return { ok: true };
}

/**
 * Detect a bank rent credit already posted for this tenant/unit in the
 * current billing period (covers lease-fallback when AR rows are missing).
 */
export async function findRecentRentPaymentForTenant(
  identity: PortalPayIdentity
): Promise<BankTransaction | null> {
  const client = await createClient();
  const txns = await listSharedRecords<BankTransaction>(
    client,
    COLLECTIONS.bankTransactions
  );
  const period = billingPeriod();
  const unitKey = identity.unit.trim().toLowerCase();
  const nameKey = identity.tenantName.trim().toLowerCase();
  const propId = identity.propertyId.trim();
  const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;

  const hits = txns
    .filter((t) => {
      if (t.kind !== "tenant_rent" || t.direction !== "credit") return false;
      if (propId && t.propertyId && t.propertyId !== propId) return false;
      const inPeriod =
        (t.period || "").startsWith(period) ||
        new Date(t.createdAt).getTime() >= cutoff;
      if (!inPeriod) return false;
      const memo = (t.memo || "").toLowerCase();
      const counter = (t.counterparty || "").toLowerCase();
      const unitOk = !unitKey || memo.includes(unitKey);
      const nameOk =
        !nameKey || counter.includes(nameKey) || memo.includes(nameKey);
      return unitOk && nameOk;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return hits[0] || null;
}

/**
 * Server guard: tenant may only settle the current balance once
 * (debit post or check pending A/R — not both, not twice).
 * Claims the balance when allowed so a second concurrent submit fails.
 */
export async function assertTenantCanSubmitBalancePayment(
  identity: PortalPayIdentity,
  amount: number,
  via: "debit_card" | "check"
): Promise<{ error: string } | { ok: true; openBalance: number | null }> {
  if (amount <= 0.009) {
    return { error: "There is no balance due to pay." };
  }

  const pending = await findPendingCheckForTenant(identity);
  if (pending) {
    return {
      error:
        via === "check"
          ? "You already have a check payment pending Accounts Receivable review."
          : "A check payment is already awaiting Accounts Receivable approval. You cannot also pay by debit until that is resolved.",
    };
  }

  const claim = await findActiveBalanceClaim(identity);
  if (claim) {
    return {
      error:
        claim.method === "check"
          ? "A check payment for this balance is already on file. Wait for Accounts Receivable before paying again."
          : "This balance was already paid. You cannot submit another payment for the same period.",
    };
  }

  const openBalance = await getOpenRentBalanceForTenant(identity);
  if (openBalance != null) {
    if (openBalance <= 0.009) {
      return {
        error:
          "Your rent balance is already paid. You cannot submit another payment for this period.",
      };
    }
    if (amount > openBalance + 0.05) {
      return {
        error: `Your open balance is only ${money(openBalance)}. Pay that amount once — do not overpay.`,
      };
    }
  }

  const recent = await findRecentRentPaymentForTenant(identity);
  if (recent) {
    return {
      error:
        "A rent payment for this unit was already recorded for the current period. You cannot pay the same balance again.",
    };
  }

  const claimed = await claimPortalBalance(identity, amount, via);
  if ("error" in claimed) return claimed;

  return { ok: true, openBalance };
}
