import { NextResponse } from "next/server";
import { getCurrentPortalTenant } from "@/lib/portal/auth-server";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
} from "@/lib/shared-store";
import type { SmTenantApplication } from "@/lib/sales-marketing";
import {
  getTenantPortalSession,
  saveTenantAccount,
} from "@/lib/tenant-portal-accounts";
import { portalSessionFromTenantAccount } from "@/lib/portal/tenant-account-session";
import type { TenantAccount } from "@/lib/tenant-portal-accounts";

function isCompletedApplication(a: SmTenantApplication) {
  return (
    a.status === "Completed" ||
    Boolean(a.movedInAt) ||
    a.leasePacketStatus === "approved" ||
    a.smStatus === "approved"
  );
}

/**
 * If S&M already completed the lease but the account row is missing
 * property/unit (or still pending_*), backfill from the completed application.
 */
async function ensureActiveLeaseOnAccount() {
  const account = await getTenantPortalSession();
  if (!account) return null;

  const alreadyLinked =
    account.status === "active" && account.propertyName && account.unit;
  if (alreadyLinked) {
    return portalSessionFromTenantAccount(account);
  }

  const client = await createClient();
  const apps = await listSharedRecords<SmTenantApplication>(
    client,
    COLLECTIONS.tenantApplications
  );
  const completed = apps
    .filter(
      (a) =>
        (a.email.toLowerCase() === account.email.toLowerCase() ||
          (a as { tenantAccountId?: string }).tenantAccountId === account.id) &&
        isCompletedApplication(a)
    )
    .sort(
      (a, b) =>
        new Date(b.movedInAt || b.createdAt).getTime() -
        new Date(a.movedInAt || a.createdAt).getTime()
    )[0];

  if (!completed) {
    return portalSessionFromTenantAccount(account);
  }

  const tenantRecordId =
    completed.unitId &&
    !String(account.tenantRecordId || "").startsWith("ten-movein-")
      ? `ten-movein-${completed.unitId}`
      : account.tenantRecordId ||
        (completed.unitId ? `ten-movein-${completed.unitId}` : completed.id);

  const updated: TenantAccount = {
    ...account,
    status: "active",
    propertyId: completed.propertyId || account.propertyId,
    propertyName:
      completed.building ||
      completed.property ||
      account.propertyName ||
      "Assigned property",
    unit: completed.unitLabel || account.unit || "—",
    monthlyRent: completed.proposedRent ?? account.monthlyRent,
    tenantRecordId,
    updatedAt: new Date().toISOString(),
  };
  await saveTenantAccount(updated);
  return portalSessionFromTenantAccount(updated);
}

/** Client-readable portal session (for hooks that cannot read httpOnly cookies). */
export async function GET() {
  try {
    let session = null;
    try {
      session = await ensureActiveLeaseOnAccount();
    } catch {
      /* backfill is best-effort */
    }
    if (!session) {
      session = await getCurrentPortalTenant();
    }
    if (!session) {
      return NextResponse.json({ session: null }, { status: 401 });
    }
    return NextResponse.json({ session });
  } catch {
    try {
      const fallback = await getCurrentPortalTenant();
      if (fallback) {
        return NextResponse.json({ session: fallback });
      }
    } catch {
      /* ignore */
    }
    return NextResponse.json({ session: null }, { status: 401 });
  }
}
