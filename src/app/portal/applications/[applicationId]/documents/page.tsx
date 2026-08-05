"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ApplicationDocumentsUpload } from "@/components/portal/ApplicationDocumentsUpload";
import { readApplicationStatusRecord } from "@/lib/application-status";
import {
  readApplicationForReview,
  writeFullSubmittedApplication,
  writeRentalApplicationDraft,
  type RentalApplicationDraft,
} from "@/lib/rental-application";

type Props = { params: Promise<{ applicationId: string }> };

export default function DocumentsPage({ params }: Props) {
  const { applicationId } = use(params);
  const [draft, setDraft] = useState<RentalApplicationDraft | null>(null);
  const [uploadsPermitted, setUploadsPermitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const existing = readApplicationForReview(applicationId);
        if (!existing) {
          setError("No matching application was found in this browser.");
          setDraft(null);
          return;
        }
        const publicStatus = readApplicationStatusRecord(applicationId);
        setUploadsPermitted(
          existing.status === "draft" ||
            publicStatus?.currentStatus === "Documents Required" ||
            publicStatus?.currentStatus === "Additional Information Requested"
        );
        setDraft(existing);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load application documents."
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applicationId]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8 text-center">
        <h1 className="font-display text-3xl">Document uploads</h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">{error}</p>
        <Link href="/portal/apply" className="btn btn-neutral mt-6">
          Go to application
        </Link>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="space-y-4" aria-label="Loading documents">
        <div className="skeleton h-28 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-6 sm:p-8">
      <ApplicationDocumentsUpload
        documents={draft.documents}
        disabled={!uploadsPermitted}
        onChange={(updater) => {
          setDraft((current) => {
            if (!current) return current;
            const next = {
              ...current,
              documents: updater(current.documents),
            };
            if (next.status === "submitted") {
              writeFullSubmittedApplication(next);
            } else {
              writeRentalApplicationDraft(next);
            }
            return next;
          });
        }}
      />
      <div className="mt-6">
        <Link href="/portal/applications" className="btn btn-outline btn-sm">
          Return to application status
        </Link>
      </div>
    </div>
  );
}
