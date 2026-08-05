import { PortalShell } from "@/components/portal/PortalShell";
import { createClient } from "@/lib/supabase/server";

/**
 * Public portal routes (future-tenant apply, unauthorized).
 * No current-tenant role required for apply; unauthorized may still show
 * the signed-in identity for clarity.
 */
export default async function PortalPublicLayout({
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
        "User";
    }
  } catch {
    /* guests / missing env */
  }

  return (
    <PortalShell email={email} displayName={displayName} isSignedIn={isSignedIn}>
      {children}
    </PortalShell>
  );
}
