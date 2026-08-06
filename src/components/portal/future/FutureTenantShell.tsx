"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import { portalDemoLogout } from "@/app/portal/demo-actions";
import { FutureTenantNav } from "@/components/portal/future/FutureTenantNav";
import { PortalBreadcrumbs } from "@/components/portal/PortalBreadcrumbs";
import { usePortalModal } from "@/hooks/usePortalModal";
import {
  FUTURE_TENANT_LOGIN_PATH,
  FUTURE_TENANT_SIGNUP_PATH,
  PORTAL_START_PATH,
} from "@/lib/portal/auth";
import { getAnyPortalSessionClient } from "@/lib/portal/auth-client";
import {
  FUTURE_HOME,
  FUTURE_MESSAGES,
  FUTURE_PROFILE,
} from "@/lib/portal/future/paths";
import {
  FUTURE_PAGE_META,
  resolveFuturePageMeta,
} from "@/lib/portal/future/nav";
import { PORTAL_DEMO_SESSION_STORAGE_KEY } from "@/lib/portal/portal-demo-auth";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: React.ReactNode;
  email?: string;
  displayName?: string;
  isSignedIn?: boolean;
};

function buildBreadcrumbs(pathname: string) {
  const items: { label: string; href?: string }[] = [
    { label: "Future tenant", href: FUTURE_HOME },
  ];
  if (pathname === FUTURE_HOME) {
    return [{ label: "Home" }];
  }

  const segments = pathname
    .replace(FUTURE_HOME, "")
    .split("/")
    .filter(Boolean);

  let cursor = FUTURE_HOME;
  for (const segment of segments) {
    cursor = `${cursor}/${segment}`;
    const meta = FUTURE_PAGE_META[cursor];
    const isLast = cursor === pathname || pathname.startsWith(`${cursor}/`);
    items.push({
      label: meta?.title ?? segment.replace(/-/g, " "),
      href: isLast && cursor === pathname ? undefined : cursor,
    });
  }

  if (items.length > 1) {
    items[items.length - 1] = {
      ...items[items.length - 1]!,
      href: undefined,
    };
  }
  return items;
}

/** Fallback when browser history cannot go back. */
function futureBackFallback(pathname: string): string {
  if (pathname === FUTURE_HOME || pathname === `${FUTURE_HOME}/`) {
    return PORTAL_START_PATH;
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 2) return FUTURE_HOME;
  segments.pop();
  return `/${segments.join("/")}`;
}

export function FutureTenantShell({
  children,
  email: emailProp,
  displayName: displayNameProp,
  isSignedIn: isSignedInProp,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const mobileNavId = useId();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const meta = resolveFuturePageMeta(pathname);
  const breadcrumbs = buildBreadcrumbs(pathname);
  const isLanding = pathname === FUTURE_HOME;
  /** Only show auth chrome after mount so SSR HTML matches first client paint. */
  const showSignedIn = sessionReady && signedIn;

  const closeMobileNav = () => setMobileOpen(false);
  const { containerRef } = usePortalModal({
    open: mobileOpen,
    onClose: closeMobileNav,
    restoreFocusRef: menuButtonRef,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    void getAnyPortalSessionClient().then((session) => {
      if (cancelled) return;
      if (session) {
        setSessionEmail(session.email);
        setSessionName(session.displayName);
        setSignedIn(true);
      } else {
        setSessionEmail(emailProp ?? "");
        setSessionName(displayNameProp ?? "");
        setSignedIn(Boolean(isSignedInProp));
      }
      setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, pathname, emailProp, displayNameProp, isSignedInProp]);

  const loginHref = `${FUTURE_TENANT_LOGIN_PATH}?next=${encodeURIComponent(pathname)}`;
  const signupHref = `${FUTURE_TENANT_SIGNUP_PATH}?next=${encodeURIComponent(pathname)}`;

  function handleBack() {
    closeMobileNav();
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(futureBackFallback(pathname));
  }

  function handleSignOut() {
    startSignOut(async () => {
      try {
        window.sessionStorage.removeItem(PORTAL_DEMO_SESSION_STORAGE_KEY);
        window.sessionStorage.removeItem(
          "harborline.portal.futureInviteSeed.v1"
        );
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
        /* guest / demo may not have Supabase auth */
      }
      setSignedIn(false);
      setSessionEmail("");
      setSessionName("");
      router.push(FUTURE_HOME);
      router.refresh();
    });
  }

  if (!mounted) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-sm text-[var(--harbor-muted)]" role="status">
            Loading leasing portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <a
        href="#future-tenant-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-[var(--harbor-ink)] focus:shadow-lg portal-focus"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <button
              ref={menuButtonRef}
              type="button"
              className="btn btn-ghost min-h-11 min-w-11 px-2 text-[var(--harbor-sand)] portal-focus lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls={mobileNavId}
              onClick={() => setMobileOpen(!mobileOpen)}
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

            <button
              type="button"
              onClick={handleBack}
              className="btn btn-ghost min-h-11 gap-1 px-2 text-[var(--harbor-sand)] portal-focus sm:px-3"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Back</span>
              <span className="sr-only sm:hidden">Back</span>
            </button>

            <Link
              href={FUTURE_HOME}
              className="flex min-w-0 items-center gap-2 rounded-lg portal-focus sm:gap-3"
            >
              <span className="rounded-xl bg-[var(--harbor-sand)]/15 p-2 text-[var(--harbor-sand)]">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="font-display block truncate text-xl leading-tight sm:text-2xl">
                  Harborline
                </span>
                <span className="block truncate text-xs opacity-70">
                  Future tenant · Leasing
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className="btn btn-ghost min-h-11 text-[var(--harbor-sand)] portal-focus"
            >
              Website home
            </Link>
            {showSignedIn ? (
              <>
                <Link
                  href={FUTURE_PROFILE}
                  className="btn btn-ghost min-h-11 max-w-[9rem] gap-2 text-[var(--harbor-sand)] portal-focus sm:max-w-[12rem]"
                  title={sessionEmail || sessionName}
                >
                  <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate text-sm">
                    {sessionName || sessionEmail || "Applicant"}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="portal-btn portal-btn-secondary min-h-11 gap-1 border-[var(--harbor-sand)]/40 text-[var(--harbor-sand)] portal-focus"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {signingOut ? "Signing out..." : "Sign out"}
                  </span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href={loginHref}
                  className="btn btn-ghost min-h-11 text-[var(--harbor-sand)] portal-focus"
                >
                  Sign in
                </Link>
                <Link
                  href={signupHref}
                  className="portal-btn portal-btn-secondary min-h-11 border-[var(--harbor-sand)]/40 text-[var(--harbor-sand)] portal-focus"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--harbor-ink)]/40 lg:hidden"
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-8">
        <aside
          id={mobileNavId}
          ref={mobileOpen ? containerRef : undefined}
          role={mobileOpen ? "dialog" : undefined}
          aria-modal={mobileOpen ? true : undefined}
          aria-label="Main navigation"
          tabIndex={mobileOpen ? -1 : undefined}
          className={`z-50 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-3 shadow-sm outline-none lg:sticky lg:top-24 lg:z-auto lg:block lg:self-start ${
            mobileOpen
              ? "fixed left-4 right-4 top-20 max-h-[calc(100vh-6rem)] overflow-y-auto"
              : "hidden lg:block"
          }`}
        >
          <FutureTenantNav
            onNavigate={closeMobileNav}
            onBack={handleBack}
            onSignOut={showSignedIn ? handleSignOut : undefined}
            signingOut={signingOut}
            signedIn={showSignedIn}
          />
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap gap-2 lg:hidden">
            <Link
              href="/"
              className="portal-btn portal-btn-secondary min-h-11 portal-focus"
            >
              Website home
            </Link>
            <button
              type="button"
              onClick={handleBack}
              className="portal-btn portal-btn-secondary min-h-11 gap-1 portal-focus"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            {showSignedIn ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="portal-btn portal-btn-secondary min-h-11 gap-1 portal-focus"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            ) : null}
          </div>

          {!isLanding ? (
            <div className="space-y-3">
              <PortalBreadcrumbs items={breadcrumbs} />
              <header className="space-y-2">
                <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
                  {meta.title}
                </h1>
                <p className="max-w-2xl text-[var(--harbor-muted)]">
                  {meta.description}
                </p>
              </header>
            </div>
          ) : null}

          <main id="future-tenant-main" className="min-w-0" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>

      <footer className="border-t border-[var(--harbor-deep)]/10 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <p className="text-sm text-[var(--harbor-muted)]">
            Harborline Leasing · Future tenant portal
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline portal-focus rounded"
            >
              Website home
            </Link>
            <button
              type="button"
              onClick={handleBack}
              className="text-sm font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline portal-focus rounded"
            >
              Back
            </button>
            {showSignedIn ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-sm font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline portal-focus rounded disabled:opacity-60"
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            ) : null}
            <Link
              href={FUTURE_MESSAGES}
              className="text-sm font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline portal-focus rounded"
            >
              Contact leasing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
