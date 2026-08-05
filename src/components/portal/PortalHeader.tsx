"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
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
import { portalDemoLogout } from "@/app/portal/demo-actions";
import { createClient } from "@/lib/supabase/client";
import { useNotificationUnreadBadge } from "@/hooks/useTenantNotifications";
import { PORTAL_HELP_HREF, PORTAL_HELP_LABEL } from "@/lib/portal/nav";
import { PORTAL_DEMO_SESSION_STORAGE_KEY } from "@/lib/portal/portal-demo-auth";

type Props = {
  email: string;
  displayName: string;
  isSignedIn: boolean;
  mobileNavId: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
};

export function PortalHeader({
  email,
  displayName,
  isSignedIn,
  mobileNavId,
  mobileOpen,
  onMobileOpenChange,
  menuButtonRef,
}: Props) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);
  const profileButtonId = useId();
  const profileMenuId = useId();
  const { unreadCount } = useNotificationUnreadBadge();

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
      window.sessionStorage.removeItem(PORTAL_DEMO_SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    try {
      await portalDemoLogout();
    } catch {
      /* demo cookie may already be cleared */
    }
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
            ref={menuButtonRef}
            type="button"
            className="btn btn-ghost min-h-11 min-w-11 px-2 text-[var(--harbor-sand)] portal-focus lg:hidden"
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
            className="btn btn-ghost min-h-11 hidden text-[var(--harbor-sand)] portal-focus sm:inline-flex"
          >
            Welcome
          </Link>
          <Link
            href={PORTAL_HELP_HREF}
            className="btn btn-ghost min-h-11 hidden gap-1 text-[var(--harbor-sand)] portal-focus md:inline-flex"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {PORTAL_HELP_LABEL}
          </Link>

          <Link
            href="/portal/notifications"
            className="btn btn-ghost relative min-h-11 min-w-11 px-2 text-[var(--harbor-sand)] portal-focus"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span
                className="absolute right-1 top-1 rounded-full bg-[var(--harbor-glow)] px-1.5 text-[10px] font-semibold leading-4 text-[var(--harbor-ink)]"
                aria-hidden="true"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="relative" ref={profileWrapRef}>
            <button
              type="button"
              id={profileButtonId}
              className="btn btn-ghost min-h-11 max-w-[9rem] gap-1 text-[var(--harbor-sand)] portal-focus sm:max-w-[16rem]"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-controls={profileMenuId}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{displayName}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
            </button>

            {profileOpen ? (
              <div
                id={profileMenuId}
                role="menu"
                aria-labelledby={profileButtonId}
                className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-[var(--harbor-deep)]/10 bg-white p-2 text-[var(--harbor-ink)] shadow-lg"
              >
                <p className="truncate px-3 py-2 text-xs text-[var(--harbor-muted)]" role="none">
                  {email}
                </p>
                <Link
                  href="/portal/profile"
                  role="menuitem"
                  className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-[var(--harbor-mist)]/80 portal-focus"
                  onClick={() => setProfileOpen(false)}
                >
                  Profile
                </Link>
                {!isSignedIn ? (
                  <Link
                    href="/login"
                    role="menuitem"
                    className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-[var(--harbor-mist)]/80 portal-focus"
                    onClick={() => setProfileOpen(false)}
                  >
                    Sign in
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-[var(--harbor-mist)]/80 portal-focus disabled:opacity-60"
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
