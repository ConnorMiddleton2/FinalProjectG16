"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { ApplicationStatus, RentalApplication } from "@/lib/portal/future/models";
import {
  FUTURE_APPLY,
  FUTURE_CO_APPLICANTS,
  FUTURE_DOCUMENTS,
  FUTURE_FEE,
  FUTURE_LEASE_OFFER,
  FUTURE_REVIEW,
} from "@/lib/portal/future/paths";
import { getApplication } from "@/lib/portal/future/services";

const TIMELINE: ApplicationStatus[] = [
  "Draft",
  "Submitted",
  "Payment Pending",
  "Documents Required",
  "Under Review",
  "Screening in Progress",
  "Additional Information Requested",
  "Approved",
  "Conditionally Approved",
  "Lease Offer Available",
  "Lease Accepted",
];

function toneFor(status: ApplicationStatus) {
  if (status === "Denied" || status === "Withdrawn") return "danger" as const;
  if (status === "Approved" || status === "Lease Accepted") return "success" as const;
  if (status.includes("Pending") || status.includes("Required") || status.includes("Requested"))
    return "warning" as const;
  return "info" as const;
}

function StatusInner({ session }: { session: PortalTenantSession }) {
  const [app, setApp] = useState<RentalApplication | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getApplication(session.userId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        setStatus("error");
        return;
      }
      setApp(result.data);
      setStatus(result.data ? "ready" : "empty");
    })();
    return () => {
      cancelled = true;
    };
  }, [session.userId]);

  if (status === "loading") {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading application status…
      </p>
    );
  }
  if (status === "error") {
    return (
      <p className="portal-empty text-error" role="alert">
        {error}
      </p>
    );
  }
  if (status === "empty" || !app) {
    return (
      <PortalCard className="space-y-3">
        <p className="text-sm text-[var(--harbor-muted)]">
          You have not started an application yet.
        </p>
        <Link href={FUTURE_APPLY} className="portal-btn portal-btn-primary portal-focus">
          Start application
        </Link>
      </PortalCard>
    );
  }

  const currentIndex = TIMELINE.indexOf(app.status);

  return (
    <div className="space-y-4">
      <PortalCard className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
              {app.applicationNumber || "Draft application"}
            </p>
            <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
              {app.propertyName || "Unit not selected"} · {app.unitLabel || "—"}
            </h2>
          </div>
          <PortalStatusBadge tone={toneFor(app.status)}>
            {app.status}
          </PortalStatusBadge>
        </div>
        <p className="text-sm text-[var(--harbor-muted)]">
          {app.nextRequiredAction ?? "No action required right now."}
        </p>
        {app.confirmationNumber ? (
          <p className="text-sm text-[var(--harbor-ink)]">
            Confirmation: {app.confirmationNumber}
          </p>
        ) : null}
      </PortalCard>

      <PortalCard>
        <h2 className="portal-section-title mb-4">Status timeline</h2>
        <ol className="space-y-3">
          {TIMELINE.map((item, index) => {
            const reached =
              currentIndex >= 0
                ? index <= currentIndex
                : item === app.status;
            return (
              <li key={item} className="flex items-start gap-3">
                <span
                  className={`mt-1 h-3 w-3 rounded-full ${
                    reached ? "bg-[var(--harbor-mid)]" : "bg-[var(--harbor-mist)]"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={
                    item === app.status
                      ? "font-semibold text-[var(--harbor-ink)]"
                      : "text-sm text-[var(--harbor-muted)]"
                  }
                >
                  {item}
                </span>
              </li>
            );
          })}
        </ol>
      </PortalCard>

      <div className="flex flex-wrap gap-2">
        <Link href={FUTURE_APPLY} className="portal-btn portal-btn-secondary portal-focus">
          Continue application
        </Link>
        <Link href={FUTURE_DOCUMENTS} className="portal-btn portal-btn-secondary portal-focus">
          Documents
        </Link>
        <Link href={FUTURE_FEE} className="portal-btn portal-btn-secondary portal-focus">
          Fee
        </Link>
        <Link href={FUTURE_CO_APPLICANTS} className="portal-btn portal-btn-secondary portal-focus">
          Co-applicants
        </Link>
        <Link href={FUTURE_REVIEW} className="portal-btn portal-btn-secondary portal-focus">
          Review
        </Link>
        <Link href={FUTURE_LEASE_OFFER} className="portal-btn portal-btn-secondary portal-focus">
          Lease offer
        </Link>
      </div>
    </div>
  );
}

export function FutureApplicationStatusPage() {
  return (
    <RequireFutureApplicant>
      {(session) => <StatusInner session={session} />}
    </RequireFutureApplicant>
  );
}
