import { DEMO_TENANT_ID } from "@/lib/portal/documents-types";
import {
  CURRENT_TENANT_ROLE,
  type PortalTenantSession,
} from "@/lib/portal/auth";

/** HttpOnly cookie checked by proxy + server layouts (same pattern as team auth). */
export const PORTAL_DEMO_COOKIE = "harborline_portal_tenant_v2";

/** Readable flag so client hooks can resolve the demo session without Supabase. */
export const PORTAL_DEMO_CLIENT_COOKIE = "harborline_portal_tenant_ui_v2";

export const PORTAL_DEMO_SESSION_STORAGE_KEY =
  "harborline.portal.demoTenantSession.v1";

export const PORTAL_DEMO_TENANT: PortalTenantSession = {
  userId: "demo-portal-tenant",
  email: "alex.tenant@harborline.demo",
  displayName: "Alex Tenant",
  role: CURRENT_TENANT_ROLE,
  tenantScopeId: DEMO_TENANT_ID,
};

/** Prefill password for the login form. Demo login disabled — use real tenant accounts. */
export const PORTAL_DEMO_PASSWORD = "";

export function isPortalDemoCredentials(_email: string, _password: string) {
  // Broken Alex demo tenant removed — prospects register via Start application.
  return false;
}

export function isPortalDemoCookieValue(value: string | undefined | null) {
  return value === "1";
}
