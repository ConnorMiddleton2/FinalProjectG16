"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ApplicationPartiesStep } from "@/components/portal/ApplicationPartiesStep";
import {
  readRentalApplicationDraft,
  writeRentalApplicationDraft,
  type RentalApplicationDraft,
} from "@/lib/rental-application";

type Props = { params: Promise<{ applicationId: string }> };

export default function OccupantsPage({ params }: Props) {
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
        err instanceof Error ? err.message : "Could not load application parties."
      );
    }
  }, [applicationId]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8 text-center">
        <h1 className="font-display text-3xl">Household and parties</h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">{error}</p>
        <Link href="/portal/apply" className="btn btn-neutral mt-6">
          Go to application
        </Link>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="space-y-4" aria-label="Loading parties">
        <div className="skeleton h-28 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-6 sm:p-8">
      <ApplicationPartiesStep
        applicationId={draft.id}
        property={draft.property}
        floorPlan={draft.floorPlan}
        desiredMoveInDate={draft.desiredMoveInDate}
        leaseTerm={draft.leaseTerm}
        primaryApplicantFullName={draft.applicantFullName}
        parties={draft.parties}
        onChange={(parties) => {
          const next = { ...draft, parties };
          setDraft(next);
          writeRentalApplicationDraft(next);
        }}
        disabled={draft.status === "submitted"}
      />
      <div className="mt-6">
        <Link href="/portal/apply" className="btn btn-outline btn-sm">
          Return to full application
        </Link>
      </div>
    </div>
  );
}
