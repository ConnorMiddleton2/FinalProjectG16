"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Receipt,
  Shield,
} from "lucide-react";
import {
  APPLICATION_FEE_AMOUNT_CENTS,
  APPLICATION_FEE_LABEL,
  createFeeIdempotencyKey,
  createMockPaymentReference,
  feePaymentMethodLabel,
  formatFeeAmount,
  isApplicationFeePaid,
  processMockApplicationFee,
  readFeeReceiptByApplication,
  validateFeeBilling,
  type ApplicationFeeReceipt,
  type FeeBillingDetails,
  type FeePaymentMethod,
  type FeePaymentStatus,
} from "@/lib/application-fee";

export type ApplicationFeeDraftFields = {
  feeAcknowledged: boolean;
  feeRefundPolicyAcknowledged: boolean;
  feePaymentMethod: FeePaymentMethod;
  feeBillingName: string;
  feeBillingEmail: string;
  feeBillingStreet: string;
  feeBillingCity: string;
  feeBillingState: string;
  feeBillingZip: string;
  feeStatus: FeePaymentStatus;
  feePaymentReference: string;
  feePaidAt: string;
  feeReceiptId: string;
  feeIdempotencyKey: string;
};

type Props = {
  applicationId: string;
  property: string;
  floorPlan: string;
  applicantFullName: string;
  applicantEmail: string;
  fee: ApplicationFeeDraftFields;
  onChange: (partial: Partial<ApplicationFeeDraftFields>) => void;
  disabled?: boolean;
};

type FeePhase = "policy" | "method" | "billing" | "review" | "receipt";

function RequiredMark() {
  return (
    <span className="text-error" aria-hidden="true">
      *
    </span>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
      {children}
      {required ? (
        <>
          {" "}
          <RequiredMark />
        </>
      ) : null}
    </span>
  );
}

function PhaseTabs({
  phase,
  paid,
}: {
  phase: FeePhase;
  paid: boolean;
}) {
  const steps: Array<{ id: FeePhase; label: string }> = [
    { id: "policy", label: "Fee & policy" },
    { id: "method", label: "Method" },
    { id: "billing", label: "Billing" },
    { id: "review", label: "Review & pay" },
    { id: "receipt", label: "Receipt" },
  ];
  const order = steps.map((step) => step.id);

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {steps.map((step) => {
        const index = order.indexOf(step.id);
        const current = order.indexOf(phase);
        const done = paid || index < current || (paid && step.id === "receipt");
        const active = step.id === phase;
        return (
          <span
            key={step.id}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              active
                ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                : done
                  ? "bg-[var(--harbor-mid)] text-white"
                  : "bg-white/70 text-[var(--harbor-ink)]/40"
            }`}
          >
            {step.label}
          </span>
        );
      })}
    </div>
  );
}

function ReceiptView({ receipt }: { receipt: ApplicationFeeReceipt }) {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--harbor-mid)]/30 bg-white/80 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 text-[var(--harbor-mid)]" />
        <div>
          <h3 className="font-display text-2xl">Payment confirmed</h3>
          <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
            This is a mock receipt for demo purposes. No real funds were moved.
          </p>
        </div>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ["Receipt ID", receipt.receiptId],
          ["Amount", formatFeeAmount(receipt.amountCents, receipt.currency)],
          ["Paid at", new Date(receipt.paidAt).toLocaleString()],
          ["Method", feePaymentMethodLabel(receipt.paymentMethod)],
          ["Payment", receipt.paymentDisplayMask],
          ["Billed to", receipt.billingName],
          ["Billing email", receipt.billingEmail],
          ["Property", receipt.property || "—"],
          ["Unit", receipt.floorPlan || "—"],
          ["Provider", receipt.mockProviderLabel],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl bg-[var(--harbor-sand)]/55 px-3 py-2"
          >
            <dt className="text-[10px] uppercase tracking-wide opacity-50">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ApplicationFeeStep({
  applicationId,
  property,
  floorPlan,
  applicantFullName,
  applicantEmail,
  fee,
  onChange,
  disabled = false,
}: Props) {
  const paid = fee.feeStatus === "paid" && Boolean(fee.feeReceiptId);
  const [phase, setPhase] = useState<FeePhase>(paid ? "receipt" : "policy");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ApplicationFeeReceipt | null>(null);
  const submittingRef = useRef(false);

  const billing: FeeBillingDetails = useMemo(
    () => ({
      name: fee.feeBillingName,
      email: fee.feeBillingEmail,
      street: fee.feeBillingStreet,
      city: fee.feeBillingCity,
      state: fee.feeBillingState,
      zip: fee.feeBillingZip,
    }),
    [fee]
  );

  useEffect(() => {
    const existing = readFeeReceiptByApplication(applicationId);
    if (existing) {
      setReceipt(existing);
      if (fee.feeStatus !== "paid") {
        onChange({
          feeStatus: "paid",
          feeReceiptId: existing.receiptId,
          feePaidAt: existing.paidAt,
          feePaymentReference: createMockPaymentReference(existing.receiptId),
          feePaymentMethod: existing.paymentMethod,
          feeBillingName: existing.billingName,
          feeBillingEmail: existing.billingEmail,
          feeIdempotencyKey: existing.idempotencyKey,
          feeAcknowledged: true,
          feeRefundPolicyAcknowledged: true,
        });
      }
      setPhase("receipt");
    }
    // Sync once when the fee step mounts / application changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid looping on onChange identity
  }, [applicationId]);

  useEffect(() => {
    if (!fee.feeBillingName && applicantFullName) {
      onChange({ feeBillingName: applicantFullName });
    }
    if (!fee.feeBillingEmail && applicantEmail) {
      onChange({ feeBillingEmail: applicantEmail });
    }
    if (!fee.feeIdempotencyKey) {
      onChange({ feeIdempotencyKey: createFeeIdempotencyKey(applicationId) });
    }
    // Prefill once from applicant contact fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, applicantFullName, applicantEmail]);

  function goNextFromPolicy() {
    if (!fee.feeAcknowledged || !fee.feeRefundPolicyAcknowledged) {
      setError("Acknowledge the fee amount and refundability policy to continue.");
      return;
    }
    setError(null);
    setPhase("method");
  }

  function goNextFromMethod() {
    if (!fee.feePaymentMethod) {
      setError("Select a payment method to continue.");
      return;
    }
    setError(null);
    setPhase("billing");
  }

  function goNextFromBilling() {
    const message = validateFeeBilling(billing);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setPhase("review");
  }

  async function submitPayment() {
    if (disabled || paid || submittingRef.current) return;
    if (fee.feeStatus === "paid") {
      setPhase("receipt");
      setNotice("This application fee was already paid. Showing your receipt.");
      return;
    }
    if (!fee.feePaymentMethod) {
      setError("Select a payment method before paying.");
      return;
    }

    const billingError = validateFeeBilling(billing);
    if (billingError) {
      setError(billingError);
      setPhase("billing");
      return;
    }

    submittingRef.current = true;
    setError(null);
    setNotice(null);
    onChange({ feeStatus: "processing" });

    try {
      const result = await processMockApplicationFee({
        applicationId,
        idempotencyKey:
          fee.feeIdempotencyKey || createFeeIdempotencyKey(applicationId),
        paymentMethod: fee.feePaymentMethod,
        billing,
        property,
        floorPlan,
        applicantFullName,
      });

      if (!result.ok) {
        onChange({ feeStatus: "failed" });
        setError(result.error);
        return;
      }

      setReceipt(result.receipt);
      onChange({
        feeStatus: "paid",
        feeReceiptId: result.receipt.receiptId,
        feePaidAt: result.receipt.paidAt,
        feePaymentReference: createMockPaymentReference(result.receipt.receiptId),
        feeIdempotencyKey: result.receipt.idempotencyKey,
      });
      setPhase("receipt");
      setNotice(
        result.duplicate
          ? "Duplicate payment blocked — your existing receipt is shown below."
          : "Mock payment succeeded. Save your receipt for your records."
      );
    } catch (err) {
      onChange({ feeStatus: "failed" });
      setError(
        err instanceof Error ? err.message : "Mock payment could not complete."
      );
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl">Application fee</h2>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
          Pay the screening fee to continue. Harborline does not collect full
          card or bank account numbers in this demo — checkout is a clearly
          labeled mock flow.
        </p>
      </div>

      <PhaseTabs phase={phase} paid={paid} />

      <div className="flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/25 bg-[var(--harbor-sand)]/40 p-3 text-sm text-[var(--harbor-ink)]/70">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
        <p>
          <strong className="font-semibold">Mock checkout only.</strong> No
          compliant payment provider is connected. Do not enter real card or
          bank credentials. Duplicate fee charges for this application are
          blocked.
        </p>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-[var(--harbor-mid)]/30 bg-white/70 px-4 py-3 text-sm">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {phase === "policy" ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--harbor-ink)] px-5 py-6 text-[var(--harbor-sand)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--harbor-glow)]">
              {APPLICATION_FEE_LABEL}
            </p>
            <p className="mt-2 font-display text-4xl">
              {formatFeeAmount(APPLICATION_FEE_AMOUNT_CENTS)}
            </p>
            <p className="mt-1 text-sm text-[var(--harbor-sand)]/70">
              Per adult applicant · due before screening
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/60 p-4 text-sm text-[var(--harbor-ink)]/70">
            <p className="font-semibold text-[var(--harbor-ink)]">
              What this fee covers
            </p>
            <p>
              The application fee helps cover identity, credit, and background
              screening for the primary adult applicant. Additional adult
              applicants may be charged separately when invited to apply.
            </p>
            <p className="font-semibold text-[var(--harbor-ink)]">
              Refundability policy
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                The fee is <strong>non-refundable once screening begins</strong>.
              </li>
              <li>
                If Harborline cancels screening before it starts, the fee may be
                refunded according to community policy.
              </li>
              <li>
                Denial of an application after screening does not create a
                refund entitlement.
              </li>
            </ul>
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm mt-0.5"
              checked={fee.feeAcknowledged}
              disabled={disabled || paid}
              onChange={(event) =>
                onChange({ feeAcknowledged: event.target.checked })
              }
            />
            <span>
              <RequiredMark /> I understand the {formatFeeAmount()} application
              fee amount and what it covers.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm mt-0.5"
              checked={fee.feeRefundPolicyAcknowledged}
              disabled={disabled || paid}
              onChange={(event) =>
                onChange({
                  feeRefundPolicyAcknowledged: event.target.checked,
                })
              }
            />
            <span>
              <RequiredMark /> I understand the fee is non-refundable once
              screening begins.
            </span>
          </label>

          {!paid && !disabled ? (
            <button
              type="button"
              className="btn btn-neutral"
              onClick={goNextFromPolicy}
            >
              Continue to payment method
            </button>
          ) : null}
        </div>
      ) : null}

      {phase === "method" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--harbor-ink)]/60">
            Choose how you want to complete the mock payment. Full card or bank
            numbers are never requested or stored.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  id: "mock-card" as const,
                  title: "Card",
                  icon: CreditCard,
                  body: "Simulated card checkout. No PAN, CVV, or expiration is collected.",
                },
                {
                  id: "mock-ach" as const,
                  title: "Bank transfer / ACH",
                  icon: Landmark,
                  body: "Simulated ACH checkout. No routing or account number is collected.",
                },
              ] as const
            ).map((option) => {
              const selected = fee.feePaymentMethod === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled || paid}
                  onClick={() => onChange({ feePaymentMethod: option.id })}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[var(--harbor-ink)] bg-[var(--harbor-sand)]/70"
                      : "border-[var(--harbor-deep)]/15 bg-white/60 hover:border-[var(--harbor-mid)]/40"
                  }`}
                >
                  <Icon className="h-5 w-5 text-[var(--harbor-mid)]" />
                  <p className="mt-2 font-semibold">{option.title}</p>
                  <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                    {option.body}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
                    Mock flow
                  </p>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPhase("policy")}
            >
              Back
            </button>
            {!paid && !disabled ? (
              <button
                type="button"
                className="btn btn-neutral"
                onClick={goNextFromMethod}
              >
                Continue to billing
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === "billing" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--harbor-ink)]/60">
            Enter billing contact details for the receipt. Payment credentials
            stay inside the mock provider simulation.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <FieldLabel required>Billing name</FieldLabel>
              <input
                className="input input-bordered w-full"
                value={fee.feeBillingName}
                disabled={disabled || paid}
                onChange={(event) =>
                  onChange({ feeBillingName: event.target.value })
                }
              />
            </label>
            <label className="block sm:col-span-2">
              <FieldLabel required>Billing email</FieldLabel>
              <input
                type="email"
                className="input input-bordered w-full"
                value={fee.feeBillingEmail}
                disabled={disabled || paid}
                onChange={(event) =>
                  onChange({ feeBillingEmail: event.target.value })
                }
              />
            </label>
            <label className="block sm:col-span-2">
              <FieldLabel required>Street</FieldLabel>
              <input
                className="input input-bordered w-full"
                value={fee.feeBillingStreet}
                disabled={disabled || paid}
                onChange={(event) =>
                  onChange({ feeBillingStreet: event.target.value })
                }
              />
            </label>
            <label className="block">
              <FieldLabel required>City</FieldLabel>
              <input
                className="input input-bordered w-full"
                value={fee.feeBillingCity}
                disabled={disabled || paid}
                onChange={(event) =>
                  onChange({ feeBillingCity: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <FieldLabel required>State</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={fee.feeBillingState}
                  disabled={disabled || paid}
                  onChange={(event) =>
                    onChange({ feeBillingState: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel required>ZIP</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={fee.feeBillingZip}
                  disabled={disabled || paid}
                  onChange={(event) =>
                    onChange({ feeBillingZip: event.target.value })
                  }
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-[var(--harbor-sand)]/35 p-4 text-sm">
            <p className="font-semibold">Mock payment widget</p>
            <p className="mt-1 text-[var(--harbor-ink)]/60">
              In production, a PCI-compliant provider (for example Stripe
              Elements) would collect card or bank details here. This demo only
              records method selection and billing contact — never full payment
              credentials.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPhase("method")}
            >
              Back
            </button>
            {!paid && !disabled ? (
              <button
                type="button"
                className="btn btn-neutral"
                onClick={goNextFromBilling}
              >
                Review payment
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === "review" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-4">
            <p className="font-semibold">Review before paying</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["Fee", formatFeeAmount()],
                ["Method", feePaymentMethodLabel(fee.feePaymentMethod)],
                ["Billing name", fee.feeBillingName],
                ["Billing email", fee.feeBillingEmail],
                [
                  "Billing address",
                  `${fee.feeBillingStreet}, ${fee.feeBillingCity}, ${fee.feeBillingState} ${fee.feeBillingZip}`,
                ],
                ["Property", property || "—"],
                ["Unit", floorPlan || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[var(--harbor-sand)]/55 px-3 py-2"
                >
                  <dt className="text-[10px] uppercase tracking-wide opacity-50">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={fee.feeStatus === "processing"}
              onClick={() => setPhase("billing")}
            >
              Back
            </button>
            {!paid && !disabled ? (
              <button
                type="button"
                className="btn btn-neutral gap-2"
                disabled={fee.feeStatus === "processing" || submittingRef.current}
                onClick={() => void submitPayment()}
              >
                {fee.feeStatus === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing mock payment…
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    Pay {formatFeeAmount()} (mock)
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === "receipt" ? (
        <div className="space-y-4">
          {receipt ? (
            <ReceiptView receipt={receipt} />
          ) : paid ? (
            <div className="rounded-2xl border border-[var(--harbor-mid)]/30 bg-white/80 p-5">
              <p className="font-semibold">Fee paid</p>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                Receipt {fee.feeReceiptId} ·{" "}
                {fee.feePaidAt
                  ? new Date(fee.feePaidAt).toLocaleString()
                  : "Paid"}
              </p>
              <p className="mt-2 text-sm">
                Reference: {fee.feePaymentReference || "—"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--harbor-ink)]/60">
              Complete payment to view your receipt.
            </p>
          )}
          {!paid ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPhase("review")}
            >
              Back to review
            </button>
          ) : (
            <p className="text-sm text-[var(--harbor-ink)]/55">
              You can continue to the next application step. Re-submitting this
              fee is blocked for this application.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function isApplicationFeeComplete(fee: ApplicationFeeDraftFields): boolean {
  return isApplicationFeePaid(fee);
}
