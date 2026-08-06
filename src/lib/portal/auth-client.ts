"use client";

/**
 * Client-safe portal session helpers.
 * Future-tenant resolution must never hang on Supabase.
 */

import { createClient } from "@/lib/supabase/client";
import {
  CURRENT_TENANT_ROLE,
  resolveTenantLifecycle,
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

/** Sync read — safe for useState initializers. */
export function readDemoSessionFromStorage(): PortalTenantSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PORTAL_DEMO_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalTenantSession;
    if (parsed?.role === CURRENT_TENANT_ROLE && parsed.tenantScopeId) {
      return {
        ...parsed,
        lifecycle: parsed.lifecycle === "future" ? "future" : "current",
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function hasDemoCookie(): boolean {
  return isPortalDemoCookieValue(readClientCookie(PORTAL_DEMO_CLIENT_COOKIE));
}

function resolveDemoSessionClient(): PortalTenantSession | null {
  if (!hasDemoCookie()) return null;
  return readDemoSessionFromStorage() ?? PORTAL_DEMO_TENANT;
}

/** Sync: future applicant from sessionStorage only. */
export function readFutureApplicantSessionSync(): PortalTenantSession | null {
  const stored = readDemoSessionFromStorage();
  return stored?.lifecycle === "future" ? stored : null;
}

/** Sync: current-tenant demo present (blocks future portal). */
export function readCurrentTenantSessionSync(): PortalTenantSession | null {
  const stored = readDemoSessionFromStorage();
  if (stored?.lifecycle === "current") return stored;
  if (hasDemoCookie() && !stored) return PORTAL_DEMO_TENANT;
  if (hasDemoCookie() && stored?.lifecycle !== "future") return stored;
  return null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function resolveSupabaseTenantSession(): Promise<PortalTenantSession | null> {
  try {
    const supabase = createClient();
    const userResult = await withTimeout(supabase.auth.getUser(), 1200);
    if (!userResult || !("data" in userResult)) return null;
    const user = userResult.data.user;
    if (!user) return null;

    const profileResult = await withTimeout(
      (async () =>
        supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .maybeSingle())(),
      1200
    );
    if (
      !profileResult ||
      typeof profileResult !== "object" ||
      !("data" in profileResult)
    ) {
      return {
        userId: user.id,
        email: user.email ?? "tenant@harborline.local",
        displayName:
          (user.user_metadata?.full_name as string | undefined)?.trim() ||
          user.email?.split("@")[0] ||
          "Tenant",
        role: CURRENT_TENANT_ROLE,
        tenantScopeId: resolveTenantScopeId(user),
        lifecycle: resolveTenantLifecycle(user),
      };
    }

    const profile = profileResult.data as {
      full_name?: string | null;
      role?: UserRole;
    } | null;
    const role = profile?.role;
    if (role !== CURRENT_TENANT_ROLE && role != null) return null;

    const email = user.email ?? "tenant@harborline.local";
    const displayName =
      profile?.full_name?.trim() ||
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

export async function getPortalTenantSessionClient(): Promise<PortalTenantSession | null> {
  try {
    const res = await fetch("/api/portal/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { session?: PortalTenantSession | null };
      if (data.session?.role === CURRENT_TENANT_ROLE) {
        return {
          ...data.session,
          lifecycle:
            data.session.lifecycle === "future" ? "future" : "current",
        };
      }
    }
  } catch {
    /* fall through */
  }

  const live = await resolveSupabaseTenantSession();
  if (live) return live;
  return resolveDemoSessionClient();
}

export async function getFutureApplicantSessionClient(): Promise<PortalTenantSession | null> {
  const sync = readFutureApplicantSessionSync();
  if (sync) return sync;

  const live = await resolveSupabaseTenantSession();
  if (live?.lifecycle === "future") return live;
  return null;
}

export async function getAnyPortalSessionClient(): Promise<PortalTenantSession | null> {
  const stored = readDemoSessionFromStorage();
  if (stored) return stored;
  if (hasDemoCookie()) return PORTAL_DEMO_TENANT;

  const live = await resolveSupabaseTenantSession();
  if (live) return live;
  return null;
}
