"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  emptyManagementContract,
  type FeeStructure,
  type ManagementContractDraft,
  type PropertyType,
} from "@/lib/management-contract";

const STORAGE_KEY = "harborline_management_contracts";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="form-control w-full">
      <span className="mb-1 text-sm font-medium text-[var(--harbor-ink)]/80">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 text-xs opacity-55">{hint}</span> : null}
    </label>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 sm:p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--harbor-ink)]">{title}</h3>
        <p className="text-sm text-[var(--harbor-ink)]/60">{subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

const inputClass =
  "input input-bordered w-full bg-white text-[var(--harbor-ink)]";
const selectClass =
  "select select-bordered w-full bg-white text-[var(--harbor-ink)]";
const textareaClass =
  "textarea textarea-bordered w-full min-h-24 bg-white text-[var(--harbor-ink)]";

type Props = {
  onCancel: () => void;
  onSaved: (contract: ManagementContractDraft) => void;
};

export function AcquireManagementContractForm({ onCancel, onSaved }: Props) {
  const [form, setForm] = useState(emptyManagementContract);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.propertyName.trim() || !form.streetAddress.trim()) {
      setError("Property name and street address are required.");
      return;
    }
    if (!form.ownerLegalName.trim() || !form.ownerContactName.trim()) {
      setError("Owner legal name and primary contact are required.");
      return;
    }
    if (!form.contractStartDate) {
      setError("Management contract start date is required.");
      return;
    }

    const draft: ManagementContractDraft = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? (JSON.parse(raw) as ManagementContractDraft[]) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([draft, ...existing]));
    } catch {
      /* ignore storage errors in demo */
    }

    onSaved(draft);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl text-[var(--harbor-ink)]">
            Acquire new management contract
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--harbor-ink)]/65">
            Capture asset identity, owner engagement terms, fee structure, and
            operating metrics before Harborline takes over management.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <Section
        title="1. Asset identity"
        subtitle="Physical property details for the new managed asset."
      >
        <Field label="Property name">
          <input
            className={inputClass}
            value={form.propertyName}
            onChange={(e) => update("propertyName", e.target.value)}
            placeholder="Pier 12 Commerce Center"
            required
          />
        </Field>
        <Field label="Property type">
          <select
            className={selectClass}
            value={form.propertyType}
            onChange={(e) => update("propertyType", e.target.value as PropertyType)}
          >
            <option value="office">Office</option>
            <option value="retail">Retail</option>
            <option value="industrial">Industrial / warehouse</option>
            <option value="mixed-use">Mixed-use</option>
            <option value="multifamily">Multifamily</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Street address">
          <input
            className={inputClass}
            value={form.streetAddress}
            onChange={(e) => update("streetAddress", e.target.value)}
            required
          />
        </Field>
        <Field label="City">
          <input
            className={inputClass}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </Field>
        <Field label="State">
          <input
            className={inputClass}
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="MS"
          />
        </Field>
        <Field label="ZIP">
          <input
            className={inputClass}
            value={form.zip}
            onChange={(e) => update("zip", e.target.value)}
          />
        </Field>
        <Field label="County">
          <input
            className={inputClass}
            value={form.county}
            onChange={(e) => update("county", e.target.value)}
          />
        </Field>
        <Field label="Parcel / tax ID">
          <input
            className={inputClass}
            value={form.parcelTaxId}
            onChange={(e) => update("parcelTaxId", e.target.value)}
          />
        </Field>
        <Field label="Year built">
          <input
            className={inputClass}
            value={form.yearBuilt}
            onChange={(e) => update("yearBuilt", e.target.value)}
          />
        </Field>
        <Field label="Year last renovated">
          <input
            className={inputClass}
            value={form.yearRenovated}
            onChange={(e) => update("yearRenovated", e.target.value)}
          />
        </Field>
        <Field label="Buildings">
          <input
            className={inputClass}
            value={form.buildings}
            onChange={(e) => update("buildings", e.target.value)}
          />
        </Field>
        <Field label="Floors">
          <input
            className={inputClass}
            value={form.floors}
            onChange={(e) => update("floors", e.target.value)}
          />
        </Field>
        <Field label="Units / suites">
          <input
            className={inputClass}
            value={form.unitsSuites}
            onChange={(e) => update("unitsSuites", e.target.value)}
          />
        </Field>
        <Field label="Gross SF">
          <input
            className={inputClass}
            value={form.grossSf}
            onChange={(e) => update("grossSf", e.target.value)}
            placeholder="e.g. 125000"
          />
        </Field>
        <Field label="Rentable SF">
          <input
            className={inputClass}
            value={form.rentableSf}
            onChange={(e) => update("rentableSf", e.target.value)}
          />
        </Field>
        <Field label="Parking spaces">
          <input
            className={inputClass}
            value={form.parkingSpaces}
            onChange={(e) => update("parkingSpaces", e.target.value)}
          />
        </Field>
        <Field label="Zoning">
          <input
            className={inputClass}
            value={form.zoning}
            onChange={(e) => update("zoning", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Amenities / site features">
            <textarea
              className={textareaClass}
              value={form.amenities}
              onChange={(e) => update("amenities", e.target.value)}
              placeholder="Lobby, freight elevator, dock doors, courtyard, etc."
            />
          </Field>
        </div>
      </Section>

      <Section
        title="2. Owner & engagement terms"
        subtitle="Who owns the asset and the management agreement basics."
      >
        <Field label="Owner legal name">
          <input
            className={inputClass}
            value={form.ownerLegalName}
            onChange={(e) => update("ownerLegalName", e.target.value)}
            required
          />
        </Field>
        <Field label="Owner entity type">
          <input
            className={inputClass}
            value={form.ownerEntityType}
            onChange={(e) => update("ownerEntityType", e.target.value)}
            placeholder="LLC, LP, Corp, Trust"
          />
        </Field>
        <Field label="Primary contact name">
          <input
            className={inputClass}
            value={form.ownerContactName}
            onChange={(e) => update("ownerContactName", e.target.value)}
            required
          />
        </Field>
        <Field label="Owner email">
          <input
            type="email"
            className={inputClass}
            value={form.ownerEmail}
            onChange={(e) => update("ownerEmail", e.target.value)}
          />
        </Field>
        <Field label="Owner phone">
          <input
            className={inputClass}
            value={form.ownerPhone}
            onChange={(e) => update("ownerPhone", e.target.value)}
          />
        </Field>
        <Field label="Owner mailing address">
          <input
            className={inputClass}
            value={form.ownerMailingAddress}
            onChange={(e) => update("ownerMailingAddress", e.target.value)}
          />
        </Field>
        <Field label="Contract start date">
          <input
            type="date"
            className={inputClass}
            value={form.contractStartDate}
            onChange={(e) => update("contractStartDate", e.target.value)}
            required
          />
        </Field>
        <Field label="Contract end date">
          <input
            type="date"
            className={inputClass}
            value={form.contractEndDate}
            onChange={(e) => update("contractEndDate", e.target.value)}
          />
        </Field>
        <Field label="Renewal options">
          <input
            className={inputClass}
            value={form.renewalOptions}
            onChange={(e) => update("renewalOptions", e.target.value)}
            placeholder="e.g. 2 x 1-year renewals"
          />
        </Field>
        <Field label="Termination notice (days)">
          <input
            className={inputClass}
            value={form.terminationNoticeDays}
            onChange={(e) => update("terminationNoticeDays", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2 flex items-center gap-3 pt-2">
          <input
            id="exclusiveManagement"
            type="checkbox"
            className="checkbox"
            checked={form.exclusiveManagement}
            onChange={(e) => update("exclusiveManagement", e.target.checked)}
          />
          <label htmlFor="exclusiveManagement" className="text-sm">
            Exclusive management agreement
          </label>
        </div>
      </Section>

      <Section
        title="3. Management fee structure"
        subtitle="How Harborline gets paid for managing this asset."
      >
        <Field label="Fee structure">
          <select
            className={selectClass}
            value={form.feeStructure}
            onChange={(e) => update("feeStructure", e.target.value as FeeStructure)}
          >
            <option value="percent_collections">% of collections</option>
            <option value="percent_gpr">% of gross potential rent</option>
            <option value="flat_monthly">Flat monthly fee</option>
            <option value="flat_annual">Flat annual fee</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </Field>
        <Field label="Management fee %">
          <input
            className={inputClass}
            value={form.feePercent}
            onChange={(e) => update("feePercent", e.target.value)}
            placeholder="e.g. 4"
          />
        </Field>
        <Field label="Flat fee amount ($)">
          <input
            className={inputClass}
            value={form.feeFlatAmount}
            onChange={(e) => update("feeFlatAmount", e.target.value)}
          />
        </Field>
        <Field label="Leasing commission %">
          <input
            className={inputClass}
            value={form.leasingCommissionPercent}
            onChange={(e) => update("leasingCommissionPercent", e.target.value)}
          />
        </Field>
        <Field label="Construction / project mgmt fee %">
          <input
            className={inputClass}
            value={form.constructionMgmtFeePercent}
            onChange={(e) => update("constructionMgmtFeePercent", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Other fee notes">
            <textarea
              className={textareaClass}
              value={form.otherFeeNotes}
              onChange={(e) => update("otherFeeNotes", e.target.value)}
              placeholder="Minimum monthly fee, incentive fees, reimbursables, etc."
            />
          </Field>
        </div>
      </Section>

      <Section
        title="4. Operating metrics & financial snapshot"
        subtitle="Baseline numbers so we can track performance after takeover."
      >
        <Field label="Current occupancy %">
          <input
            className={inputClass}
            value={form.occupancyPercent}
            onChange={(e) => update("occupancyPercent", e.target.value)}
          />
        </Field>
        <Field label="Tenant count">
          <input
            className={inputClass}
            value={form.tenantCount}
            onChange={(e) => update("tenantCount", e.target.value)}
          />
        </Field>
        <Field label="Monthly rent roll ($)">
          <input
            className={inputClass}
            value={form.monthlyRentRoll}
            onChange={(e) => update("monthlyRentRoll", e.target.value)}
          />
        </Field>
        <Field label="Annual GPR ($)" hint="Gross potential rent">
          <input
            className={inputClass}
            value={form.annualGpr}
            onChange={(e) => update("annualGpr", e.target.value)}
          />
        </Field>
        <Field label="Annual operating expenses ($)">
          <input
            className={inputClass}
            value={form.annualOperatingExpenses}
            onChange={(e) => update("annualOperatingExpenses", e.target.value)}
          />
        </Field>
        <Field label="Annual NOI ($)">
          <input
            className={inputClass}
            value={form.annualNoi}
            onChange={(e) => update("annualNoi", e.target.value)}
          />
        </Field>
        <Field label="Cap rate % (if known)">
          <input
            className={inputClass}
            value={form.capRatePercent}
            onChange={(e) => update("capRatePercent", e.target.value)}
          />
        </Field>
        <Field label="AR / arrears balance ($)">
          <input
            className={inputClass}
            value={form.arBalance}
            onChange={(e) => update("arBalance", e.target.value)}
          />
        </Field>
        <Field label="Security deposits held ($)">
          <input
            className={inputClass}
            value={form.securityDepositsHeld}
            onChange={(e) => update("securityDepositsHeld", e.target.value)}
          />
        </Field>
        <Field label="Reserve balance ($)">
          <input
            className={inputClass}
            value={form.reserveBalance}
            onChange={(e) => update("reserveBalance", e.target.value)}
          />
        </Field>
        <Field label="Lease structure (CAM / NNN)">
          <input
            className={inputClass}
            value={form.camOrNnnStructure}
            onChange={(e) => update("camOrNnnStructure", e.target.value)}
            placeholder="NNN, Modified gross, Full service"
          />
        </Field>
        <Field label="Insurance requirements">
          <input
            className={inputClass}
            value={form.insuranceRequirements}
            onChange={(e) => update("insuranceRequirements", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Major lease expirations (next 24 months)">
            <textarea
              className={textareaClass}
              value={form.majorLeaseExpirations}
              onChange={(e) => update("majorLeaseExpirations", e.target.value)}
              placeholder="Suite 200 — expires Sep 2026; Suite 110 — expires Jan 2027"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="5. Operations handoff"
        subtitle="Who runs it day-to-day and what Harborline should watch."
      >
        <Field label="Assigned Harborline manager">
          <input
            className={inputClass}
            value={form.assignedManager}
            onChange={(e) => update("assignedManager", e.target.value)}
          />
        </Field>
        <Field label="Preferred vendors">
          <input
            className={inputClass}
            value={form.preferredVendors}
            onChange={(e) => update("preferredVendors", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Known issues / deferred maintenance">
            <textarea
              className={textareaClass}
              value={form.knownIssues}
              onChange={(e) => update("knownIssues", e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Special contract terms">
            <textarea
              className={textareaClass}
              value={form.specialTerms}
              onChange={(e) => update("specialTerms", e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Additional notes">
            <textarea
              className={textareaClass}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-neutral">
          Save management contract
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function useSavedContracts() {
  const [contracts, setContracts] = useState<ManagementContractDraft[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setContracts(JSON.parse(raw) as ManagementContractDraft[]);
    } catch {
      /* ignore */
    }
  }, []);

  function refresh() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setContracts(raw ? (JSON.parse(raw) as ManagementContractDraft[]) : []);
    } catch {
      setContracts([]);
    }
  }

  return { contracts, refresh, setContracts };
}
