import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isSafePortalNextPath,
  FUTURE_TENANT_LOGIN_PATH,
  PORTAL_HOME_PATH,
  PORTAL_RESET_PASSWORD_PATH,
} from "@/lib/portal/auth";

/**
 * Supabase auth callback for email verification and password recovery.
 * Exchanges ?code= for a session, then redirects to a safe in-app path.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next =
    nextParam === PORTAL_RESET_PASSWORD_PATH ||
    (nextParam && isSafePortalNextPath(nextParam))
      ? nextParam
      : PORTAL_HOME_PATH;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}${FUTURE_TENANT_LOGIN_PATH}?error=auth_callback`
  );
}
