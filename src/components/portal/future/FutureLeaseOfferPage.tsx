"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { LeaseOffer } from "@/lib/portal/future/models";
import { FUTURE_ONBOARDING } from "@/lib/portal/future/paths";
import {
  acceptOffer,
  declineOffer,
  getOffer,
} from "@/lib/portal/future/services";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function LeaseOfferInner({ session }: { session: PortalTenantSession }) {
  const [offer, setOffer] = useState<LeaseOffer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getOffer(session.userId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        setStatus("error");
        return;
      }
      setOffer(result.data);
      setStatus(result.data ? "ready" : "empty");
    });
    return () => {
      cancelled = true;
    };
  }, [session.userId]);

  async function onAccept() {
    setBusy(true);
    setError(null);
    const result = await acceptOffer(session.userId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setOffer(result.data);
    setMessage("Offer accepted. Continue with move-in onboarding.");
  }

  async function onDecline() {
    setBusy(true);
    setError(null);
    const result = await declineOffer(session.userId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setOffer(result.data);
    setMessage("Offer declined.");
  }

  if (status === "loading") {
    return <p className="text-sm text-[var(--harbor-muted)]" role="status">Loading lease offer…</p>;
  }
  if (status === "error") {
    return <p className="portal-empty text-error" role="alert">{error}</p>;
  }
  if (status === "empty" || !offer) {
    return (
      <PortalCard>
        <p className="text-sm text-[var(--harbor-muted)]">
          No lease offer is available yet. Check back after your application is
          approved.
        </p>
      </PortalCard>
    );
  }

  return (
    <PortalCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
            {offer.propertyName} · {offer.unitLabel}
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            Offer expires {offer.offerExpiresAt.slice(0, 10)}
          </p>
        </div>
        <PortalStatusBadge
          tone={
            offer.status === "accepted"
              ? "success"
              : offer.status === "declined" || offer.status === "expired"
                ? "danger"
                : "info"
          }
        >
          {offer.status}
        </PortalStatusBadge>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Rent
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">{formatMoney(offer.rent)} / month</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Deposit
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">{formatMoney(offer.deposit)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Lease term
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">
            {offer.leaseTerm} ({offer.leaseStartDate} – {offer.leaseEndDate})
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Utilities
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">{offer.includedUtilities}</dd>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">Documents</h3>
        <ul className="mt-2 list-disc pl-5 text-sm text-[var(--harbor-muted)]">
          {offer.documentTitles.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">Next steps</h3>
        <ul className="mt-2 list-disc pl-5 text-sm text-[var(--harbor-muted)]">
          {offer.requiredNextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      {error ? <p className="text-sm text-error" role="alert">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--harbor-mid)]" role="status">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="portal-btn portal-btn-primary portal-focus"
          disabled={busy || offer.status !== "available"}
          onClick={() => void onAccept()}
        >
          Accept offer
        </button>
        <button
          type="button"
          className="portal-btn portal-btn-secondary portal-focus"
          disabled={busy || offer.status !== "available"}
          onClick={() => void onDecline()}
        >
          Decline offer
        </button>
        {offer.status === "accepted" ? (
          <Link href={FUTURE_ONBOARDING} className="portal-btn portal-btn-secondary portal-focus">
            Go to onboarding
          </Link>
        ) : null}
      </div>
      <p className="text-xs text-[var(--harbor-muted)]">
        Portal acceptance is not a complete legal signature event by itself.
      </p>
    </PortalCard>
  );
}

export function FutureLeaseOfferPage() {
  return (
    <RequireFutureApplicant>
      {(session) => <LeaseOfferInner session={session} />}
    </RequireFutureApplicant>
  );
}
