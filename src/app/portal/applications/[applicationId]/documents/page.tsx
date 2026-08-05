"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ApplicationDocumentsUpload } from "@/components/portal/ApplicationDocumentsUpload";
import {
  readRentalApplicationDraft,
  writeRentalApplicationDraft,
  type RentalApplicationDraft,
} from "@/lib/rental-application";

type Props = { params: Promise<{ applicationId: string }> };

export default function DocumentsPage({ params }: Props) {
  const { applicationId } = use(params);
  const [draft, setDraft] = useState<RentalApplicationDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const existing = readRentalApplicationDraft();
      if (!existing || existing.id !== applicationId) {
        setError(
          "No matching draft in this browser. Open Apply to continue your application."
        );
        setDraft(null);
        return;
      }
      setDraft(existing);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load application documents."
      );
    }
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
        disabled={draft.status === "submitted"}
        onChange={(updater) => {
          setDraft((current) => {
            if (!current) return current;
            const next = {
              ...current,
              documents: updater(current.documents),
            };
            writeRentalApplicationDraft(next);
            return next;
          });
        }}
      />
      <div className="mt-6">
        <Link href="/portal/apply" className="btn btn-outline btn-sm">
          Return to full application
        </Link>
      </div>
    </div>
  );
}
