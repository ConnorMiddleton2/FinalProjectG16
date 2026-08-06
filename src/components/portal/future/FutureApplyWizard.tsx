"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ensurePortalDemoCookies } from "@/app/portal/demo-actions";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import { useClientSearchParams } from "@/hooks/useClientSearchParams";
import type { PortalTenantSession } from "@/lib/portal/auth";
import { readFutureApplicantSessionSync } from "@/lib/portal/auth-client";
import {
  APPLICATION_WIZARD_STEP_LABELS,
  type ApplicationWizardStep,
  type AvailableUnit,
  type DocumentCategory,
  type OccupancyClass,
  type RentalApplication,
  type UploadedDocument,
} from "@/lib/portal/future/models";
import { FUTURE_STATUS, FUTURE_UNITS } from "@/lib/portal/future/paths";
import {
  getDraft,
  listUnits,
  saveDraft,
  submitApplication,
} from "@/lib/portal/future/services";
import {
  formatSpaceStats,
  occupancyClassLabel,
} from "@/lib/portal/occupancy";
import {
  PORTAL_DEMO_SESSION_STORAGE_KEY,
  PORTAL_FUTURE_DEMO_APPLICANT,
} from "@/lib/portal/portal-demo-auth";

const STEPS = Object.keys(APPLICATION_WIZARD_STEP_LABELS) as ApplicationWizardStep[];

const DOC_CATEGORIES: Array<{ id: DocumentCategory; label: string }> = [
  { id: "government_id", label: "Government-issued ID" },
  { id: "proof_of_income", label: "Proof of income" },
  { id: "employment_verification", label: "Employment verification" },
  { id: "rental_history", label: "Rental history" },
  { id: "pet_records", label: "Pet records (if any)" },
  { id: "supporting", label: "Supporting documents" },
];

const FEE_AMOUNT = 75;

type Fields = Record<string, string>;

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function validateStep(
  step: ApplicationWizardStep,
  fields: Fields,
  unitId: string,
  docs: UploadedDocument[],
  feePaid: boolean
): string | null {
  if (step === "1" && !unitId) return "Select the unit you want to apply for.";
  if (step === "2") {
    if (!fields.firstName?.trim()) return "First name is required.";
    if (!fields.lastName?.trim()) return "Last name is required.";
  }
  if (step === "3") {
    if (!fields.email?.trim()) return "Email is required.";
    if (!fields.phone?.trim()) return "Phone is required.";
  }
  if (step === "4") {
    if (!fields.currAddress?.trim()) return "Current address is required.";
    if (!fields.currCity?.trim()) return "City is required.";
  }
  if (step === "6") {
    if (!fields.employer?.trim()) return "Employer is required.";
    if (!fields.monthlyIncome?.trim()) return "Monthly income is required.";
  }
  if (step === "12" && fields.screeningConsent !== "yes") {
    return "You must acknowledge the screening disclosure to continue.";
  }
  if (step === "13") {
    const required = ["government_id", "proof_of_income"];
    for (const cat of required) {
      if (!docs.some((d) => d.category === cat)) {
        return "Upload government ID and proof of income before continuing.";
      }
    }
  }
  if (step === "14" && !feePaid) {
    return "Pay the application fee (demo) before continuing.";
  }
  if (step === "15" && fields.certified !== "yes") {
    return "Certification is required before submitting.";
  }
  return null;
}

function WizardInner({ session }: { session: PortalTenantSession }) {
  const searchParams = useClientSearchParams();
  const initialUnitId = searchParams.get("unitId") ?? "";

  const [application, setApplication] = useState<RentalApplication | null>(null);
  const [units, setUnits] = useState<AvailableUnit[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ApplicationWizardStep>("1");
  const [fields, setFields] = useState<Fields>({
    email: session.email,
    preferredContact: "email",
  });
  const [unitId, setUnitId] = useState(initialUnitId);
  const [occupancyFilter, setOccupancyFilter] = useState<"" | OccupancyClass>("");
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [feePaid, setFeePaid] = useState(false);
  const [feeReceipt, setFeeReceipt] = useState<string | null>(null);
  const [feeBusy, setFeeBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      const [draftResult, unitsResult] = await Promise.all([
        getDraft(session.userId),
        listUnits({}, "newest"),
      ]);
      if (cancelled) return;
      if (!draftResult.ok) {
        setError(draftResult.error.message);
        setStatus("error");
        return;
      }
      const app = draftResult.data;
      setApplication(app);
      if (app.status !== "Draft" && app.status !== "Payment Pending") {
        setStatus("ready");
        return;
      }
      setStep(app.currentStep || "1");
      setUnitId(initialUnitId || app.unitId || "");
      const payload = Object.fromEntries(
        Object.entries(app.draftPayload ?? {}).map(([key, value]) => [
          key,
          typeof value === "string" ? value : String(value ?? ""),
        ])
      );
      setFields((prev) => ({
        ...prev,
        ...payload,
        email: String(payload.email || session.email),
      }));
      setDocuments(app.documents ?? []);
      if (app.feePayment?.status === "paid") {
        setFeePaid(true);
        setFeeReceipt(app.feePayment.receiptNumber);
      }
      if (unitsResult.ok) setUnits(unitsResult.data);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [session.userId, session.email, initialUnitId]);

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === unitId) ?? null,
    [units, unitId]
  );

  const visibleUnits = useMemo(() => {
    if (!occupancyFilter) return units;
    return units.filter((unit) => unit.occupancyClass === occupancyFilter);
  }, [units, occupancyFilter]);

  const isCommercial = selectedUnit?.occupancyClass === "commercial";

  const progress = useMemo(
    () => Math.round((Number(step) / STEPS.length) * 100),
    [step]
  );

  function setField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function persist(
    nextStep: ApplicationWizardStep,
    extras?: {
      documents?: UploadedDocument[];
      feePaid?: boolean;
      feeReceipt?: string | null;
      announce?: string;
    }
  ) {
    setSaving(true);
    setMessage(null);
    setError(null);
    const docs = extras?.documents ?? documents;
    const paid = extras?.feePaid ?? feePaid;
    const receipt = extras?.feeReceipt ?? feeReceipt;
    const result = await saveDraft({
      ownerUserId: session.userId,
      currentStep: nextStep,
      unitId: unitId || undefined,
      applicantName:
        `${fields.firstName ?? ""} ${fields.lastName ?? ""}`.trim() ||
        session.displayName,
      draftPayload: fields,
      documents: docs,
      feePayment: paid
        ? {
            id: `fee-${session.userId}`,
            applicationId: application?.id ?? `app-${session.userId}`,
            ownerUserId: session.userId,
            amountCents: FEE_AMOUNT * 100,
            currency: "USD" as const,
            refundable: false,
            status: "paid" as const,
            paidAt: new Date().toISOString(),
            receiptNumber: receipt ?? `rcpt-app-${Date.now().toString(36)}`,
            explanation:
              "Nonrefundable application processing fee (demo payment).",
          }
        : null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return false;
    }
    setApplication(result.data);
    setStep(nextStep);
    if (extras?.announce) setMessage(extras.announce);
    return true;
  }

  async function goNext() {
    const issue = validateStep(step, fields, unitId, documents, feePaid);
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    const index = STEPS.indexOf(step);
    if (index >= STEPS.length - 1 || step === "15") {
      // From review, submit
      const saved = await persist("15");
      if (!saved) return;
      setSaving(true);
      const result = await submitApplication(session.userId);
      setSaving(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setApplication(result.data);
      setStep("16");
      setSubmitted(true);
      setMessage("Application submitted successfully.");
      return;
    }
    await persist(STEPS[index + 1]!);
  }

  async function goBack() {
    const index = STEPS.indexOf(step);
    if (index <= 0) return;
    await persist(STEPS[index - 1]!);
  }

  async function saveLater() {
    await persist(step, { announce: "Progress saved. You can continue later." });
  }

  function onUpload(category: DocumentCategory, file: File | undefined) {
    if (!file) return;
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowed.includes(file.type)) {
      setError("Only PDF, JPEG, PNG, or WebP files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Each file must be 5 MB or smaller.");
      return;
    }
    setError(null);
    const doc: UploadedDocument = {
      id: `doc-${category}-${Date.now()}`,
      applicationId: application?.id ?? `app-${session.userId}`,
      ownerUserId: session.userId,
      category,
      fileName: file.name,
      fileType: file.type,
      fileSizeBytes: file.size,
      status: "uploaded",
      uploadedAt: new Date().toISOString(),
    };
    setDocuments((prev) => {
      const without = prev.filter((d) => d.category !== category);
      return [...without, doc];
    });
    setMessage(`${file.name} attached (demo upload — not stored on a public path).`);
  }

  async function payFee() {
    if (feePaid) {
      setError("Application fee already paid — duplicate payment blocked.");
      return;
    }
    setFeeBusy(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 600));
    const receipt = `rcpt-fee-${Date.now().toString(36)}`;
    setFeePaid(true);
    setFeeReceipt(receipt);
    setFeeBusy(false);
    setMessage(`Fee paid (demo). Receipt ${receipt}.`);
    await persist(step, {
      feePaid: true,
      feeReceipt: receipt,
    });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void goNext();
  }

  if (status === "loading") {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading your application…
      </p>
    );
  }

  if (status === "error" && !application) {
    return (
      <p className="portal-empty text-error" role="alert">
        {error ?? "Could not load application."}
      </p>
    );
  }

  if (
    application &&
    application.status !== "Draft" &&
    application.status !== "Payment Pending" &&
    !submitted
  ) {
    return (
      <PortalCard className="space-y-3">
        <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
          Application already in progress
        </h2>
        <p className="text-sm text-[var(--harbor-muted)]">
          Status: {application.status}. Continue from your status page.
        </p>
        <Link href={FUTURE_STATUS} className="portal-btn portal-btn-primary portal-focus">
          View application status
        </Link>
      </PortalCard>
    );
  }

  if (step === "16" || submitted) {
    return (
      <PortalCard className="space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-600" aria-hidden />
          <div>
            <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
              Application submitted
            </h2>
            <p className="mt-1 text-[var(--harbor-muted)]">
              Confirmation{" "}
              <strong>{application?.confirmationNumber ?? "pending"}</strong>
              {application?.applicationNumber
                ? ` · Application ${application.applicationNumber}`
                : ""}
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--harbor-muted)]">
          Harborline leasing will review your materials. You can track progress
          anytime on the status page.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={FUTURE_STATUS} className="portal-btn portal-btn-primary portal-focus">
            View application status
          </Link>
          <Link href={FUTURE_UNITS} className="portal-btn portal-btn-secondary portal-focus">
            Browse more units
          </Link>
        </div>
      </PortalCard>
    );
  }

  return (
    <PortalCard as="form" onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
              Step {step} of {STEPS.length}
            </p>
            <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
              {APPLICATION_WIZARD_STEP_LABELS[step]}
            </h2>
          </div>
          <p className="text-sm text-[var(--harbor-muted)]" aria-live="polite">
            {progress}% complete
          </p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--harbor-mist)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Application progress"
        >
          <div
            className="h-full rounded-full bg-[var(--harbor-mid)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="flex flex-wrap gap-1.5 pt-1" aria-label="Steps">
          {STEPS.map((s) => (
            <li key={s}>
              <button
                type="button"
                className={`min-h-8 rounded-lg px-2 text-xs font-medium portal-focus ${
                  s === step
                    ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                    : Number(s) < Number(step)
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-[var(--harbor-mist)] text-[var(--harbor-muted)]"
                }`}
                onClick={() => {
                  if (Number(s) <= Number(step)) void persist(s);
                }}
                disabled={Number(s) > Number(step) || saving}
                aria-current={s === step ? "step" : undefined}
              >
                {s}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {message}
        </p>
      ) : null}

      {selectedUnit && step !== "1" ? (
        <p className="rounded-xl bg-[var(--harbor-mist)]/60 px-3 py-2 text-sm text-[var(--harbor-ink)]">
          Applying for <strong>{selectedUnit.propertyName}</strong> ·{" "}
          {selectedUnit.unitLabel} · {money(selectedUnit.rent)}/mo ·{" "}
          {occupancyClassLabel(selectedUnit.occupancyClass)}
        </p>
      ) : null}

      {step === "1" ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--harbor-muted)]">
            Choose a Harborline personal home or commercial suite. You can also{" "}
            <Link href={FUTURE_UNITS} className="font-medium text-[var(--harbor-mid)] underline">
              browse the full list
            </Link>{" "}
            first.
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Property class">
            {(
              [
                { value: "", label: "All" },
                { value: "personal", label: "Personal" },
                { value: "commercial", label: "Commercial" },
              ] as const
            ).map((option) => (
              <button
                key={option.label}
                type="button"
                className={`portal-btn min-h-11 portal-focus ${
                  occupancyFilter === option.value
                    ? "portal-btn-primary"
                    : "portal-btn-secondary"
                }`}
                aria-pressed={occupancyFilter === option.value}
                onClick={() => setOccupancyFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {visibleUnits.length === 0 ? (
            <p className="portal-empty">No units loaded. Try refreshing.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visibleUnits.map((unit) => {
                const active = unitId === unit.id;
                return (
                  <li key={unit.id}>
                    <button
                      type="button"
                      onClick={() => setUnitId(unit.id)}
                      className={`w-full rounded-xl border p-4 text-left transition portal-focus ${
                        active
                          ? "border-[var(--harbor-mid)] bg-[var(--harbor-sand)]/50 ring-2 ring-[var(--harbor-mid)]"
                          : "border-[var(--harbor-deep)]/15 hover:border-[var(--harbor-mid)]/50"
                      }`}
                      aria-pressed={active}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
                        {occupancyClassLabel(unit.occupancyClass)}
                      </p>
                      <p className="font-semibold text-[var(--harbor-ink)]">
                        {unit.propertyName}
                      </p>
                      <p className="text-sm text-[var(--harbor-muted)]">
                        {unit.unitLabel} · {unit.floorPlan}
                      </p>
                      <p className="mt-2 text-sm">
                        <strong>{money(unit.rent)}</strong>/mo ·{" "}
                        {formatSpaceStats(unit)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--harbor-muted)]">
                        Available {unit.availableDate}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {step === "2" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {isCommercial ? (
            <PortalField
              label="Business / entity name"
              className="sm:col-span-2"
              value={fields.businessName ?? ""}
              onChange={(e) => setField("businessName", e.target.value)}
              hint="Legal name of the applying business or doing-business-as name"
            />
          ) : null}
          <PortalField
            label="First name"
            required
            value={fields.firstName ?? ""}
            onChange={(e) => setField("firstName", e.target.value)}
            autoComplete="given-name"
          />
          <PortalField
            label="Last name"
            required
            value={fields.lastName ?? ""}
            onChange={(e) => setField("lastName", e.target.value)}
            autoComplete="family-name"
          />
          <PortalField
            label="Preferred name"
            value={fields.preferredName ?? ""}
            onChange={(e) => setField("preferredName", e.target.value)}
          />
          <PortalField
            label="Date of birth"
            type="date"
            value={fields.dateOfBirth ?? ""}
            onChange={(e) => setField("dateOfBirth", e.target.value)}
          />
        </div>
      ) : null}

      {step === "3" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Email"
            type="email"
            required
            value={fields.email ?? ""}
            onChange={(e) => setField("email", e.target.value)}
            autoComplete="email"
          />
          <PortalField
            label="Phone"
            type="tel"
            required
            value={fields.phone ?? ""}
            onChange={(e) => setField("phone", e.target.value)}
            autoComplete="tel"
            placeholder="(555) 555-0100"
          />
          <PortalField
            label="Preferred contact method"
            as="select"
            value={fields.preferredContact ?? "email"}
            onChange={(e) => setField("preferredContact", e.target.value)}
          >
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="text">Text</option>
            <option value="portal-message">Portal message</option>
          </PortalField>
        </div>
      ) : null}

      {step === "4" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Street address"
            required
            className="sm:col-span-2"
            value={fields.currAddress ?? ""}
            onChange={(e) => setField("currAddress", e.target.value)}
            autoComplete="street-address"
          />
          <PortalField
            label="City"
            required
            value={fields.currCity ?? ""}
            onChange={(e) => setField("currCity", e.target.value)}
          />
          <PortalField
            label="State"
            value={fields.currState ?? ""}
            onChange={(e) => setField("currState", e.target.value)}
          />
          <PortalField
            label="Postal code"
            value={fields.currPostal ?? ""}
            onChange={(e) => setField("currPostal", e.target.value)}
          />
          <PortalField
            label="Move-in date at this address"
            type="date"
            value={fields.currMoveIn ?? ""}
            onChange={(e) => setField("currMoveIn", e.target.value)}
          />
          <PortalField
            label="Monthly rent (if renting)"
            value={fields.currRent ?? ""}
            onChange={(e) => setField("currRent", e.target.value)}
          />
          <PortalField
            label="Landlord / manager name"
            className="sm:col-span-2"
            value={fields.currLandlord ?? ""}
            onChange={(e) => setField("currLandlord", e.target.value)}
          />
          <PortalField
            label="Landlord phone"
            type="tel"
            value={fields.currLandlordPhone ?? ""}
            onChange={(e) => setField("currLandlordPhone", e.target.value)}
          />
        </div>
      ) : null}

      {step === "5" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Previous street address"
            className="sm:col-span-2"
            value={fields.prevAddress ?? ""}
            onChange={(e) => setField("prevAddress", e.target.value)}
          />
          <PortalField
            label="City"
            value={fields.prevCity ?? ""}
            onChange={(e) => setField("prevCity", e.target.value)}
          />
          <PortalField
            label="State"
            value={fields.prevState ?? ""}
            onChange={(e) => setField("prevState", e.target.value)}
          />
          <PortalField
            label="Dates lived there"
            value={fields.prevDates ?? ""}
            onChange={(e) => setField("prevDates", e.target.value)}
            placeholder="e.g. Jan 2022 – Aug 2024"
          />
          <PortalField
            label="Landlord / manager"
            value={fields.prevLandlord ?? ""}
            onChange={(e) => setField("prevLandlord", e.target.value)}
          />
          <PortalField
            label="Reason for leaving"
            as="textarea"
            className="sm:col-span-2"
            value={fields.prevReason ?? ""}
            onChange={(e) => setField("prevReason", e.target.value)}
          />
        </div>
      ) : null}

      {step === "6" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Employer"
            required
            value={fields.employer ?? ""}
            onChange={(e) => setField("employer", e.target.value)}
          />
          <PortalField
            label="Job title"
            value={fields.jobTitle ?? ""}
            onChange={(e) => setField("jobTitle", e.target.value)}
          />
          <PortalField
            label="Monthly gross income (USD)"
            type="number"
            min={0}
            required
            value={fields.monthlyIncome ?? ""}
            onChange={(e) => setField("monthlyIncome", e.target.value)}
          />
          <PortalField
            label="Employment start date"
            type="date"
            value={fields.employmentStart ?? ""}
            onChange={(e) => setField("employmentStart", e.target.value)}
          />
          <PortalField
            label="Supervisor / HR contact"
            className="sm:col-span-2"
            value={fields.employerContact ?? ""}
            onChange={(e) => setField("employerContact", e.target.value)}
          />
          <PortalField
            label="Other income (optional)"
            className="sm:col-span-2"
            value={fields.otherIncome ?? ""}
            onChange={(e) => setField("otherIncome", e.target.value)}
            hint="Do not enter bank account or card numbers."
          />
        </div>
      ) : null}

      {step === "7" ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--harbor-muted)]">
            List other adults or minors who will live in the unit. Co-applicants
            can be invited later from the co-applicants page.
          </p>
          <PortalField
            label="Additional occupants"
            as="textarea"
            value={fields.occupants ?? ""}
            onChange={(e) => setField("occupants", e.target.value)}
            placeholder="Name, relationship, adult/minor — one per line. Or write “None”."
          />
          <PortalField
            label="Co-applicant email to invite (optional)"
            type="email"
            value={fields.coApplicantEmail ?? ""}
            onChange={(e) => setField("coApplicantEmail", e.target.value)}
          />
        </div>
      ) : null}

      {step === "8" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Do you have pets?"
            as="select"
            value={fields.hasPets ?? ""}
            onChange={(e) => setField("hasPets", e.target.value)}
          >
            <option value="">Select…</option>
            <option value="no">No pets</option>
            <option value="yes">Yes</option>
          </PortalField>
          <PortalField
            label="Assistance animals?"
            as="select"
            value={fields.hasAssistanceAnimal ?? "no"}
            onChange={(e) => setField("hasAssistanceAnimal", e.target.value)}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </PortalField>
          <PortalField
            label="Pet details"
            as="textarea"
            className="sm:col-span-2"
            value={fields.petDetails ?? ""}
            onChange={(e) => setField("petDetails", e.target.value)}
            placeholder="Type, breed, weight, age — or leave blank if none."
          />
        </div>
      ) : null}

      {step === "9" ? (
        <div className="space-y-3">
          <PortalField
            label="Vehicles"
            as="textarea"
            value={fields.vehicles ?? ""}
            onChange={(e) => setField("vehicles", e.target.value)}
            placeholder="Make, model, color, plate — one per line. Or “None”."
          />
          <PortalField
            label="Parking needs"
            value={fields.parkingNeeds ?? ""}
            onChange={(e) => setField("parkingNeeds", e.target.value)}
          />
        </div>
      ) : null}

      {step === "10" ? (
        <div className="space-y-3">
          <PortalField
            label="Have you ever been evicted?"
            as="select"
            value={fields.evicted ?? ""}
            onChange={(e) => setField("evicted", e.target.value)}
          >
            <option value="">Select…</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </PortalField>
          <PortalField
            label="Broken a lease?"
            as="select"
            value={fields.brokenLease ?? ""}
            onChange={(e) => setField("brokenLease", e.target.value)}
          >
            <option value="">Select…</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </PortalField>
          <PortalField
            label="Explain if you answered yes"
            as="textarea"
            value={fields.rentalHistoryNotes ?? ""}
            onChange={(e) => setField("rentalHistoryNotes", e.target.value)}
          />
        </div>
      ) : null}

      {step === "11" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Reference 1 name"
            value={fields.ref1Name ?? ""}
            onChange={(e) => setField("ref1Name", e.target.value)}
          />
          <PortalField
            label="Reference 1 phone / email"
            value={fields.ref1Contact ?? ""}
            onChange={(e) => setField("ref1Contact", e.target.value)}
          />
          <PortalField
            label="Reference 2 name"
            value={fields.ref2Name ?? ""}
            onChange={(e) => setField("ref2Name", e.target.value)}
          />
          <PortalField
            label="Reference 2 phone / email"
            value={fields.ref2Contact ?? ""}
            onChange={(e) => setField("ref2Contact", e.target.value)}
          />
          <PortalField
            label="Relationship to references"
            className="sm:col-span-2"
            value={fields.refRelationship ?? ""}
            onChange={(e) => setField("refRelationship", e.target.value)}
          />
        </div>
      ) : null}

      {step === "12" ? (
        <div className="space-y-4 text-sm text-[var(--harbor-ink)]">
          <p className="rounded-xl bg-[var(--harbor-mist)]/50 p-4">
            Harborline may run standard rental screening (credit, background,
            and rental history) through approved providers. Private screening
            criteria and internal notes are never shown to applicants in this
            portal. Do not enter full Social Security numbers or bank account
            numbers in this form.
          </p>
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              className="checkbox mt-1"
              checked={fields.screeningConsent === "yes"}
              onChange={(e) =>
                setField("screeningConsent", e.target.checked ? "yes" : "no")
              }
              required
            />
            <span>
              I understand and authorize Harborline to obtain screening reports
              related to this application. *
            </span>
          </label>
        </div>
      ) : null}

      {step === "13" ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--harbor-muted)]">
            Upload PDF or images up to 5 MB. Files are handled as a secure mock
            upload — nothing is written to a public folder.
          </p>
          <ul className="space-y-3">
            {DOC_CATEGORIES.map((cat) => {
              const existing = documents.find((d) => d.category === cat.id);
              return (
                <li
                  key={cat.id}
                  className="rounded-xl border border-[var(--harbor-deep)]/10 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--harbor-ink)]">
                      {cat.label}
                      {cat.id === "government_id" || cat.id === "proof_of_income"
                        ? " *"
                        : ""}
                    </p>
                    {existing ? (
                      <PortalStatusBadge tone="success">
                        {existing.fileName}
                      </PortalStatusBadge>
                    ) : (
                      <PortalStatusBadge tone="warning">Needed</PortalStatusBadge>
                    )}
                  </div>
                  <label className="mt-2 block text-sm">
                    <span className="sr-only">Upload {cat.label}</span>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      className="block w-full text-sm"
                      onChange={(e) => onUpload(cat.id, e.target.files?.[0])}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {step === "14" ? (
        <div className="space-y-4">
          <dl className="grid gap-2 rounded-xl border border-[var(--harbor-deep)]/10 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--harbor-muted)]">Amount</dt>
              <dd className="font-semibold">{money(FEE_AMOUNT)}</dd>
            </div>
            <div>
              <dt className="text-[var(--harbor-muted)]">Refundable?</dt>
              <dd className="font-semibold">No — nonrefundable</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--harbor-muted)]">What it covers</dt>
              <dd>
                Application processing and screening administration. This is a
                labeled demo payment — no real card data is collected or stored.
              </dd>
            </div>
          </dl>
          {feePaid ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Paid · Receipt {feeReceipt}
            </p>
          ) : (
            <button
              type="button"
              className="portal-btn portal-btn-primary portal-focus"
              disabled={feeBusy || saving}
              onClick={() => void payFee()}
            >
              {feeBusy ? "Processing…" : `Pay ${money(FEE_AMOUNT)} (demo)`}
            </button>
          )}
        </div>
      ) : null}

      {step === "15" ? (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-[var(--harbor-deep)]/10 p-4">
            <h3 className="font-semibold text-[var(--harbor-ink)]">Review</h3>
            <ul className="mt-2 space-y-1 text-[var(--harbor-muted)]">
              <li>
                Unit:{" "}
                {selectedUnit
                  ? `${selectedUnit.propertyName} · ${selectedUnit.unitLabel}`
                  : "Not selected"}
              </li>
              <li>
                Applicant: {fields.firstName} {fields.lastName} · {fields.email} ·{" "}
                {fields.phone}
              </li>
              <li>
                Current address: {fields.currAddress}, {fields.currCity}{" "}
                {fields.currState}
              </li>
              <li>
                Employment: {fields.employer} · Income {fields.monthlyIncome}
              </li>
              <li>Documents uploaded: {documents.length}</li>
              <li>Application fee: {feePaid ? "Paid" : "Not paid"}</li>
            </ul>
          </div>
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              className="checkbox mt-1"
              checked={fields.certified === "yes"}
              onChange={(e) =>
                setField("certified", e.target.checked ? "yes" : "no")
              }
              required
            />
            <span>
              I certify that the information in this application is true and
              complete to the best of my knowledge. *
            </span>
          </label>
          <PortalField
            label="Electronic signature (type your full legal name)"
            required
            value={fields.signature ?? ""}
            onChange={(e) => setField("signature", e.target.value)}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-[var(--harbor-deep)]/10 pt-4">
        <button
          type="button"
          className="portal-btn portal-btn-secondary portal-focus"
          onClick={() => void goBack()}
          disabled={step === "1" || saving}
        >
          Back
        </button>
        <button
          type="button"
          className="portal-btn portal-btn-secondary portal-focus"
          onClick={() => void saveLater()}
          disabled={saving}
        >
          Save for later
        </button>
        <button
          type="submit"
          className="portal-btn portal-btn-primary portal-focus"
          disabled={saving || feeBusy}
        >
          {step === "15"
            ? saving
              ? "Submitting…"
              : "Submit application"
            : saving
              ? "Saving…"
              : "Next"}
        </button>
      </div>
    </PortalCard>
  );
}

export function FutureApplyWizard() {
  const [session, setSession] = useState<PortalTenantSession | null>(null);

  useEffect(() => {
    let next = readFutureApplicantSessionSync();
    if (!next) {
      next = PORTAL_FUTURE_DEMO_APPLICANT;
      try {
        window.sessionStorage.setItem(
          PORTAL_DEMO_SESSION_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        /* ignore */
      }
      void ensurePortalDemoCookies().catch(() => {
        /* cookie optional for client wizard */
      });
    }
    setSession(next);
  }, []);

  if (!session) {
    return (
      <PortalCard className="space-y-4">
        <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
          Start your rental application
        </h2>
        <p className="text-[var(--harbor-muted)]">
          Preparing your applicant session…
        </p>
        <button
          type="button"
          className="portal-btn portal-btn-primary portal-focus"
          onClick={() => {
            try {
              window.sessionStorage.setItem(
                PORTAL_DEMO_SESSION_STORAGE_KEY,
                JSON.stringify(PORTAL_FUTURE_DEMO_APPLICANT)
              );
            } catch {
              /* ignore */
            }
            setSession(PORTAL_FUTURE_DEMO_APPLICANT);
            void ensurePortalDemoCookies().catch(() => {});
          }}
        >
          Start application now
        </button>
      </PortalCard>
    );
  }

  return <WizardInner session={session} />;
}
