import { createClient } from "@/lib/supabase/server";
import { COLLECTIONS, listSharedRecords } from "@/lib/shared-store";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { PendingCheckPayment } from "@/lib/pending-check-payments";
import type { PaymentsOverview } from "@/lib/portal/payments-types";

function moneyExact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Latest pending_ar (or most recent) check payment for this portal session. */
export async function loadPendingCheckForSession(
  session: PortalTenantSession
): Promise<PaymentsOverview["pendingCheck"]> {
  try {
    const client = await createClient();
    const rows = await listSharedRecords<PendingCheckPayment>(
      client,
      COLLECTIONS.pendingCheckPayments
    );
    const accountId = session.tenantAccountId || session.userId;
    const email = session.email.toLowerCase();
    const mine = rows
      .filter(
        (p) =>
          p.tenantAccountId === accountId ||
          (p.tenantEmail || "").toLowerCase() === email
      )
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    const pending = mine.find((p) => p.status === "pending_ar") || mine[0];
    if (!pending) return null;

    return {
      id: pending.id,
      amount: moneyExact(pending.amount),
      delivery: pending.delivery,
      submittedAt: pending.submittedAt,
      status: pending.status,
    };
  } catch {
    return null;
  }
}
