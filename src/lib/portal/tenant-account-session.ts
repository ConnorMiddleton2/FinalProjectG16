import type { PortalTenantSession } from "@/lib/portal/auth";
import { CURRENT_TENANT_ROLE } from "@/lib/portal/auth";
import type { TenantAccount } from "@/lib/tenant-portal-accounts";

/** Maps a `tenant_accounts` row into the portal session shape. */
export function portalSessionFromTenantAccount(
  account: TenantAccount
): PortalTenantSession {
  return {
    userId: account.id,
    email: account.email,
    displayName: account.fullName || account.email.split("@")[0] || "Tenant",
    role: CURRENT_TENANT_ROLE,
    tenantScopeId: `tenant-acct-${account.id}`,
    accountStatus: account.status,
    propertyId: account.propertyId || undefined,
    propertyName: account.propertyName || undefined,
    unit: account.unit || undefined,
    tenantAccountId: account.id,
  };
}
