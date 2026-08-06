import { getMockTenantProfile } from "@/lib/portal/profile-mock";
import {
  loadStoredProfile,
  saveStoredProfile,
} from "@/lib/portal/profile-store";
import type {
  Tenant,
  TenantProfileEditable,
} from "@/lib/portal/models";
import { sessionOwnsDemoFixtures } from "@/lib/portal/tenant-scope";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

/**
 * Current-tenant profile / identity service.
 *
 * BACKEND_TODO: replace mock + sessionStorage with:
 *   GET  /api/tenant/me  (or Supabase `profiles` + lease join)
 *   PATCH /api/tenant/me (editable contact fields only)
 */
export async function getTenant(): Promise<ServiceResult<Tenant>> {
  const forced = assertNotForcedError("getTenant");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    // BACKEND_TODO: profile for auth.uid() only
    const stored = loadStoredProfile(auth.data.tenantScopeId);
    if (stored) return ok(stored, "mock");
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok(
        {
          legalName: auth.data.displayName,
          propertyName: "Unlinked property",
          unitNumber: "—",
          tenantId: auth.data.tenantScopeId,
          leaseStatus: "Active",
          preferredName: auth.data.displayName,
          email: auth.data.email,
          phone: "",
          preferredContactMethod: "email",
          emergencyContact: { name: "", phone: "", relationship: "" },
          vehicle: {
            hasVehicle: false,
            makeModel: "",
            color: "",
            licensePlate: "",
            parkingPermit: "",
          },
          pets: { hasPets: false, summary: "", details: "" },
          communication: {
            emailUpdates: true,
            smsUpdates: false,
            portalMessages: true,
            phoneCalls: false,
            marketingOptIn: false,
          },
        },
        "mock"
      );
    }
    return ok(getMockTenantProfile(), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load your profile.", "network");
  }
}

export async function updateTenant(
  identity: Pick<Tenant, "legalName" | "tenantId" | "propertyName" | "unitNumber" | "leaseStatus">,
  editable: TenantProfileEditable
): Promise<ServiceResult<Tenant>> {
  const forced = assertNotForcedError("updateTenant");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    // BACKEND_TODO: reject identity field changes server-side; only persist editable.
    const next: Tenant = { ...identity, ...editable };
    saveStoredProfile(next, auth.data.tenantScopeId);
    return ok(next, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not save your profile.", "network");
  }
}

/** Sync demo helper — no latency. Prefer getTenant() in production paths. */
export function getTenantDemoFixture(): Tenant {
  return getMockTenantProfile();
}

export function emptyTenantMessage(): string {
  return "No tenant profile is linked to this portal account yet.";
}

/** Explicit not-found style failure for empty live responses. */
export function tenantNotFound(): ServiceResult<Tenant> {
  return fail(emptyTenantMessage(), "not_found");
}
