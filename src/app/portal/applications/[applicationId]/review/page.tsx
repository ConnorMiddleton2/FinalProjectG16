"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ApplicationReviewStep } from "@/components/portal/ApplicationReviewStep";
import {
  getApplicationStepIndex,
  isApplicationLocked,
  readApplicationForReview,
  writeFullSubmittedApplication,
  writeRentalApplicationDraft,
  type ApplicationStepId,
  type RentalApplicationDraft,
} from "@/lib/rental-application";

type Props = { params: Promise<{ applicationId: string }> };

export default function ApplicationReviewPage({ params }: Props) {
  const { applicationId } = use(params);
  const [draft, setDraft] = useState<RentalApplicationDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const existing = readApplicationForReview(applicationId);
      if (!existing) {
        setError(
          "No application found in this browser for that ID. Open Apply or Application status to continue."
        );
        setDraft(null);
        return;
      }
      setDraft(existing);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load application for review."
      );
    }
  }, [applicationId]);

  function persist(next: RentalApplicationDraft) {
    if (next.status === "submitted") {
      writeFullSubmittedApplication(next);
    } else {
      writeRentalApplicationDraft(next);
    }
    setDraft(next);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8 text-center">
        <h1 className="font-display text-3xl">Review and certification</h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">{error}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/portal/apply" className="btn btn-neutral">
            Go to application
          </Link>
          <Link href="/portal/applications" className="btn btn-outline">
            Application status
          </Link>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="space-y-4" aria-label="Loading application review">
        <div className="skeleton h-28 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const locked = isApplicationLocked(draft);

  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-6 sm:p-8">
      <ApplicationReviewStep
        draft={draft}
        showSubmitButton={!locked && draft.status === "draft"}
        onChange={(partial) => {
          if (locked) return;
          persist({ ...draft, ...partial });
        }}
        onEditStep={(stepId: ApplicationStepId) => {
          if (locked) return;
          const stepIndex = getApplicationStepIndex(stepId);
          persist({ ...draft, stepIndex: Math.max(0, stepIndex) });
          window.location.assign("/portal/apply");
        }}
        onSubmit={() => {
          window.location.assign("/portal/apply");
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Link href="/portal/apply" className="btn btn-outline btn-sm">
          {locked ? "Open application summary" : "Return to full application"}
        </Link>
        <Link href="/portal/applications" className="btn btn-ghost btn-sm">
          Application status
        </Link>
      </div>
    </div>
  );
}
