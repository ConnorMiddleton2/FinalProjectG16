"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { LeaseSignPackage } from "@/lib/portal/future/lease-sign-types";
import { FUTURE_ONBOARDING } from "@/lib/portal/future/paths";
import {
  completeLeaseSignature,
  getLeaseSignPackage,
} from "@/lib/portal/future/services";

function toneForStatus(status: LeaseSignPackage["status"]) {
  if (status === "signed") return "success" as const;
  if (status === "voided" || status === "expired") return "danger" as const;
  return "info" as const;
}

function LeaseSignInner({ session }: { session: PortalTenantSession }) {
  const [pkg, setPkg] = useState<LeaseSignPackage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getLeaseSignPackage(session.userId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        setStatus("error");
        return;
      }
      setPkg(result.data);
      if (result.data.signerName) setSignerName(result.data.signerName);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [session.userId]);

  async function onSign(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await completeLeaseSignature(session.userId, {
      signerName,
      agreedToTerms: agreed,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPkg(result.data);
    setMessage(
      `Lease signed by ${result.data.signerName} on ${result.data.signedAt?.slice(0, 10)}.`
    );
  }

  if (status === "loading") {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading lease packet...
      </p>
    );
  }
  if (status === "error" || !pkg) {
    return (
      <p className="text-sm text-error" role="alert">
        {error ?? "Could not load the lease signing packet."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PortalCard className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
              {pkg.propertyName} · {pkg.unitLabel}
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-muted)]">
              {pkg.occupancyClass} · {pkg.rentLabel} · {pkg.leaseTerm}
            </p>
            <p className="mt-1 text-xs text-[var(--harbor-muted)]">
              Packet expires {pkg.expiresAt.slice(0, 10)}
            </p>
          </div>
          <PortalStatusBadge tone={toneForStatus(pkg.status)}>
            {pkg.status.replace(/_/g, " ")}
          </PortalStatusBadge>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">
            Documents to sign
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-[var(--harbor-muted)]">
            {pkg.documents.map((doc) => (
              <li key={doc.id}>
                {doc.title} · {doc.pages} pages
              </li>
            ))}
          </ul>
        </div>
      </PortalCard>

      {pkg.status === "signed" ? (
        <PortalCard className="space-y-3">
          <p className="text-sm text-[var(--harbor-ink)]" role="status">
            Signed by <strong>{pkg.signerName}</strong>
            {pkg.signedAt ? ` on ${pkg.signedAt.slice(0, 10)}` : ""}.
          </p>
          {message ? (
            <p className="text-sm text-[var(--harbor-mid)]">{message}</p>
          ) : null}
          <Link
            href={FUTURE_ONBOARDING}
            className="portal-btn portal-btn-primary portal-focus inline-flex"
          >
            Continue to onboarding
          </Link>
        </PortalCard>
      ) : (
        <PortalCard as="form" onSubmit={onSign} className="space-y-4">
          <h2 className="portal-section-title">Electronic signature</h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            Type your full legal name to apply an electronic signature to this
            lease packet. This is a demo signature flow and is separate from
            accepting a lease offer.
          </p>
          <PortalField
            label="Full legal name"
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder={session.displayName || "Jordan Applicant"}
            disabled={pkg.status !== "awaiting_signature"}
          />
          <label className="flex items-start gap-3 text-sm text-[var(--harbor-ink)]">
            <input
              type="checkbox"
              className="portal-native-checkbox"
              checked={agreed}
              disabled={pkg.status !== "awaiting_signature"}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I agree that typing my name constitutes my electronic signature
              on the documents listed above (demo acknowledgment under
              electronic signature laws).
            </span>
          </label>
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-[var(--harbor-ink)]" role="status">
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            className="portal-btn portal-btn-primary portal-focus"
            disabled={
              busy ||
              pkg.status !== "awaiting_signature" ||
              !signerName.trim() ||
              !agreed
            }
          >
            {busy ? "Signing..." : "Sign lease packet"}
          </button>
        </PortalCard>
      )}
    </div>
  );
}

export function FutureLeaseSignPage() {
  return (
    <RequireFutureApplicant>
      {(session) => <LeaseSignInner session={session} />}
    </RequireFutureApplicant>
  );
}
