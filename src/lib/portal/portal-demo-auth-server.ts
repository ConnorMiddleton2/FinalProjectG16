import { cookies } from "next/headers";
import type { PortalTenantSession } from "@/lib/portal/auth";
import {
  PORTAL_DEMO_CLIENT_COOKIE,
  PORTAL_DEMO_COOKIE,
  PORTAL_DEMO_TENANT,
  isPortalDemoCookieValue,
} from "@/lib/portal/portal-demo-auth";

export async function hasPortalDemoAccess() {
  const jar = await cookies();
  return isPortalDemoCookieValue(jar.get(PORTAL_DEMO_COOKIE)?.value);
}

export async function getPortalDemoSessionFromCookie(): Promise<PortalTenantSession | null> {
  if (!(await hasPortalDemoAccess())) return null;
  return PORTAL_DEMO_TENANT;
}

export async function setPortalDemoCookies() {
  const jar = await cookies();
  const options = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  };

  jar.set({
    name: PORTAL_DEMO_COOKIE,
    value: "1",
    httpOnly: true,
    ...options,
  });
  jar.set({
    name: PORTAL_DEMO_CLIENT_COOKIE,
    value: "1",
    httpOnly: false,
    ...options,
  });
}

export async function clearPortalDemoCookies() {
  const jar = await cookies();
  jar.delete(PORTAL_DEMO_COOKIE);
  jar.delete(PORTAL_DEMO_CLIENT_COOKIE);
}
