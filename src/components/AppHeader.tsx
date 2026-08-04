"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_ROLE_COOKIE } from "@/lib/demo-role-constants";
import { ALL_ROLES, ROLE_META, type UserRole } from "@/lib/types";

type Props = {
  email: string;
  role: UserRole;
  profileRole: UserRole;
  isDemoOverride: boolean;
};

function setDemoRoleCookie(role: UserRole | null) {
  if (role === null) {
    document.cookie = `${DEMO_ROLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${DEMO_ROLE_COOKIE}=${role}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function AppHeader({ email, role, profileRole, isDemoOverride }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = ROLE_META[role].nav;

  async function handleLogout() {
    setDemoRoleCookie(null);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleDemoRoleChange(nextRole: UserRole) {
    setDemoRoleCookie(nextRole);
    router.push(ROLE_META[nextRole].href);
    router.refresh();
  }

  function clearDemoOverride() {
    setDemoRoleCookie(null);
    router.push(ROLE_META[profileRole].href);
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
          <span className="badge badge-outline">{ROLE_META[role].label}</span>
          <button type="button" className="btn btn-outline btn-sm gap-1" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-3">
        <div className="rounded-box border border-warning/40 bg-warning/10 px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-semibold text-warning-content">
              Demo feature — role switcher
            </p>
            <p className="opacity-80 text-xs sm:text-sm">
              Development / panel only. Does not change your real account role
              ({ROLE_META[profileRole].label}).
              {isDemoOverride ? " Demo override is active." : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="opacity-70 whitespace-nowrap">View as</span>
              <select
                className="select select-bordered select-sm"
                value={role}
                onChange={(e) => handleDemoRoleChange(e.target.value as UserRole)}
                aria-label="Demo role switcher"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_META[r].label}
                  </option>
                ))}
              </select>
            </label>
            {isDemoOverride && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={clearDemoOverride}
              >
                Clear demo override
              </button>
            )}
          </div>
        </div>
      </div>

      <nav
        className="mx-auto max-w-6xl px-4 pb-3 flex flex-wrap gap-2"
        aria-label="Role navigation"
      >
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
