/**
 * Client-safe current-tenant portal session helper.
 */

import { createClient } from "@/lib/supabase/client";
import {
  CURRENT_TENANT_ROLE,
  resolveTenantScopeId,
  type PortalTenantSession,
} from "@/lib/portal/auth";
import {
  PORTAL_DEMO_CLIENT_COOKIE,
  PORTAL_DEMO_SESSION_STORAGE_KEY,
  PORTAL_DEMO_TENANT,
  isPortalDemoCookieValue,
} from "@/lib/portal/portal-demo-auth";
import type { UserRole } from "@/lib/types";

function readClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function readDemoSessionFromStorage(): PortalTenantSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PORTAL_DEMO_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalTenantSession;
    if (parsed?.role === CURRENT_TENANT_ROLE && parsed.tenantScopeId) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function resolveDemoSessionClient(): PortalTenantSession | null {
  if (!isPortalDemoCookieValue(readClientCookie(PORTAL_DEMO_CLIENT_COOKIE))) {
    return null;
  }
  return readDemoSessionFromStorage() ?? PORTAL_DEMO_TENANT;
}

/**
 * Client-side session resolution for hooks/services.
 * Prefers tenant_accounts / server session API, then Supabase tenant, then demo.
 */
export async function getPortalTenantSessionClient(): Promise<PortalTenantSession | null> {
  try {
    const res = await fetch("/api/portal/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { session?: PortalTenantSession | null };
      if (data.session?.role === CURRENT_TENANT_ROLE) {
        return data.session;
      }
    }
  } catch {
    /* fall through */
  }

  const demo = resolveDemoSessionClient();

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      const role = (profile as { role?: UserRole } | null)?.role;
      if (role === CURRENT_TENANT_ROLE) {
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
      }
    }
  } catch {
    /* Missing Supabase env — demo cookie still works */
  }

  return demo;
}
