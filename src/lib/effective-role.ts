import { redirect } from "next/navigation";
import { canAccessPath, homePathForRole } from "@/lib/access";
import { readDemoRoleCookie, resolveEffectiveRole } from "@/lib/demo-role";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export async function getEffectiveRole(): Promise<{
  role: UserRole;
  email: string;
  profileRole: UserRole;
  isDemoOverride: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const demoRole = await readDemoRoleCookie();
  const profileRole = resolveEffectiveRole(
    (profile as Profile | null)?.role,
    null
  );
  const role = resolveEffectiveRole((profile as Profile | null)?.role, demoRole);

  return {
    role,
    email: user.email ?? "Signed in",
    profileRole,
    isDemoOverride: Boolean(demoRole),
  };
}

/** Redirect to the caller's home workspace when the path is not allowed. */
export async function requirePageAccess(pathname: string): Promise<UserRole> {
  const { role } = await getEffectiveRole();
  if (!canAccessPath(role, pathname)) {
    redirect(homePathForRole(role));
  }
  return role;
}
