import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ALL_ROLES, ROLE_META, type Profile, type UserRole } from "@/lib/types";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const role = ((profile as Profile | null)?.role ?? "manager") as UserRole;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role hub</h1>
        <p className="opacity-70 mt-1">
          You are currently set as <strong>{ROLE_META[role].label}</strong>. Use
          the header switcher to demo other roles for the panel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ALL_ROLES.map((r) => (
          <Link
            key={r}
            href={ROLE_META[r].href}
            className={`card border shadow-sm transition hover:-translate-y-0.5 ${
              r === role
                ? "bg-primary text-primary-content border-primary"
                : "bg-base-100 border-base-300"
            }`}
          >
            <div className="card-body">
              <h2 className="card-title text-lg">{ROLE_META[r].label}</h2>
              <p className={`text-sm ${r === role ? "opacity-90" : "opacity-70"}`}>
                {ROLE_META[r].description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
