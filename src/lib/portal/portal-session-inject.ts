import type { PortalTenantSession } from "@/lib/portal/auth";

/**
 * Server layout injects the portal session here so client services can
 * resolve tenant_accounts cookie users without re-hitting /api/portal/session.
 */
let injectedSession: PortalTenantSession | null = null;

export function setInjectedPortalSession(session: PortalTenantSession | null) {
  injectedSession = session;
}

export function getInjectedPortalSession(): PortalTenantSession | null {
  return injectedSession;
}
