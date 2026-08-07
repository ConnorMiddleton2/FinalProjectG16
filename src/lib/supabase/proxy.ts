import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isPortalPrivatePath,
  isPortalPublicPath,
  portalLoginRedirect,
  PORTAL_HOME_PATH,
} from "@/lib/portal/auth";
import {
  PORTAL_DEMO_CLIENT_COOKIE,
  PORTAL_DEMO_COOKIE,
  isPortalDemoCookieValue,
} from "@/lib/portal/portal-demo-auth";
import { TENANT_PORTAL_COOKIE } from "@/lib/tenant-portal-accounts";

/** Legacy + current demo cookie names — clear on /login so the form always shows. */
const PORTAL_DEMO_COOKIES_TO_CLEAR = [
  PORTAL_DEMO_COOKIE,
  PORTAL_DEMO_CLIENT_COOKIE,
  "cpmc_portal_tenant",
  "cpmc_portal_tenant_ui",
] as const;

function clearPortalDemoCookiesOnResponse(response: NextResponse) {
  for (const name of PORTAL_DEMO_COOKIES_TO_CLEAR) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

/** Owner and tenant sessions must not overlap. */
function clearTenantPortalCookiesOnResponse(response: NextResponse) {
  response.cookies.set(TENANT_PORTAL_COOKIE, "", { path: "/", maxAge: 0 });
  clearPortalDemoCookiesOnResponse(response);
  return response;
}

const TEAM_COOKIE = "cpmc_team";
const LEGACY_TEAM_COOKIE = "harborline_team";

function hasTeamSessionCookie(request: NextRequest) {
  const value =
    request.cookies.get(TEAM_COOKIE)?.value ||
    request.cookies.get(LEGACY_TEAM_COOKIE)?.value;
  if (!value) return false;
  // Legacy shared login used "1"; admin uses "admin"; employees use record ids.
  return value === "1" || value === "admin" || value.length > 0;
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const hasTeamCookie = hasTeamSessionCookie(request);
  const hasPortalDemo = isPortalDemoCookieValue(
    request.cookies.get(PORTAL_DEMO_COOKIE)?.value
  );
  /** Prospect / applicant accounts created via Start application. */
  const hasTenantPortalAccount = Boolean(
    request.cookies.get(TENANT_PORTAL_COOKIE)?.value
  );
  const isLoginOrSignup =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/portal/login") ||
    path.startsWith("/portal/signup") ||
    path.startsWith("/portal/reset-password") ||
    path.startsWith("/auth/callback");

  const isPublic =
    path === "/" ||
    isPortalPublicPath(path) ||
    path.startsWith("/team") ||
    path.startsWith("/owners") ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/auth/callback");

  const hasOwnerCookie = Boolean(request.cookies.get("cpmc_owner")?.value);
  const onOwnerPortal = path.startsWith("/owners");

  if (path.startsWith("/ops") && !hasTeamCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/team";
    return NextResponse.redirect(redirectUrl);
  }

  if (path.startsWith("/owners/dashboard") && !hasOwnerCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/owners";
    return NextResponse.redirect(redirectUrl);
  }

  if (!url || !key) {
    if (
      isPortalPrivatePath(path) &&
      !hasPortalDemo &&
      !hasTenantPortalAccount
    ) {
      const redirectUrl = request.nextUrl.clone();
      const target = portalLoginRedirect(path || PORTAL_HOME_PATH);
      return NextResponse.redirect(new URL(target, request.url));
    }
    const response = NextResponse.next({ request });
    if (isLoginOrSignup) {
      clearPortalDemoCookiesOnResponse(response);
    }
    if (onOwnerPortal) {
      clearTenantPortalCookiesOnResponse(response);
    }
    return response;
  }

  let supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set("x-portal-pathname", path);

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<NextResponse["cookies"]["set"]>[2];
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.headers.set("x-portal-pathname", path);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Private portal: Supabase tenant, demo cookie, or tenant_accounts session.
    // Owner cookie alone must never keep /portal open.
    if (
      isPortalPrivatePath(path) &&
      !user &&
      !hasPortalDemo &&
      !hasTenantPortalAccount
    ) {
      const target = portalLoginRedirect(path || PORTAL_HOME_PATH);
      return NextResponse.redirect(new URL(target, request.url));
    }

    const isAppRoute =
      path === "/owner" ||
      path.startsWith("/owner/") ||
      path.startsWith("/manager") ||
      path.startsWith("/tenant") ||
      path.startsWith("/maintenance") ||
      path.startsWith("/accounting") ||
      path.startsWith("/workspace");

    if (!user && isAppRoute && !hasTeamCookie) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/team";
      return NextResponse.redirect(redirectUrl);
    }

    // Always show the tenant portal login/signup forms.
    // Do not auto-skip them for an existing Supabase session — tenants need
    // an explicit sign-in / create-account prompt. Workspace `/login` still skips.
    if (
      user &&
      isLoginOrSignup &&
      !path.startsWith("/auth/callback") &&
      !path.startsWith("/portal/reset-password") &&
      !path.startsWith("/portal/login") &&
      !path.startsWith("/portal/signup")
    ) {
      const redirectUrl = request.nextUrl.clone();
      const next = request.nextUrl.searchParams.get("next");
      if (next && isPortalPrivatePath(next)) {
        redirectUrl.pathname = next;
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
      redirectUrl.pathname = "/workspace";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (!user && !isPublic && path !== "/" && !path.startsWith("/ops")) {
      // public routes already handled
    }

    if (isLoginOrSignup) {
      clearPortalDemoCookiesOnResponse(supabaseResponse);
    }
    if (onOwnerPortal) {
      clearTenantPortalCookiesOnResponse(supabaseResponse);
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Auth proxy error:", error);
    const response = NextResponse.next({ request });
    if (isLoginOrSignup) {
      clearPortalDemoCookiesOnResponse(response);
    }
    if (onOwnerPortal) {
      clearTenantPortalCookiesOnResponse(response);
    }
    return response;
  }
}
