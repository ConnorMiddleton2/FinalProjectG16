/**
 * Server-only current-tenant portal auth helpers.
 * Do not import this file from client components.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CURRENT_TENANT_ROLE,
  PORTAL_HOME_PATH,
  PORTAL_UNAUTHORIZED_PATH,
  portalLoginRedirect,
  resolveTenantLifecycle,
  resolveTenantScopeId,
  type PortalTenantSession,
} from "@/lib/portal/auth";
import { getTenantPortalSession } from "@/lib/tenant-portal-accounts";
import { portalSessionFromTenantAccount } from "@/lib/portal/tenant-account-session";
import type { UserRole } from "@/lib/types";

/**
 * Returns the current-tenant portal session, or null if unsigned / wrong role.
 */
export async function getCurrentPortalTenant(): Promise<PortalTenantSession | null> {
  const account = await getTenantPortalSession();
  if (account) return portalSessionFromTenantAccount(account);

  // Portal demo cookie login is disabled — real tenant_accounts / Supabase only.

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: UserRole } | null)?.role;
    if (role !== CURRENT_TENANT_ROLE) {
      return null;
    }

    const email = user.email ?? "tenant@cpmc.local";
    const displayName =
      (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
      email.split("@")[0] ||
      "Tenant";

    return {
      userId: user.id,
      email,
      displayName,
      role: CURRENT_TENANT_ROLE,
      tenantScopeId: resolveTenantScopeId(user),
      lifecycle: resolveTenantLifecycle(user),
    };
  } catch {
    return null;
  }
}

/**
 * Layout/page guard for private `/portal` routes.
 * Accepts: tenant_accounts cookie or Supabase tenant role.
 */
export async function requirePortalTenant(
  nextPath: string = PORTAL_HOME_PATH
): Promise<PortalTenantSession> {
  const account = await getTenantPortalSession();
  if (account) return portalSessionFromTenantAccount(account);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(portalLoginRedirect(nextPath));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: UserRole } | null)?.role;
    if (role !== CURRENT_TENANT_ROLE) {
      redirect(PORTAL_UNAUTHORIZED_PATH);
    }

    const email = user.email ?? "tenant@cpmc.local";
    const displayName =
      (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
      email.split("@")[0] ||
      "Tenant";

    return {
      userId: user.id,
      email,
      displayName,
      role: CURRENT_TENANT_ROLE,
      tenantScopeId: resolveTenantScopeId(user),
      lifecycle: resolveTenantLifecycle(user),
    };
  } catch {
    const accountRetry = await getTenantPortalSession();
    if (accountRetry) return portalSessionFromTenantAccount(accountRetry);
    redirect(portalLoginRedirect(nextPath));
  }
}
