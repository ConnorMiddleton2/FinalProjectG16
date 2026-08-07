import { DEMO_TENANT_ID } from "@/lib/portal/documents-types";
import {
  CURRENT_TENANT_ROLE,
  type PortalTenantSession,
} from "@/lib/portal/auth";
import { TENANT_AUTH_DEMO_SAMPLE } from "@/lib/portal/tenant-auth-demo";

/** HttpOnly cookie checked by proxy + server layouts (same pattern as team auth). */
export const PORTAL_DEMO_COOKIE = "cpmc_portal_tenant_v2";

/** Readable flag so client hooks can resolve the demo session without Supabase. */
export const PORTAL_DEMO_CLIENT_COOKIE = "cpmc_portal_tenant_ui_v2";

export const PORTAL_DEMO_SESSION_STORAGE_KEY =
  "cpmc.portal.demoTenantSession.v1";

export const PORTAL_DEMO_TENANT: PortalTenantSession = {
  userId: "demo-portal-tenant",
  email: "alex.tenant@cpmc.demo",
  displayName: "Alex Tenant",
  role: CURRENT_TENANT_ROLE,
  tenantScopeId: DEMO_TENANT_ID,
  lifecycle: "current",
};

/** Prefill password for the legacy login form. Always accepted by portal demo login. */
export const PORTAL_DEMO_PASSWORD = "tenant123";

/**
 * Demo-only credential pairs that open the portal via cookie (no Supabase user).
 * Never provision production accounts from these values.
 */
const PORTAL_DEMO_CREDENTIAL_PAIRS: Array<{ email: string; password: string }> =
  [
    {
      email: PORTAL_DEMO_TENANT.email,
      password: PORTAL_DEMO_PASSWORD,
    },
    {
      email: TENANT_AUTH_DEMO_SAMPLE.email,
      password: TENANT_AUTH_DEMO_SAMPLE.password,
    },
  ];

export function isPortalDemoCredentials(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  return PORTAL_DEMO_CREDENTIAL_PAIRS.some(
    (pair) =>
      pair.email.toLowerCase() === normalized && pair.password === password
  );
}

export function isPortalDemoCookieValue(value: string | undefined | null) {
  return value === "1";
}
