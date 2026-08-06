"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { ensurePortalDemoCookies } from "@/app/portal/demo-actions";
import { PortalCard } from "@/components/portal/PortalCard";
import {
  FUTURE_TENANT_LOGIN_PATH,
  FUTURE_TENANT_SIGNUP_PATH,
  PORTAL_HOME_PATH,
  type PortalTenantSession,
} from "@/lib/portal/auth";
import {
  readCurrentTenantSessionSync,
  readFutureApplicantSessionSync,
} from "@/lib/portal/auth-client";
import {
  PORTAL_DEMO_SESSION_STORAGE_KEY,
  PORTAL_FUTURE_DEMO_APPLICANT,
} from "@/lib/portal/portal-demo-auth";
import { isTenantAuthDemoMode } from "@/lib/portal/tenant-auth-demo";

type Props = {
  children: ReactNode | ((session: PortalTenantSession) => ReactNode);
  title?: string;
  description?: string;
  /** When true (Apply page), auto-start demo applicant in development. */
  autoDemo?: boolean;
};

/**
 * Guards private Future Tenant pages.
 * Resolves sync from sessionStorage first — never stuck on "Checking…".
 */
export function RequireFutureApplicant({
  children,
  title = "Sign in to continue",
  description = "This area is for Harborline applicants. Continue as a demo applicant to fill out the rental application, or sign in.",
  autoDemo = false,
}: Props) {
  const pathname = usePathname();
  const demoMode = isTenantAuthDemoMode();

  const [applicant, setApplicant] = useState<PortalTenantSession | null>(null);
  const [currentTenantBlocked, setCurrentTenantBlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [demoPending, startDemo] = useTransition();
  const [demoError, setDemoError] = useState<string | null>(null);

  function activateDemoApplicant() {
    try {
      window.sessionStorage.setItem(
        PORTAL_DEMO_SESSION_STORAGE_KEY,
        JSON.stringify(PORTAL_FUTURE_DEMO_APPLICANT)
      );
    } catch {
      /* ignore */
    }
    setCurrentTenantBlocked(false);
    setApplicant(PORTAL_FUTURE_DEMO_APPLICANT);
    setReady(true);
  }

  function continueAsDemoApplicant() {
    setDemoError(null);
    startDemo(async () => {
      try {
        activateDemoApplicant();
        await ensurePortalDemoCookies();
      } catch (err) {
        setDemoError(
          err instanceof Error ? err.message : "Could not start demo applicant."
        );
      }
    });
  }

  useEffect(() => {
    const future = readFutureApplicantSessionSync();
    if (future) {
      setApplicant(future);
      setCurrentTenantBlocked(false);
      setReady(true);
      return;
    }

    const current = readCurrentTenantSessionSync();
    if (current) {
      setApplicant(null);
      setCurrentTenantBlocked(true);
      setReady(true);
      return;
    }

    // No session — show gate immediately (or auto-demo on Apply).
    setApplicant(null);
    setCurrentTenantBlocked(false);
    setReady(true);

    if (autoDemo && demoMode) {
      activateDemoApplicant();
      void ensurePortalDemoCookies().catch(() => {
        /* cookie optional for client-rendered wizard */
      });
    }
  }, [pathname, autoDemo, demoMode]);

  if (!ready) {
    return (
      <PortalCard>
        <p className="text-sm text-[var(--harbor-muted)]" role="status">
          Loading…
        </p>
      </PortalCard>
    );
  }

  if (currentTenantBlocked && !applicant) {
    const loginHref = `${FUTURE_TENANT_LOGIN_PATH}?next=${encodeURIComponent(pathname)}`;
    return (
      <PortalCard className="space-y-4">
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
            Applicant access required
          </h2>
          <p className="text-[var(--harbor-muted)]">
            You are signed in as a current tenant. Switch to an applicant
            session to use the rental application.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="portal-btn portal-btn-primary portal-focus"
            disabled={demoPending}
            onClick={continueAsDemoApplicant}
          >
            {demoPending ? "Starting…" : "Continue as demo applicant"}
          </button>
          <Link href={loginHref} className="portal-btn portal-btn-secondary portal-focus">
            Sign in as applicant
          </Link>
          <Link
            href={PORTAL_HOME_PATH}
            className="portal-btn portal-btn-secondary portal-focus"
          >
            Current tenant portal
          </Link>
        </div>
        {demoError ? (
          <p className="text-sm text-error" role="alert">
            {demoError}
          </p>
        ) : null}
      </PortalCard>
    );
  }

  if (!applicant) {
    const loginHref = `${FUTURE_TENANT_LOGIN_PATH}?next=${encodeURIComponent(pathname)}`;
    const signupHref = `${FUTURE_TENANT_SIGNUP_PATH}?next=${encodeURIComponent(pathname)}`;
    return (
      <PortalCard className="space-y-4">
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
            {title}
          </h2>
          <p className="text-[var(--harbor-muted)]">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="portal-btn portal-btn-primary portal-focus"
            disabled={demoPending}
            onClick={continueAsDemoApplicant}
          >
            {demoPending ? "Starting…" : "Start rental application"}
          </button>
          <Link href={loginHref} className="portal-btn portal-btn-secondary portal-focus">
            Sign in
          </Link>
          <Link href={signupHref} className="portal-btn portal-btn-secondary portal-focus">
            Create account
          </Link>
        </div>
        {demoError ? (
          <p className="text-sm text-error" role="alert">
            {demoError}
          </p>
        ) : null}
      </PortalCard>
    );
  }

  return <>{typeof children === "function" ? children(applicant) : children}</>;
}
