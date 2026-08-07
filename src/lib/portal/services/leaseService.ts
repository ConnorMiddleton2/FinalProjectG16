import type { Lease } from "@/lib/portal/models";
import { buildLiveLeaseFromSession } from "@/lib/portal/live-lease-from-session";
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
 * Tenant-facing lease information — prefers Management unit / tenant records.
 */
export async function getLease(): Promise<ServiceResult<Lease | null>> {
  const forced = assertNotForcedError("getLease");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(200);

    const fromMgmt = await fetchManagementLease();
    if (fromMgmt) return ok(fromMgmt, "live");

    const fromAccount = buildLiveLeaseFromSession(auth.data);
    if (fromAccount) return ok(fromAccount, "live");

    return ok(null, "live");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load your lease information.",
      "network"
    );
  }
}

export function getLeaseDemoFixture(): Lease | null {
  return null;
}

export function emptyLeaseMessage(): string {
  return "No active lease is linked to this portal account yet. When CPMC connects your lease, terms and unit details will appear here.";
}

export function leaseUnavailable(): ServiceResult<Lease> {
  return fail(emptyLeaseMessage(), "not_found");
}

async function fetchManagementLease(): Promise<Lease | null> {
  try {
    const res = await fetch("/api/portal/management-snapshot", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lease?: Lease | null };
    return data.lease ?? null;
  } catch {
    return null;
  }
}
