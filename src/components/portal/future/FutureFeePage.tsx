"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { FeePayment, RentalApplication } from "@/lib/portal/future/models";
import { getDraft, saveDraft } from "@/lib/portal/future/services";

const FEE_CENTS = 5500;

function FeeInner({ session }: { session: PortalTenantSession }) {
  const [app, setApp] = useState<RentalApplication | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [nameOnCard, setNameOnCard] = useState("");
  const [last4, setLast4] = useState("");
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
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [session.userId]);

  async function onPay(event: FormEvent) {
    event.preventDefault();
    if (!app) return;
    if (!/^\d{4}$/.test(last4)) {
      setError("Enter the last 4 digits only. Full card numbers are not accepted.");
      return;
    }
    setSaving(true);
    setError(null);
    const fee: FeePayment = {
      id: `fee-${crypto.randomUUID().slice(0, 8)}`,
      applicationId: app.id,
      ownerUserId: session.userId,
      amountCents: FEE_CENTS,
      currency: "USD",
      status: "paid",
      receiptNumber: `RCPT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      paidAt: new Date().toISOString(),
      refundable: false,
      explanation:
        "Mock payment only. Harborline does not store full card numbers in this portal demo.",
    };
    const result = await saveDraft({
      ownerUserId: session.userId,
      feePayment: fee,
      currentStep: "15",
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setApp(result.data);
    setMessage(`Payment recorded. Receipt ${fee.receiptNumber}.`);
    setLast4("");
  }

  if (status === "loading") {
    return <p className="text-sm text-[var(--harbor-muted)]" role="status">Loading fee details…</p>;
  }
  if (status === "error" || !app) {
    return <p className="portal-empty text-error" role="alert">{error ?? "Unable to load."}</p>;
  }

  const fee = app.feePayment;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PortalCard className="space-y-3">
        <h2 className="portal-section-title">Application fee</h2>
        <p className="text-3xl font-semibold text-[var(--harbor-ink)]">
          ${(FEE_CENTS / 100).toFixed(2)}
        </p>
        <p className="text-sm text-[var(--harbor-muted)]">
          Typically non-refundable. Confirms screening for adult applicants.
        </p>
        {fee ? (
          <div className="rounded-xl bg-[var(--harbor-mist)]/50 p-3">
            <PortalStatusBadge
              tone={fee.status === "paid" ? "success" : fee.status === "failed" ? "danger" : "warning"}
            >
              {fee.status}
            </PortalStatusBadge>
            <p className="mt-2 text-sm text-[var(--harbor-muted)]">{fee.explanation}</p>
            {fee.receiptNumber ? (
              <p className="mt-1 text-sm text-[var(--harbor-ink)]">
                Receipt: {fee.receiptNumber}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="portal-empty">Fee not paid yet.</p>
        )}
      </PortalCard>

      <PortalCard as="form" onSubmit={onPay} className="space-y-3">
        <h2 className="portal-section-title">Mock payment</h2>
        <p className="text-sm text-[var(--harbor-muted)]">
          Do not enter a full card number. This demo only collects a display name
          and last four digits for a mock receipt.
        </p>
        <PortalField
          label="Name on card"
          required
          value={nameOnCard}
          onChange={(e) => setNameOnCard(e.target.value)}
        />
        <PortalField
          label="Last 4 digits only"
          required
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          value={last4}
          onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
          hint="Full PAN / CVV are never stored."
        />
        {error ? <p className="text-sm text-error" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-[var(--harbor-mid)]" role="status">{message}</p> : null}
        <button
          type="submit"
          className="portal-btn portal-btn-primary portal-focus"
          disabled={saving || fee?.status === "paid"}
        >
          {fee?.status === "paid" ? "Already paid" : saving ? "Processing…" : "Pay fee (mock)"}
        </button>
      </PortalCard>
    </div>
  );
}

export function FutureFeePage() {
  return (
    <RequireFutureApplicant>
      {(session) => <FeeInner session={session} />}
    </RequireFutureApplicant>
  );
}
