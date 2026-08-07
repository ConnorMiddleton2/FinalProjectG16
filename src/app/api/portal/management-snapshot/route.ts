import { NextResponse } from "next/server";
import { getCurrentPortalTenant } from "@/lib/portal/auth-server";
import {
  loadManagementTenantSnapshot,
  snapshotToDashboard,
  snapshotToLease,
  snapshotToMakePaymentContext,
  snapshotToPaymentHistory,
  snapshotToPaymentsOverview,
} from "@/lib/portal/management-tenant-data";
import { loadPendingCheckForSession } from "@/lib/portal/pending-check-for-session";
import { buildLivePaymentsFromSession } from "@/lib/portal/live-lease-from-session";

/**
 * Live Management-backed lease / AR snapshot for the signed-in tenant portal.
 */
export async function GET() {
  const session = await getCurrentPortalTenant();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const pendingCheck = await loadPendingCheckForSession(session);
  const snap = await loadManagementTenantSnapshot(session);

  if (!snap) {
    const sessionPayments = buildLivePaymentsFromSession(session);
    return NextResponse.json({
      snapshot: null,
      payments: sessionPayments
        ? { ...sessionPayments, pendingCheck }
        : null,
      pendingCheck,
    });
  }

  const payments = {
    ...snapshotToPaymentsOverview(snap),
    pendingCheck,
  };

  return NextResponse.json({
    snapshot: {
      propertyId: snap.propertyId,
      propertyName: snap.propertyName,
      unitLabel: snap.unitLabel,
      monthlyRent: snap.monthlyRent,
      amountDue: snap.amountDue,
      currentRentDue: snap.currentRentDue,
      overdueAmount: snap.overdueAmount,
      paymentStatus: snap.paymentStatus,
      dueDate: snap.dueDate,
      leaseStart: snap.leaseStart,
      leaseEnd: snap.leaseEnd,
      tenantRecordId: snap.tenantRecordId,
    },
    dashboard: snapshotToDashboard(snap, session.displayName),
    lease: snapshotToLease(snap, session.displayName),
    payments,
    makePayment: snapshotToMakePaymentContext(snap),
    history: snapshotToPaymentHistory(snap),
    pendingCheck,
  });
}
