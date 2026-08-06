/**
 * Future Tenant Portal route constants and access helpers.
 *
 * Public browse routes do not require auth.
 * Private applicant routes require an authenticated applicant session.
 *
 * BACKEND_TODO: enforce private-path ACL on the server (role + ownership).
 */

export const FUTURE_HOME = "/portal/future";
export const FUTURE_UNITS = "/portal/future/units";
export const FUTURE_UNIT = (id: string) => `/portal/future/units/${id}`;
export const FUTURE_SAVED = "/portal/future/saved";
export const FUTURE_TOURS = "/portal/future/tours";
export const FUTURE_APPLY = "/portal/future/apply";
export const FUTURE_APPLY_STEP = (step: string | number) =>
  `/portal/future/apply?step=${step}`;
export const FUTURE_STATUS = "/portal/future/application/status";
export const FUTURE_CO_APPLICANTS = "/portal/future/application/co-applicants";
export const FUTURE_DOCUMENTS = "/portal/future/application/documents";
export const FUTURE_FEE = "/portal/future/application/fee";
export const FUTURE_REVIEW = "/portal/future/application/review";
export const FUTURE_MESSAGES = "/portal/future/messages";
export const FUTURE_PROFILE = "/portal/future/profile";
export const FUTURE_LEASE_OFFER = "/portal/future/lease-offer";
export const FUTURE_LEASE_SIGN = "/portal/future/lease-sign";
export const FUTURE_WAITLIST = "/portal/future/waitlist";
export const FUTURE_SCREENING = "/portal/future/screening";
export const FUTURE_COMMERCIAL = "/portal/future/commercial";
export const FUTURE_ONBOARDING = "/portal/future/onboarding";
export const FUTURE_NOTIFICATIONS = "/portal/future/notifications";

const FUTURE_PREFIX = "/portal/future";

function normalizePathname(pathname: string): string {
  if (!pathname) return "";
  const bare = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (bare.length > 1 && bare.endsWith("/")) return bare.slice(0, -1);
  return bare;
}

function isExactOrChild(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Landing, unit browse, unit detail, tours browse, saved (local), and apply entry. */
export function isFutureTenantPublicPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path === FUTURE_HOME) return true;
  if (path === FUTURE_UNITS || isExactOrChild(path, FUTURE_UNITS)) return true;
  if (path === FUTURE_TOURS) return true;
  if (path === FUTURE_SAVED) return true;
  if (path === FUTURE_WAITLIST) return true;
  // Allow opening Apply without auth so demo / sign-in gate can render.
  if (path === FUTURE_APPLY) return true;
  return false;
}

/**
 * Applicant-only routes under /portal/future.
 * Apply, application/*, messages, profile, lease-offer, onboarding, notifications.
 */
export function isFutureTenantPrivatePath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path !== FUTURE_PREFIX && !path.startsWith(`${FUTURE_PREFIX}/`)) {
    return false;
  }
  if (isFutureTenantPublicPath(path)) return false;

  return (
    path === FUTURE_APPLY ||
    path.startsWith(`${FUTURE_APPLY}/`) ||
    path.startsWith(`${FUTURE_PREFIX}/application`) ||
    path === FUTURE_MESSAGES ||
    path.startsWith(`${FUTURE_MESSAGES}/`) ||
    path === FUTURE_PROFILE ||
    path.startsWith(`${FUTURE_PROFILE}/`) ||
    path === FUTURE_LEASE_OFFER ||
    path.startsWith(`${FUTURE_LEASE_OFFER}/`) ||
    path === FUTURE_LEASE_SIGN ||
    path.startsWith(`${FUTURE_LEASE_SIGN}/`) ||
    path === FUTURE_SCREENING ||
    path.startsWith(`${FUTURE_SCREENING}/`) ||
    path === FUTURE_COMMERCIAL ||
    path.startsWith(`${FUTURE_COMMERCIAL}/`) ||
    path === FUTURE_ONBOARDING ||
    path.startsWith(`${FUTURE_ONBOARDING}/`) ||
    path === FUTURE_NOTIFICATIONS ||
    path.startsWith(`${FUTURE_NOTIFICATIONS}/`)
  );
}
