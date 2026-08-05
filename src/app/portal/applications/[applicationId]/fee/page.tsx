"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ApplicationFeeStep } from "@/components/portal/ApplicationFeeStep";
import {
  readApplicationStatusRecord,
  updatePublicApplicationStatus,
} from "@/lib/application-status";
import {
  readApplicationForReview,
  writeFullSubmittedApplication,
  writeRentalApplicationDraft,
  type RentalApplicationDraft,
} from "@/lib/rental-application";

type Props = { params: Promise<{ applicationId: string }> };

export default function ApplicationFeePage({ params }: Props) {
  const { applicationId } = use(params);
  const [draft, setDraft] = useState<RentalApplicationDraft | null>(null);
  const [paymentPermitted, setPaymentPermitted] = useState(false);
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
        setPaymentPermitted(
          existing.status === "draft" ||
            publicStatus?.currentStatus === "Payment Pending"
        );
        setDraft(existing);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load application fee details."
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applicationId]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8 text-center">
        <h1 className="font-display text-3xl">Application fee</h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">{error}</p>
        <Link href="/portal/apply" className="btn btn-neutral mt-6">
          Go to application
        </Link>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="space-y-4" aria-label="Loading application fee">
        <div className="skeleton h-28 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-6 sm:p-8">
      <ApplicationFeeStep
        applicationId={draft.id}
        property={draft.property}
        floorPlan={draft.floorPlan}
        applicantFullName={draft.applicantFullName}
        applicantEmail={draft.email}
        disabled={!paymentPermitted}
        fee={{
          feeAcknowledged: draft.feeAcknowledged,
          feeRefundPolicyAcknowledged: draft.feeRefundPolicyAcknowledged,
          feePaymentMethod: draft.feePaymentMethod,
          feeBillingName: draft.feeBillingName,
          feeBillingEmail: draft.feeBillingEmail,
          feeBillingStreet: draft.feeBillingStreet,
          feeBillingCity: draft.feeBillingCity,
          feeBillingState: draft.feeBillingState,
          feeBillingZip: draft.feeBillingZip,
          feeStatus: draft.feeStatus,
          feePaymentReference: draft.feePaymentReference,
          feePaidAt: draft.feePaidAt,
          feeReceiptId: draft.feeReceiptId,
          feeIdempotencyKey: draft.feeIdempotencyKey,
        }}
        onChange={(partial) => {
          if (partial.feeStatus === "paid") {
            updatePublicApplicationStatus(
              applicationId,
              "Submitted",
              "Application fee completed. Application is ready for leasing review."
            );
          }
          setDraft((current) => {
            if (!current) return current;
            const next = { ...current, ...partial };
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
