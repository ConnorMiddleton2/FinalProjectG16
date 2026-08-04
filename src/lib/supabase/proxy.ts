import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

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
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isPublic =
      path === "/" || path.startsWith("/login") || path.startsWith("/signup");

    const isAppRoute =
      path.startsWith("/owner") ||
      path.startsWith("/manager") ||
      path.startsWith("/tenant") ||
      path.startsWith("/maintenance") ||
      path.startsWith("/accounting") ||
      path.startsWith("/workspace");

    if (!user && isAppRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    if (user && (path.startsWith("/login") || path.startsWith("/signup"))) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/workspace";
      return NextResponse.redirect(redirectUrl);
    }

    if (!user && !isPublic && path !== "/") {
      // allow static assets already excluded by matcher
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Auth proxy error:", error);
    return NextResponse.next({ request });
  }
}
