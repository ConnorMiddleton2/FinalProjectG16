import { getMockLeaseInformation } from "@/lib/portal/lease-mock";
import type { Lease } from "@/lib/portal/models";
import { sessionOwnsDemoFixtures } from "@/lib/portal/tenant-scope";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

/**
 * Tenant-facing lease information service.
 * Never returns private management notes.
 *
 * BACKEND_TODO: GET /api/tenant/lease constrained to session tenant.
 */
export async function getLease(): Promise<ServiceResult<Lease | null>> {
  const forced = assertNotForcedError("getLease");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency();

    const live = await tryLoadLiveLease();
    if (live === "empty") return ok(null, "live");
    if (live) return ok(live, "live");

    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok(null, "mock");
    }
    return ok(getMockLeaseInformation(), "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load your lease information.",
      "network"
    );
  }
}

export function getLeaseDemoFixture(): Lease {
  return getMockLeaseInformation();
}

export function emptyLeaseMessage(): string {
  return "No active lease is linked to this portal account yet. When Harborline connects your lease, terms and unit details will appear here.";
}

async function tryLoadLiveLease(): Promise<Lease | "empty" | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-supabase") || key === "REPLACE_ME") {
    return null;
  }
  return null;
}

export function leaseUnavailable(): ServiceResult<Lease> {
  return fail(emptyLeaseMessage(), "not_found");
}
