/**
 * Shared tenant portal auth constants and path helpers.
 * Safe to import from client or server.
 */

import { DEMO_TENANT_ID } from "@/lib/portal/documents-types";
import type { UserRole } from "@/lib/types";

export const CURRENT_TENANT_ROLE = "tenant" as const;

export const PORTAL_HOME_PATH = "/portal";
/** Workspace multi-role login (also accepts prospect tenant_accounts). */
export const PORTAL_LOGIN_PATH = "/login";
/** Dedicated tenant portal login / signup UI. */
export const TENANT_PORTAL_LOGIN_PATH = "/portal/login";
export const TENANT_PORTAL_SIGNUP_PATH = "/portal/signup";
/** @deprecated Use TENANT_PORTAL_LOGIN_PATH */
export const FUTURE_TENANT_LOGIN_PATH = TENANT_PORTAL_LOGIN_PATH;
/** @deprecated Use TENANT_PORTAL_SIGNUP_PATH */
export const FUTURE_TENANT_SIGNUP_PATH = TENANT_PORTAL_SIGNUP_PATH;
export const PORTAL_SIGNUP_PATH = TENANT_PORTAL_SIGNUP_PATH;
export const PORTAL_RESET_PASSWORD_PATH = "/portal/reset-password";
export const PORTAL_UNAUTHORIZED_PATH = "/portal/unauthorized";
export const PORTAL_APPLY_PATH = "/portal/start/apply";
/** Public leasing browse + apply entry after welcome CTA. */
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
   * Applicant/prospect pipeline vs active lease tenant.
   * Defaults to current for existing demo / legacy tenants.
   */
  lifecycle: "future" | "current";
  /** Set when signed in via tenant_accounts cookie (prospect / active portal). */
  accountStatus?:
    | "prospect"
    | "pending_application"
    | "pending_lease"
    | "active"
    | "inactive";
  propertyId?: string;
  propertyName?: string;
  unit?: string;
  /** Monthly rent after S&M move-in approval (when known). */
  monthlyRent?: number;
  /** Preferred rent payment method (from portal account). */
  preferredPaymentMethod?: "ach" | "check" | "debit_card";
  /** Masked last four for the preferred method. */
  paymentMethodLast4?: string;
  /** Management `tenants` row id (AR customerId). */
  tenantRecordId?: string;
  tenantAccountId?: string;
};

/**
 * Paths under /portal that do not require a portal session.
 */
export function isPortalPublicPath(pathname: string): boolean {
  return (
    pathname === PORTAL_START_PATH ||
    pathname.startsWith(`${PORTAL_START_PATH}/`) ||
    // Legacy apply URL redirects to /portal/start/apply
    pathname === "/portal/apply" ||
    pathname.startsWith("/portal/apply/") ||
    pathname === PORTAL_UNAUTHORIZED_PATH ||
    pathname === "/portal/logout" ||
    pathname === TENANT_PORTAL_LOGIN_PATH ||
    pathname.startsWith(`${TENANT_PORTAL_LOGIN_PATH}/`) ||
    pathname === TENANT_PORTAL_SIGNUP_PATH ||
    pathname.startsWith(`${TENANT_PORTAL_SIGNUP_PATH}/`) ||
    pathname === PORTAL_RESET_PASSWORD_PATH ||
    pathname.startsWith(`${PORTAL_RESET_PASSWORD_PATH}/`) ||
    // Legacy future-portal URLs redirect publicly to /portal/start
    pathname === "/portal/future" ||
    pathname.startsWith("/portal/future/")
  );
}

export function isPortalPrivatePath(pathname: string): boolean {
  if (pathname !== PORTAL_HOME_PATH && !pathname.startsWith(`${PORTAL_HOME_PATH}/`)) {
    return false;
  }
  return !isPortalPublicPath(pathname);
}

/** Apply / create-account paths that should use the tenant portal login UI. */
export function isTenantApplyPath(pathname: string): boolean {
  return (
    pathname === PORTAL_APPLY_PATH ||
    pathname.startsWith(`${PORTAL_APPLY_PATH}/`) ||
    pathname === "/portal/apply" ||
    pathname.startsWith("/portal/apply/")
  );
}

/** @deprecated Use isTenantApplyPath */
export function isFutureTenantApplyPath(pathname: string): boolean {
  return isTenantApplyPath(pathname);
}

/** Safe post-login redirect targets inside the tenant portal. */
export function isSafePortalNextPath(pathname: string): boolean {
  if (isPortalPrivatePath(pathname)) return true;
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
    email.endsWith("@cpmc.demo") ||
    email === "tenant.demo@example.com"
  ) {
    return DEMO_TENANT_ID;
  }

  // Isolated scope per auth user — cannot read DEMO_TENANT_ID fixtures.
  return `tenant-${user.id}`;
}

/** Resolve applicant vs current lifecycle from auth user metadata. */
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
 * Always uses the tenant portal login UI so /portal routes stay consistent.
 */
export function portalLoginRedirect(nextPath?: string): string {
  const safe =
    nextPath && isSafePortalNextPath(nextPath) ? nextPath : PORTAL_HOME_PATH;
  return `${TENANT_PORTAL_LOGIN_PATH}?next=${encodeURIComponent(safe)}`;
}

export type { UserRole };
