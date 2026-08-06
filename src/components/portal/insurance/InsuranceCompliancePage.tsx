"use client";

import { FormEvent, useEffect, useState } from "react";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type {
  InsuranceOccupancyClass,
  InsurancePolicy,
  InsurancePolicyStatus,
} from "@/lib/portal/insurance-types";
import {
  listInsurancePolicies,
  uploadCertificateOfInsurance,
} from "@/lib/portal/services/insuranceService";

function toneForStatus(status: InsurancePolicyStatus) {
  if (status === "valid") return "success" as const;
  if (status === "expiring_soon" || status === "under_review")
    return "warning" as const;
  if (status === "expired" || status === "missing") return "danger" as const;
  return "neutral" as const;
}

function statusLabel(status: InsurancePolicyStatus) {
  return status.replace(/_/g, " ");
}

export function InsuranceCompliancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [policyType, setPolicyType] = useState("Certificate of insurance");
  const [carrier, setCarrier] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [occupancyClass, setOccupancyClass] =
    useState<InsuranceOccupancyClass>("personal");
  const [documentLabel, setDocumentLabel] = useState("");

  async function reload() {
    setStatus("loading");
    setError(null);
    const result = await listInsurancePolicies();
    if (!result.ok) {
      setError(result.error.message);
      setStatus("error");
      return;
    }
    setPolicies(result.data);
    setStatus("ready");
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    const result = await uploadCertificateOfInsurance({
      policyType,
      carrier,
      policyNumber,
      coverageAmount,
      effectiveDate,
      expirationDate,
      occupancyClass,
      documentLabel,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage(`Uploaded ${result.data.documentLabel}. Status: ${statusLabel(result.data.status)}.`);
    setCarrier("");
    setPolicyNumber("");
    setCoverageAmount("");
    setDocumentLabel("");
    await reload();
  }

  return (
    <div className="space-y-6">
      <PortalCard className="space-y-3">
        <h2 className="portal-section-title">Insurance &amp; certificate of insurance</h2>
        <p className="text-sm text-[var(--harbor-muted)]">
          Track required insurance for personal and commercial leases. Upload a
          certificate of insurance when coverage renews.
        </p>
        {status === "loading" ? (
          <p className="text-sm text-[var(--harbor-muted)]" role="status">
            Loading insurance records...
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        {status === "ready" ? (
          <ul className="space-y-3">
            {policies.map((policy) => (
              <li
                key={policy.id}
                className="rounded-xl border border-[var(--harbor-deep)]/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--harbor-ink)]">
                      {policy.policyType}
                    </p>
                    <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                      {policy.carrier} · {policy.policyNumber} ·{" "}
                      {policy.coverageAmount}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[var(--harbor-muted)]">
                      {policy.occupancyClass}
                    </p>
                  </div>
                  <PortalStatusBadge tone={toneForStatus(policy.status)}>
                    {statusLabel(policy.status)}
                  </PortalStatusBadge>
                </div>
                {policy.effectiveDate && policy.expirationDate ? (
                  <p className="mt-2 text-sm text-[var(--harbor-muted)]">
                    {policy.effectiveDate} → {policy.expirationDate}
                  </p>
                ) : null}
                {policy.notes ? (
                  <p className="mt-2 text-sm text-[var(--harbor-ink)]">
                    {policy.notes}
                  </p>
                ) : null}
                {policy.documentLabel ? (
                  <button
                    type="button"
                    className="mt-3 portal-btn portal-btn-secondary portal-focus"
                    onClick={() =>
                      setMessage(
                        `Demo download ready: ${policy.documentLabel}`
                      )
                    }
                  >
                    Download certificate
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </PortalCard>

      <PortalCard as="form" onSubmit={onUpload} className="space-y-4">
        <h2 className="portal-section-title">Upload certificate of insurance</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Policy type"
            required
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value)}
          />
          <PortalField
            label="Occupancy class"
            as="select"
            value={occupancyClass}
            onChange={(e) =>
              setOccupancyClass(e.target.value as InsuranceOccupancyClass)
            }
          >
            <option value="personal">Personal</option>
            <option value="commercial">Commercial</option>
          </PortalField>
          <PortalField
            label="Carrier"
            required
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />
          <PortalField
            label="Policy number"
            required
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
          />
          <PortalField
            label="Coverage amount"
            value={coverageAmount}
            onChange={(e) => setCoverageAmount(e.target.value)}
            placeholder="$100,000"
          />
          <PortalField
            label="Document file name"
            value={documentLabel}
            onChange={(e) => setDocumentLabel(e.target.value)}
            placeholder="certificate-2026.pdf"
          />
          <PortalField
            label="Effective date"
            type="date"
            required
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
          <PortalField
            label="Expiration date"
            type="date"
            required
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
          />
        </div>
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
        <button
          type="submit"
          className="portal-btn portal-btn-primary portal-focus"
          disabled={busy}
        >
          {busy ? "Uploading..." : "Submit certificate"}
        </button>
      </PortalCard>
    </div>
  );
}
