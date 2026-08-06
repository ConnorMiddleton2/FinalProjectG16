/**
 * Tenant-scoped access helpers for portal services.
 *
 * Frontend filtering is defense-in-depth only. Real isolation must be
 * enforced by backend queries / RLS — see BACKEND_AUTHORIZATION.md.
 */

import type { PortalTenantSession } from "@/lib/portal/auth";
import { DEMO_TENANT_ID, OTHER_TENANT_ID } from "@/lib/portal/documents-types";
import { fail, type ServiceResult } from "@/lib/portal/services/shared";

export { DEMO_TENANT_ID, OTHER_TENANT_ID };

/** Marker on mock records owned by a single tenant scope. */
export type TenantOwned = {
  tenantScopeId: string;
};

export function belongsToTenant(
  resourceTenantScopeId: string | undefined,
  sessionTenantScopeId: string
): boolean {
  if (!resourceTenantScopeId) return false;
  return resourceTenantScopeId === sessionTenantScopeId;
}

export function filterForTenant<T extends TenantOwned>(
  items: T[],
  sessionTenantScopeId: string
): T[] {
  return items.filter((item) =>
    belongsToTenant(item.tenantScopeId, sessionTenantScopeId)
  );
}

/**
 * Demo Pier 12 fixtures are tagged with DEMO_TENANT_ID.
 * Other authenticated tenants receive empty results (not other tenants' rows).
 */
export function demoFixturesForSession<T>(
  session: PortalTenantSession,
  demoItems: T[],
  empty: T[] = []
): T[] {
  if (session.tenantScopeId !== DEMO_TENANT_ID) return empty;
  return demoItems;
}

export function sessionOwnsDemoFixtures(session: PortalTenantSession): boolean {
  return session.tenantScopeId === DEMO_TENANT_ID;
}

export function denyCrossTenant<T>(
  message = "You are not authorized to access this tenant record."
): ServiceResult<T> {
  return fail(message, "unauthorized");
}

export function denyUnauthenticated<T>(
  message = "Sign in with a current-tenant account to continue."
): ServiceResult<T> {
  return fail(message, "unauthorized");
}

/** Default scope id for Pier 12 demo fixtures. */
export const DEMO_FIXTURE_SCOPE_ID = DEMO_TENANT_ID;
