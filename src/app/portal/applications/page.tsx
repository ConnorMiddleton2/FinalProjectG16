"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import {
  readRentalApplicationDraft,
  readSubmittedApplications,
  type SubmittedApplication,
} from "@/lib/rental-application";

export default function ApplicationStatusPage() {
  const [submissions, setSubmissions] = useState<SubmittedApplication[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setError(null);
    try {
      setSubmissions(readSubmittedApplications());
      const draft = readRentalApplicationDraft();
      setHasDraft(Boolean(draft && draft.status === "draft"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load applications."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Applicant journey
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          Application status
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Track submitted Harborline applications and resume an in-progress
          draft.
        </p>
      </div>

      {error ? (
        <div className="alert border-error/20 bg-error/10">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1 text-sm">{error}</div>
          <button type="button" className="btn btn-sm btn-outline gap-1" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="skeleton h-40 w-full rounded-3xl" />
      ) : (
        <>
          {hasDraft ? (
            <div className="rounded-2xl border border-[var(--harbor-mid)]/25 bg-[var(--harbor-mist)]/40 p-5">
              <p className="font-semibold">You have a saved draft</p>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
                Continue where you left off. Your progress autosaves in this
                browser.
              </p>
              <Link href="/portal/apply" className="btn btn-neutral btn-sm mt-4">
                Continue application
              </Link>
            </div>
          ) : null}

          {submissions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/65 px-6 py-14 text-center">
              <FileText className="mx-auto h-10 w-10 text-[var(--harbor-mid)]" />
              <h2 className="mt-4 font-display text-3xl">No submissions yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--harbor-ink)]/60">
                Start a rental application to receive a confirmation number.
              </p>
              <Link href="/portal/apply" className="btn btn-neutral mt-6">
                Start application
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {submissions.map((submission) => (
                <li
                  key={submission.confirmationNumber}
                  className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
                        Confirmation {submission.confirmationNumber}
                      </p>
                      <h2 className="mt-1 font-display text-2xl">
                        {submission.property}
                      </h2>
                      <p className="text-sm text-[var(--harbor-ink)]/65">
                        {submission.floorPlan}
                      </p>
                      <p className="mt-2 text-sm">
                        Submitted{" "}
                        {new Date(submission.submittedAt).toLocaleString()} ·{" "}
                        {submission.applicantFullName}
                      </p>
                    </div>
                    <span className="badge badge-info">In review</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
