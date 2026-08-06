/**
 * Shared current-tenant portal auth constants and path helpers.
 * Safe to import from client or server.
 */

import { DEMO_TENANT_ID } from "@/lib/portal/documents-types";
import type { UserRole } from "@/lib/types";

export const CURRENT_TENANT_ROLE = "tenant" as const;

export const PORTAL_HOME_PATH = "/portal";
export const PORTAL_LOGIN_PATH = "/login";
export const PORTAL_UNAUTHORIZED_PATH = "/portal/unauthorized";
export const PORTAL_APPLY_PATH = "/portal/apply";
/** Public chooser: current tenant vs future tenant after welcome CTA. */
export const PORTAL_START_PATH = "/portal/start";

export type PortalTenantSession = {
  userId: string;
  email: string;
  displayName: string;
  role: typeof CURRENT_TENANT_ROLE;
  /**
   * ACL / lease-party scope id.
   * Used to filter tenant-owned records. Never accept this from the client
   * as an override — always derive from the authenticated session.
   */
  tenantScopeId: string;
};

export function isPortalPublicPath(pathname: string): boolean {
  return (
    pathname === PORTAL_START_PATH ||
    pathname.startsWith(`${PORTAL_START_PATH}/`) ||
    pathname === PORTAL_APPLY_PATH ||
    pathname.startsWith(`${PORTAL_APPLY_PATH}/`) ||
    pathname === PORTAL_UNAUTHORIZED_PATH
  );
}

export function isPortalPrivatePath(pathname: string): boolean {
  if (pathname !== PORTAL_HOME_PATH && !pathname.startsWith(`${PORTAL_HOME_PATH}/`)) {
    return false;
  }
  return !isPortalPublicPath(pathname);
}

/**
 * Maps an authenticated user to a tenant ACL scope.
 *
 * BACKEND_TODO: replace with lease_parties / tenant_members lookup
 * (auth.uid() → tenant_id). Do not trust client-supplied tenant ids.
 */
export function resolveTenantScopeId(user: {
  id: string;
  email?: string | null;
}): string {
  const email = (user.email ?? "").toLowerCase().trim();
  const demoEmails = (
    process.env.NEXT_PUBLIC_PORTAL_DEMO_TENANT_EMAILS ??
    "alex.tenant@example.com"
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (demoEmails.includes(email) || email.endsWith("@harborline.demo")) {
    return DEMO_TENANT_ID;
  }

  // Isolated scope per auth user — cannot read DEMO_TENANT_ID fixtures.
  return `tenant-${user.id}`;
}

export function portalLoginRedirect(nextPath?: string): string {
  if (!nextPath || !isPortalPrivatePath(nextPath)) {
    return `${PORTAL_LOGIN_PATH}?next=${encodeURIComponent(PORTAL_HOME_PATH)}`;
  }
  return `${PORTAL_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`;
}

export type { UserRole };
