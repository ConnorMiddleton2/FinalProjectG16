/**
 * Shared current-tenant portal auth constants and path helpers.
 * Safe to import from client or server.
 */

import { DEMO_TENANT_ID } from "@/lib/portal/documents-types";
import type { UserRole } from "@/lib/types";
import { isFutureTenantPublicPath } from "@/lib/portal/future/paths";

export const CURRENT_TENANT_ROLE = "tenant" as const;

export const PORTAL_HOME_PATH = "/portal";
/** Current-tenant login (existing AuthForm at /login). */
export const PORTAL_LOGIN_PATH = "/login";
/** Future-tenant login / signup (dedicated portal auth UI). */
export const FUTURE_TENANT_LOGIN_PATH = "/portal/login";
export const FUTURE_TENANT_SIGNUP_PATH = "/portal/signup";
export const PORTAL_SIGNUP_PATH = FUTURE_TENANT_SIGNUP_PATH;
export const PORTAL_RESET_PASSWORD_PATH = "/portal/reset-password";
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
  /**
   * Future = approved pre-move-in; current = active lease tenant.
   * Defaults to current for existing demo / legacy tenants.
   */
  lifecycle: "future" | "current";
};

/**
 * Paths under /portal that do not require a portal session.
 * Future-tenant browse (landing, units, tours, saved) stays public.
 * Login/signup/reset and the start chooser stay public.
 */
export function isPortalPublicPath(pathname: string): boolean {
  return (
    pathname === PORTAL_START_PATH ||
    pathname.startsWith(`${PORTAL_START_PATH}/`) ||
    pathname === PORTAL_UNAUTHORIZED_PATH ||
    pathname === FUTURE_TENANT_LOGIN_PATH ||
    pathname.startsWith(`${FUTURE_TENANT_LOGIN_PATH}/`) ||
    pathname === FUTURE_TENANT_SIGNUP_PATH ||
    pathname.startsWith(`${FUTURE_TENANT_SIGNUP_PATH}/`) ||
    pathname === PORTAL_RESET_PASSWORD_PATH ||
    pathname.startsWith(`${PORTAL_RESET_PASSWORD_PATH}/`) ||
    isFutureTenantPublicPath(pathname)
  );
}

export function isPortalPrivatePath(pathname: string): boolean {
  if (pathname !== PORTAL_HOME_PATH && !pathname.startsWith(`${PORTAL_HOME_PATH}/`)) {
    return false;
  }
  return !isPortalPublicPath(pathname);
}

export function isFutureTenantApplyPath(pathname: string): boolean {
  return (
    pathname === PORTAL_APPLY_PATH ||
    pathname.startsWith(`${PORTAL_APPLY_PATH}/`) ||
    pathname === "/portal/future" ||
    pathname.startsWith("/portal/future/")
  );
}

/** Safe post-login redirect targets inside the tenant portal. */
export function isSafePortalNextPath(pathname: string): boolean {
  if (isPortalPrivatePath(pathname)) return true;
  if (isFutureTenantPublicPath(pathname)) return true;
  return (
    pathname === PORTAL_START_PATH ||
    pathname.startsWith(`${PORTAL_START_PATH}/`)
  );
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
    "alex.tenant@example.com,tenant.demo@example.com"
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (
    demoEmails.includes(email) ||
    email.endsWith("@harborline.demo") ||
    email === "tenant.demo@example.com"
  ) {
    return DEMO_TENANT_ID;
  }

  // Isolated scope per auth user — cannot read DEMO_TENANT_ID fixtures.
  return `tenant-${user.id}`;
}

/** Resolve future vs current lifecycle from auth user metadata. */
export function resolveTenantLifecycle(user: {
  user_metadata?: Record<string, unknown> | null;
}): "future" | "current" {
  const meta = user.user_metadata ?? {};
  if (meta.tenant_lifecycle === "future") return "future";
  if (meta.tenant_lifecycle === "current") return "current";
  if (meta.invitation_code || meta.unit_number) return "future";
  return "current";
}

/**
 * Login redirect for a private portal path.
 * Future-tenant apply uses the dedicated /portal/login UI.
 * Current-tenant routes keep the original /login AuthForm.
 */
export function portalLoginRedirect(nextPath?: string): string {
  const safe =
    nextPath && isSafePortalNextPath(nextPath) ? nextPath : PORTAL_HOME_PATH;
  if (isFutureTenantApplyPath(safe)) {
    return `${FUTURE_TENANT_LOGIN_PATH}?next=${encodeURIComponent(safe)}`;
  }
  return `${PORTAL_LOGIN_PATH}?next=${encodeURIComponent(safe)}`;
}

export type { UserRole };
