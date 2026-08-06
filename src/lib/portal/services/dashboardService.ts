import {
  getEmptyTenantDashboard,
  getMockTenantDashboard,
} from "@/lib/portal/dashboard-mock";
import type { TenantDashboardData } from "@/lib/portal/models";
import {
  demoFixturesForSession,
  sessionOwnsDemoFixtures,
} from "@/lib/portal/tenant-scope";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

/**
 * Current-tenant dashboard aggregate service.
 *
 * BACKEND_TODO:
 *   GET /api/tenant/dashboard — scoped to auth.uid() lease membership
 */

export async function getDashboard(): Promise<
  ServiceResult<TenantDashboardData>
> {
  const forced = assertNotForcedError("getDashboard");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(450);

    const live = await tryLoadLiveDashboard();
    if (live === "empty") {
      return ok(getEmptyTenantDashboard(), "live");
    }
    if (live) {
      return ok(live, "live");
    }

    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok(getEmptyTenantDashboard(), "mock");
    }
    return ok(getMockTenantDashboard(), "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load your tenant dashboard.",
      "network"
    );
  }
}

export function getDashboardDemoFixture(): TenantDashboardData {
  return getMockTenantDashboard();
}

export function getEmptyDashboardFixture(): TenantDashboardData {
  return getEmptyTenantDashboard();
}

async function tryLoadLiveDashboard(): Promise<
  TenantDashboardData | "empty" | null
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-supabase") || key === "REPLACE_ME") {
    return null;
  }
  return null;
}
