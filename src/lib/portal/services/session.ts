import { getPortalTenantSessionClient } from "@/lib/portal/auth-client";
import type { PortalTenantSession } from "@/lib/portal/auth";
import { denyUnauthenticated } from "@/lib/portal/tenant-scope";
import { fail, ok, type ServiceResult } from "@/lib/portal/services/shared";

export type { PortalTenantSession };

/**
 * Resolves the current-tenant session for portal services.
 * Callers must not accept a client-supplied tenantScopeId override.
 */
export async function requirePortalServiceSession(): Promise<
  ServiceResult<PortalTenantSession>
> {
  const session = await getPortalTenantSessionClient();
  if (!session) {
    return denyUnauthenticated();
  }
  return ok(session, "live");
}

export function wrongTenantResult<T>(): ServiceResult<T> {
  return fail(
    "You are not authorized to access another tenant’s records.",
    "unauthorized"
  );
}
