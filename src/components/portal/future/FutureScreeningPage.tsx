"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { ScreeningPackage } from "@/lib/portal/future/screening-types";
import {
  getScreeningPackage,
  saveScreeningConsent,
  submitScreening,
  uploadScreeningDocument,
} from "@/lib/portal/future/services";

function toneForStatus(status: ScreeningPackage["status"]) {
  if (status === "clear") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "needs_info" || status === "in_progress")
    return "warning" as const;
  if (status === "submitted") return "info" as const;
  return "neutral" as const;
}

function ScreeningInner({ session }: { session: PortalTenantSession }) {
  const [pkg, setPkg] = useState<ScreeningPackage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [occupancyClass, setOccupancyClass] = useState<"personal" | "commercial">(
    "personal"
  );
  const [consent, setConsent] = useState(false);
  const [idLabel, setIdLabel] = useState("");
  const [incomeLabel, setIncomeLabel] = useState("");

  async function reload() {
    setStatus("loading");
    const result = await getScreeningPackage(session.userId);
    if (!result.ok) {
      setError(result.error.message);
      setStatus("error");
      return;
    }
    setPkg(result.data);
    setOccupancyClass(result.data.occupancyClass);
    setConsent(result.data.consentGiven);
    setStatus("ready");
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.userId]);

  async function onConsent(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await saveScreeningConsent(session.userId, {
      occupancyClass,
      consentGiven: consent,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPkg(result.data);
    setMessage("Screening consent saved.");
  }

  async function onUploadId(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await uploadScreeningDocument(session.userId, {
      kind: "government_id",
      label: idLabel,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPkg(result.data);
    setIdLabel("");
    setMessage("Government identification uploaded.");
  }

  async function onUploadIncome(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await uploadScreeningDocument(session.userId, {
      kind: "income_proof",
      label: incomeLabel,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPkg(result.data);
    setIncomeLabel("");
    setMessage("Income proof uploaded.");
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await submitScreening(session.userId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPkg(result.data);
    setMessage("Screening submitted successfully.");
  }

  if (status === "loading") {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading screening...
      </p>
    );
  }
  if (status === "error" || !pkg) {
    return (
      <p className="text-sm text-error" role="alert">
        {error ?? "Could not load screening."}
      </p>
    );
  }

  const finalized = pkg.status === "clear" || pkg.status === "failed";

  return (
    <div className="space-y-6">
      <PortalCard className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="portal-section-title">Applicant screening</h2>
            <p className="mt-1 text-sm text-[var(--harbor-muted)]">
              Complete consent, upload government identification and income
              verification, then submit for Harborline review.
            </p>
          </div>
          <PortalStatusBadge tone={toneForStatus(pkg.status)}>
            {pkg.status.replace(/_/g, " ")}
          </PortalStatusBadge>
        </div>
        <p className="text-sm text-[var(--harbor-ink)]">{pkg.notes}</p>
      </PortalCard>

      <PortalCard as="form" onSubmit={onConsent} className="space-y-4">
        <h2 className="portal-section-title">1. Consent</h2>
        <PortalField
          label="Occupancy class"
          as="select"
          value={occupancyClass}
          disabled={finalized || pkg.consentGiven}
          onChange={(e) =>
            setOccupancyClass(e.target.value as "personal" | "commercial")
          }
        >
          <option value="personal">Personal</option>
          <option value="commercial">Commercial</option>
        </PortalField>
        <label className="flex items-start gap-3 text-sm text-[var(--harbor-ink)]">
          <input
            type="checkbox"
            className="portal-native-checkbox"
            checked={consent}
            disabled={finalized || pkg.consentGiven}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I authorize Harborline to verify identity, income, credit, and
            background information for this rental application (demo consent).
          </span>
        </label>
        {!pkg.consentGiven && !finalized ? (
          <button
            type="submit"
            className="portal-btn portal-btn-primary portal-focus"
            disabled={busy || !consent}
          >
            {busy ? "Saving..." : "Save consent"}
          </button>
        ) : (
          <p className="text-sm text-[var(--harbor-muted)]">
            Consent recorded
            {pkg.consentAt ? ` on ${pkg.consentAt.slice(0, 10)}` : ""}.
          </p>
        )}
      </PortalCard>

      <PortalCard as="form" onSubmit={onUploadId} className="space-y-4">
        <h2 className="portal-section-title">2. Government identification</h2>
        {pkg.idDocument ? (
          <p className="text-sm text-[var(--harbor-ink)]">
            Uploaded: {pkg.idDocument.label}
          </p>
        ) : null}
        {!finalized ? (
          <>
            <PortalField
              label="Identification document file name"
              required
              value={idLabel}
              onChange={(e) => setIdLabel(e.target.value)}
              placeholder="drivers-license.pdf"
              disabled={!pkg.consentGiven}
            />
            <button
              type="submit"
              className="portal-btn portal-btn-secondary portal-focus"
              disabled={busy || !pkg.consentGiven || !idLabel.trim()}
            >
              {busy ? "Uploading..." : "Upload identification"}
            </button>
          </>
        ) : null}
      </PortalCard>

      <PortalCard as="form" onSubmit={onUploadIncome} className="space-y-4">
        <h2 className="portal-section-title">3. Income verification</h2>
        {pkg.incomeDocument ? (
          <p className="text-sm text-[var(--harbor-ink)]">
            Uploaded: {pkg.incomeDocument.label}
          </p>
        ) : null}
        {!finalized ? (
          <>
            <PortalField
              label="Income document file name"
              required
              value={incomeLabel}
              onChange={(e) => setIncomeLabel(e.target.value)}
              placeholder="paystubs-or-tax-return.pdf"
              disabled={!pkg.consentGiven}
            />
            <button
              type="submit"
              className="portal-btn portal-btn-secondary portal-focus"
              disabled={busy || !pkg.consentGiven || !incomeLabel.trim()}
            >
              {busy ? "Uploading..." : "Upload income proof"}
            </button>
          </>
        ) : null}
      </PortalCard>

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

      {!finalized ? (
        <button
          type="button"
          className="portal-btn portal-btn-primary portal-focus"
          disabled={
            busy || !pkg.consentGiven || !pkg.idDocument || !pkg.incomeDocument
          }
          onClick={() => void onSubmit()}
        >
          {busy ? "Submitting..." : "Submit screening"}
        </button>
      ) : null}
    </div>
  );
}

export function FutureScreeningPage() {
  return (
    <RequireFutureApplicant>
      {(session) => <ScreeningInner session={session} />}
    </RequireFutureApplicant>
  );
}
