"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ALL_ROLES, ROLE_META, type UserRole } from "@/lib/types";

type Props = {
  email: string;
  role: UserRole;
};

export function AppHeader({ email, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleRoleChange(nextRole: UserRole) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ role: nextRole, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      alert(`Could not switch role: ${error.message}`);
      return;
    }

    router.push(ROLE_META[nextRole].href);
    router.refresh();
  }

  return (
    <header className="border-b border-base-300 bg-base-100 sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-box bg-primary/15 p-2 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold leading-tight">Harborline Property Management</p>
            <p className="text-xs opacity-70">
              Contract-to-cash skeleton · Final Project G16
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-ghost max-w-[14rem] truncate">{email}</span>
          <label className="flex items-center gap-2 text-sm">
            <span className="opacity-70 whitespace-nowrap">View as</span>
            <select
              className="select select-bordered select-sm"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              aria-label="Switch role for demo"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_META[r].label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-outline btn-sm gap-1" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>

      <nav className="mx-auto max-w-6xl px-4 pb-3 flex flex-wrap gap-2">
        {ALL_ROLES.map((r) => {
          const active = pathname.startsWith(ROLE_META[r].href);
          return (
            <Link
              key={r}
              href={ROLE_META[r].href}
              className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
            >
              {ROLE_META[r].label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
