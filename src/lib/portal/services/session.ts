import { getPortalTenantSessionClient } from "@/lib/portal/auth-client";
import { getInjectedPortalSession } from "@/lib/portal/portal-session-inject";
import type { PortalTenantSession } from "@/lib/portal/auth";
import { denyUnauthenticated } from "@/lib/portal/tenant-scope";
import { fail, ok, type ServiceResult } from "@/lib/portal/services/shared";

export type { PortalTenantSession };

/**
 * Resolves the current-tenant session for portal services.
 * Prefer the server-injected layout session (tenant_accounts cookie users)
 * so client hooks do not fail when /api/portal/session is unavailable.
 */
export async function requirePortalServiceSession(): Promise<
  ServiceResult<PortalTenantSession>
> {
  const injected = getInjectedPortalSession();
  if (injected) {
    return ok(injected, "live");
  }

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
