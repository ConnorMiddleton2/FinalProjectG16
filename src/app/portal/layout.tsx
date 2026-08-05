import { PortalShell } from "@/components/portal/PortalShell";
import { createClient } from "@/lib/supabase/server";

/**
 * Public tenant portal layout for the main-dash
 * “I am a tenant or future tenant” entry (/portal).
 * Does not require team/ops login.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = "Guest";
  let displayName = "Guest";
  let isSignedIn = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      isSignedIn = true;
      email = user.email ?? "Signed in";
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      displayName =
        (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
        email.split("@")[0] ||
        "Tenant";
    }
  } catch {
    /* Missing env or guest browse — portal stays public */
  }

  return (
    <PortalShell
      email={email}
      displayName={displayName}
      isSignedIn={isSignedIn}
    >
      {children}
    </PortalShell>
  );
}
