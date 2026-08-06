"use server";

import { redirect } from "next/navigation";
import {
  isPortalPrivatePath,
  PORTAL_HOME_PATH,
} from "@/lib/portal/auth";
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
    nextPath && isPortalPrivatePath(nextPath) ? nextPath : PORTAL_HOME_PATH;
  redirect(destination);
}

export async function portalDemoLogout() {
  await clearPortalDemoCookies();
}
