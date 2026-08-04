import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { hasTeamAccess } from "@/lib/team-auth";
import type { Profile, UserRole } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teamAccess = await hasTeamAccess();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !teamAccess) {
    redirect("/team");
  }

  let role: UserRole = "manager";
  let email = "Team session";

  if (user) {
    email = user.email ?? "Signed in";
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    role = ((profile as Profile | null)?.role ?? "manager") as UserRole;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader email={email} role={role} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
