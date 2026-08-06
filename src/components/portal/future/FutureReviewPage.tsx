"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { RentalApplication } from "@/lib/portal/future/models";
import { FUTURE_STATUS } from "@/lib/portal/future/paths";
import { getDraft, saveDraft, submitApplication } from "@/lib/portal/future/services";

function ReviewInner({ session }: { session: PortalTenantSession }) {
  const [app, setApp] = useState<RentalApplication | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [certified, setCertified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getDraft(session.userId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        setStatus("error");
        return;
      }
      setApp(result.data);
      setCertified(Boolean(result.data.certifiedAt));
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [session.userId]);

  async function onSubmit() {
    if (!app) return;
    if (!certified) {
      setError("Confirm the certification before submitting.");
      return;
    }
    setSaving(true);
    setError(null);
    const saved = await saveDraft({
      ownerUserId: session.userId,
      currentStep: "16",
      draftPayload: { ...app.draftPayload, certified: "yes" },
    });
    if (!saved.ok) {
      setSaving(false);
      setError(saved.error.message);
      return;
    }
    const submitted = await submitApplication(session.userId);
    setSaving(false);
    if (!submitted.ok) {
      setError(submitted.error.message);
      return;
    }
    setApp(submitted.data);
    setMessage("Application submitted.");
  }

  if (status === "loading") {
    return <p className="text-sm text-[var(--harbor-muted)]" role="status">Loading review…</p>;
  }
  if (status === "error" || !app) {
    return <p className="portal-empty text-error" role="alert">{error ?? "Unable to load."}</p>;
  }

  return (
    <PortalCard className="space-y-4">
      <h2 className="portal-section-title">Review your application</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Applicant
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">
            {app.applicantName || session.displayName}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Unit
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">
            {app.propertyName || "—"} · {app.unitLabel || "Not selected"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Co-applicants
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">{app.coApplicants.length}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Documents
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">{app.documents.length}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Fee
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">
            {app.feePayment?.status ?? "unpaid"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Status
          </dt>
          <dd className="text-sm text-[var(--harbor-ink)]">{app.status}</dd>
        </div>
      </dl>

      <label className="flex min-h-11 items-start gap-3 text-sm text-[var(--harbor-ink)]">
        <input
          type="checkbox"
          className="checkbox mt-1"
          checked={certified}
          onChange={(e) => setCertified(e.target.checked)}
        />
        <span>
          I certify the information is accurate and authorize Harborline to
          screen this application.
        </span>
      </label>

      {error ? <p className="text-sm text-error" role="alert">{error}</p> : null}
      {message ? (
        <p className="text-sm text-[var(--harbor-mid)]" role="status">
          {message}{" "}
          <Link href={FUTURE_STATUS} className="font-semibold underline-offset-2 hover:underline">
            View status
          </Link>
        </p>
      ) : null}

      <button
        type="button"
        className="portal-btn portal-btn-primary portal-focus"
        onClick={() => void onSubmit()}
        disabled={saving || Boolean(app.submittedAt)}
      >
        {app.submittedAt ? "Already submitted" : saving ? "Submitting…" : "Submit application"}
      </button>
    </PortalCard>
  );
}

export function FutureReviewPage() {
  return (
    <RequireFutureApplicant>
      {(session) => <ReviewInner session={session} />}
    </RequireFutureApplicant>
  );
}
