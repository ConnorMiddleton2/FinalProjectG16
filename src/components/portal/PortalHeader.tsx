"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  MessageCircle,
  UserRound,
  X,
} from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import { createClient } from "@/lib/supabase/client";
import { PORTAL_HELP_HREF, PORTAL_HELP_LABEL } from "@/lib/portal/nav";

type Props = {
  email: string;
  displayName: string;
  isSignedIn: boolean;
  mobileNavId: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export function PortalHeader({
  email,
  displayName,
  isSignedIn,
  mobileNavId,
  mobileOpen,
  onMobileOpenChange,
}: Props) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);
  const profileButtonId = useId();
  const profileMenuId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        onMobileOpenChange(false);
      }
    }
    function onPointerDown(event: MouseEvent) {
      if (
        profileWrapRef.current &&
        !profileWrapRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [onMobileOpenChange]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* guest sessions may not have Supabase auth */
    }
    try {
      await teamLogout();
    } catch {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="btn btn-ghost btn-sm px-2 text-[var(--harbor-sand)] lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls={mobileNavId}
            onClick={() => onMobileOpenChange(!mobileOpen)}
          >
            <span className="sr-only">
              {mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            </span>
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <Link
            href="/portal"
            className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-glow)]"
          >
            <span className="rounded-xl bg-[var(--harbor-sand)]/15 p-2 text-[var(--harbor-sand)]">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-xl leading-tight sm:text-2xl">
                Harborline
              </span>
              <span className="block truncate text-xs opacity-70">
                Tenant portal
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="btn btn-ghost btn-sm hidden text-[var(--harbor-sand)] sm:inline-flex"
          >
            Welcome
          </Link>
          <Link
            href={PORTAL_HELP_HREF}
            className="btn btn-ghost btn-sm hidden gap-1 text-[var(--harbor-sand)] md:inline-flex"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {PORTAL_HELP_LABEL}
          </Link>

          <button
            type="button"
            className="btn btn-ghost btn-sm px-2 text-[var(--harbor-sand)]"
            aria-label="Notifications (none yet)"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span
              className="ml-1 hidden rounded-full bg-[var(--harbor-glow)]/90 px-1.5 text-[10px] font-semibold text-[var(--harbor-ink)] sm:inline"
              aria-hidden="true"
            >
              0
            </span>
          </button>

          <div className="relative" ref={profileWrapRef}>
            <button
              type="button"
              id={profileButtonId}
              className="btn btn-ghost btn-sm max-w-[12rem] gap-1 text-[var(--harbor-sand)] sm:max-w-[16rem]"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-controls={profileMenuId}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{displayName}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
            </button>

            {profileOpen ? (
              <div
                id={profileMenuId}
                role="menu"
                aria-labelledby={profileButtonId}
                className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-[var(--harbor-deep)]/10 bg-white p-2 text-[var(--harbor-ink)] shadow-lg"
              >
                <p className="truncate px-3 py-2 text-xs opacity-60" role="none">
                  {email}
                </p>
                <Link
                  href="/portal/profile"
                  role="menuitem"
                  className="flex min-h-10 items-center rounded-lg px-3 text-sm hover:bg-[var(--harbor-mist)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
                  onClick={() => setProfileOpen(false)}
                >
                  Profile
                </Link>
                {!isSignedIn ? (
                  <Link
                    href="/login"
                    role="menuitem"
                    className="flex min-h-10 items-center rounded-lg px-3 text-sm hover:bg-[var(--harbor-mist)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
                    onClick={() => setProfileOpen(false)}
                  >
                    Sign in
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-[var(--harbor-mist)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)] disabled:opacity-60"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
