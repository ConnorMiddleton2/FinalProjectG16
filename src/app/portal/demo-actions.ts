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

/** Sets demo cookies without redirect. */
export async function ensurePortalDemoCookies() {
  await setPortalDemoCookies();
  return { ok: true as const };
}

export async function portalDemoLogout() {
  await clearPortalDemoCookies();
}
