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
  resolveTenantScopeId,
  type PortalTenantSession,
} from "@/lib/portal/auth";
import {
  getPortalDemoSessionFromCookie,
  hasPortalDemoAccess,
} from "@/lib/portal/portal-demo-auth-server";
import type { UserRole } from "@/lib/types";

/**
 * Returns the current-tenant portal session, or null if unsigned / wrong role.
 */
export async function getCurrentPortalTenant(): Promise<PortalTenantSession | null> {
  const demo = await getPortalDemoSessionFromCookie();
  if (demo) return demo;

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

    const email = user.email ?? "tenant@harborline.local";
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
    };
  } catch {
    return null;
  }
}

/**
 * Layout/page guard for private `/portal` routes.
 * - Demo cookie → always allowed as demo tenant
 * - Not signed in → `/login?next=…`
 * - Signed in but not current-tenant role → `/portal/unauthorized`
 */
export async function requirePortalTenant(
  nextPath: string = PORTAL_HOME_PATH
): Promise<PortalTenantSession> {
  if (await hasPortalDemoAccess()) {
    const demo = await getPortalDemoSessionFromCookie();
    if (demo) return demo;
  }

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

    const email = user.email ?? "tenant@harborline.local";
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
    };
  } catch {
    if (await hasPortalDemoAccess()) {
      const demo = await getPortalDemoSessionFromCookie();
      if (demo) return demo;
    }
    redirect(portalLoginRedirect(nextPath));
  }
}
