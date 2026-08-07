import { getEmptyTenantDashboard } from "@/lib/portal/dashboard-mock";
import type { TenantDashboardData } from "@/lib/portal/models";
import { buildLiveDashboardFromSession } from "@/lib/portal/live-lease-from-session";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

/**
 * Current-tenant dashboard — prefers Management AR / unit rent records.
 */

export async function getDashboard(): Promise<
  ServiceResult<TenantDashboardData>
> {
  const forced = assertNotForcedError("getDashboard");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(200);

    const fromMgmt = await fetchManagementDashboard();
    if (fromMgmt) {
      return ok(fromMgmt, "live");
    }

    const fromAccount = buildLiveDashboardFromSession(auth.data);
    if (fromAccount) {
      return ok(fromAccount, "live");
    }

    return ok(getEmptyTenantDashboard(), "live");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load your tenant dashboard.",
      "network"
    );
  }
}

export function getDashboardDemoFixture(): TenantDashboardData {
  return getEmptyTenantDashboard();
}

export function getEmptyDashboardFixture(): TenantDashboardData {
  return getEmptyTenantDashboard();
}

async function fetchManagementDashboard(): Promise<TenantDashboardData | null> {
  try {
    const res = await fetch("/api/portal/management-snapshot", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      dashboard?: TenantDashboardData | null;
    };
    return data.dashboard ?? null;
  } catch {
    return null;
  }
}
