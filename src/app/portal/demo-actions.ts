"use server";

import { redirect } from "next/navigation";
import { isSafePortalNextPath, PORTAL_HOME_PATH } from "@/lib/portal/auth";
import {
  clearPortalDemoCookies,
  setPortalDemoCookies,
} from "@/lib/portal/portal-demo-auth-server";

/**
 * Always-succeeding demo tenant login (cookie gate).
 * Does not depend on Supabase user provisioning.
 */
export async function portalDemoLogin(nextPath?: string) {
  await setPortalDemoCookies();
  const destination =
    nextPath && isSafePortalNextPath(nextPath) ? nextPath : PORTAL_HOME_PATH;
  redirect(destination);
}

/** Sets demo cookies without redirect — used to unlock private future routes. */
export async function ensurePortalDemoCookies() {
  await setPortalDemoCookies();
  return { ok: true as const };
}

/** Demo cookie gate for Future Tenant Apply (applicant lifecycle set client-side). */
export async function portalFutureDemoLogin(nextPath?: string) {
  await setPortalDemoCookies();
  const destination =
    nextPath && isSafePortalNextPath(nextPath)
      ? nextPath
      : "/portal/future/apply";
  redirect(destination);
}

export async function portalDemoLogout() {
  await clearPortalDemoCookies();
}
