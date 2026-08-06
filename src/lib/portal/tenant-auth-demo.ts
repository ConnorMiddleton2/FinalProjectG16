/**
 * Sample tenant auth values for local development / portal demo only.
 * Never used as production credentials and never auto-creates accounts.
 */

export const TENANT_AUTH_DEMO_SAMPLE = {
  email: "tenant.demo@example.com",
  password: "TenantDemo123!",
  firstName: "Demo",
  lastName: "Tenant",
  phone: "555-555-0123",
  unit: "204",
  invitationCode: "DEMO204",
} as const;

/**
 * True when sample form prefill is allowed.
 * Controlled by NODE_ENV or explicit NEXT_PUBLIC_PORTAL_AUTH_DEMO=1.
 */
export function isTenantAuthDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_PORTAL_AUTH_DEMO === "1") return true;
  if (process.env.NEXT_PUBLIC_PORTAL_AUTH_DEMO === "0") return false;
  return process.env.NODE_ENV === "development";
}
