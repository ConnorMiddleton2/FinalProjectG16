"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Lock,
  Pencil,
  Shield,
} from "lucide-react";
import {
  DOCUMENT_CATEGORIES,
  formatFileSize,
} from "@/lib/application-documents";
import {
  feePaymentMethodLabel,
  formatFeeAmount,
} from "@/lib/application-fee";
import { getPartyRoleMeta, invitationStatusLabel } from "@/lib/application-parties";
import {
  collectApplicationReviewIssues,
  isApplicationLocked,
  type ApplicationStepId,
  type RentalApplicationDraft,
} from "@/lib/rental-application";

type Props = {
  draft: RentalApplicationDraft;
  onChange: (partial: Partial<RentalApplicationDraft>) => void;
  onEditStep: (stepId: ApplicationStepId) => void;
  onSubmit: () => void;
  /** Hide the wizard's duplicate submit footer when true. */
  showSubmitButton?: boolean;
};

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

function formatAddress(address: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const line = [address.street, address.city, address.state, address.zip]
    .map((part) => part.trim())
    .filter(Boolean);
  return line.length ? line.join(", ") : "—";
}

function ReviewSection({
  title,
  stepId,
  locked,
  onEditStep,
  children,
  issue,
}: {
  title: string;
  stepId: ApplicationStepId;
  locked: boolean;
  onEditStep: (stepId: ApplicationStepId) => void;
  children: React.ReactNode;
  issue?: string;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 sm:p-5 ${
        issue
          ? "border-error/30 bg-error/5"
          : "border-[var(--harbor-deep)]/10 bg-white/70"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {issue ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-error">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {issue}
            </p>
          ) : null}
        </div>
        {locked ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--harbor-ink)]/45">
            <Lock className="h-3.5 w-3.5" />
            Locked
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-xs gap-1"
            onClick={() => onEditStep(stepId)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DetailGrid({
  items,
}: {
  items: Array<[string, string]>;
}) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl bg-[var(--harbor-sand)]/50 px-3 py-2"
        >
          <dt className="text-[10px] uppercase tracking-wide opacity-50">
            {label}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold break-words">
            {value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ApplicationReviewStep({
  draft,
  onChange,
  onEditStep,
  onSubmit,
  showSubmitButton = true,
}: Props) {
  const locked = isApplicationLocked(draft);
  const issues = locked ? [] : collectApplicationReviewIssues(draft);
  const issueByStep = new Map(
    issues.map((issue) => [issue.stepId, issue.message] as const)
  );
  const successfulDocs = draft.documents.filter(
    (doc) => doc.status === "success"
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl">
          {locked ? "Submitted application" : "Review and certification"}
        </h2>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
          {locked
            ? "This application is locked after submission. Fields stay read-only unless management permits changes."
            : "Review every section, fix anything missing, re-read disclosures, certify, sign electronically, and submit."}
        </p>
      </div>

      {locked ? (
        <div className="flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-sand)]/45 px-4 py-3 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
          <div>
            <p className="font-semibold">Application locked</p>
            <p className="mt-0.5 text-[var(--harbor-ink)]/65">
              Confirmation {draft.confirmationNumber || "—"} · Submitted{" "}
              {draft.submittedAt
                ? new Date(draft.submittedAt).toLocaleString()
                : "—"}
              . Contact leasing if you need management to unlock edits.
            </p>
          </div>
        </div>
      ) : null}

      {!locked && issues.length > 0 ? (
        <div className="rounded-2xl border border-error/25 bg-error/5 px-4 py-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
            <div className="flex-1">
              <p className="font-semibold text-error">
                Missing information ({issues.length})
              </p>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
                Resolve these items before you can submit.
              </p>
              <ul className="mt-3 space-y-2">
                {issues.map((issue) => (
                  <li
                    key={issue.stepId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm"
                  >
                    <span>
                      <strong>{issue.stepTitle}:</strong> {issue.message}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs gap-1"
                      onClick={() => onEditStep(issue.stepId)}
                    >
                      <Pencil className="h-3 w-3" />
                      Fix
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {!locked && issues.length === 0 ? (
        <div className="flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/25 bg-white/70 px-4 py-3 text-sm text-[var(--harbor-ink)]/70">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
          <p>
            Required application sections look complete. Review the details
            below, then certify and sign to submit.
          </p>
        </div>
      ) : null}

      <ReviewSection
        title="Unit selection"
        stepId="unit"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("unit")}
      >
        <DetailGrid
          items={[
            ["Property", draft.property],
            ["Floor plan / unit", draft.floorPlan],
            ["Desired move-in", draft.desiredMoveInDate],
            ["Lease term", draft.leaseTerm],
          ]}
        />
      </ReviewSection>

      <ReviewSection
        title="Applicant information"
        stepId="applicant"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("applicant")}
      >
        <DetailGrid
          items={[
            ["Full name", draft.applicantFullName],
            ["Date of birth", draft.dateOfBirth],
            ["Government ID type", draft.governmentIdType],
            [
              "Photo ID for screening",
              draft.governmentIdProvidedOffline ? "Confirmed" : "Not confirmed",
            ],
          ]}
        />
      </ReviewSection>

      <ReviewSection
        title="Contact information"
        stepId="contact"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("contact")}
      >
        <DetailGrid
          items={[
            ["Email", draft.email],
            ["Phone", draft.phone],
            ["Alternate phone", draft.alternatePhone || "—"],
            ["Preferred contact", draft.preferredContact],
          ]}
        />
      </ReviewSection>

      <ReviewSection
        title="Current residence"
        stepId="currentResidence"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("currentResidence")}
      >
        <DetailGrid
          items={[
            ["Address", formatAddress(draft.currentResidence)],
            ["Move-in date", draft.currentResidence.moveInDate],
            ["Monthly rent", draft.currentResidence.monthlyRent || "—"],
            ["Landlord", draft.currentResidence.landlordName || "—"],
            ["Landlord phone", draft.currentResidence.landlordPhone || "—"],
            ["Reason for leaving", draft.currentResidence.reasonForLeaving],
          ]}
        />
      </ReviewSection>

      <ReviewSection
        title="Previous residence"
        stepId="previousResidence"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("previousResidence")}
      >
        {draft.hasPreviousResidence ? (
          <DetailGrid
            items={[
              ["Address", formatAddress(draft.previousResidence)],
              ["Move-in", draft.previousResidence.moveInDate],
              ["Move-out", draft.previousResidence.moveOutDate],
              ["Landlord", draft.previousResidence.landlordName || "—"],
              ["Landlord phone", draft.previousResidence.landlordPhone || "—"],
            ]}
          />
        ) : (
          <p className="text-sm text-[var(--harbor-ink)]/60">
            No previous residence reported.
          </p>
        )}
      </ReviewSection>

      <ReviewSection
        title="Employment and income"
        stepId="employment"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("employment")}
      >
        <DetailGrid
          items={[
            ["Status", draft.employmentStatus],
            ["Employer", draft.employerName || "—"],
            ["Job title", draft.jobTitle || "—"],
            ["Employer phone", draft.employerPhone || "—"],
            ["Monthly income", draft.monthlyIncome],
            ["Additional income", draft.additionalIncome || "—"],
            ["Additional source", draft.additionalIncomeSource || "—"],
          ]}
        />
      </ReviewSection>

      <ReviewSection
        title="Household and parties"
        stepId="occupants"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("occupants")}
      >
        {draft.parties.length === 0 ? (
          <p className="text-sm text-[var(--harbor-ink)]/60">
            Primary applicant only — no additional parties listed.
          </p>
        ) : (
          <ul className="space-y-2">
            {draft.parties.map((party) => (
              <li
                key={party.id}
                className="rounded-xl bg-[var(--harbor-sand)]/50 px-3 py-2 text-sm"
              >
                <p className="font-semibold">
                  {party.fullName || "Unnamed"} ·{" "}
                  {getPartyRoleMeta(party.role).label}
                </p>
                <p className="text-[var(--harbor-ink)]/60">
                  {party.relationshipToPrimary || "Relationship not set"}
                  {party.email ? ` · ${party.email}` : ""}
                  {" · "}
                  {invitationStatusLabel(party.invitationStatus)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>

      <ReviewSection
        title="Pets"
        stepId="pets"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("pets")}
      >
        {!draft.hasPets ? (
          <p className="text-sm text-[var(--harbor-ink)]/60">No pets listed.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {draft.pets.map((pet) => (
              <li key={pet.id} className="rounded-xl bg-[var(--harbor-sand)]/50 px-3 py-2">
                <strong>{pet.name || "Unnamed"}</strong> · {pet.type || "Type?"}
                {pet.breed ? ` · ${pet.breed}` : ""}
                {pet.weight ? ` · ${pet.weight}` : ""}
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>

      <ReviewSection
        title="Vehicles"
        stepId="vehicles"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("vehicles")}
      >
        {!draft.hasVehicles ? (
          <p className="text-sm text-[var(--harbor-ink)]/60">
            No vehicles listed.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {draft.vehicles.map((vehicle) => (
              <li
                key={vehicle.id}
                className="rounded-xl bg-[var(--harbor-sand)]/50 px-3 py-2"
              >
                {[vehicle.year, vehicle.make, vehicle.model, vehicle.color]
                  .filter(Boolean)
                  .join(" ") || "Vehicle details incomplete"}
                {vehicle.plateState ? ` · ${vehicle.plateState}` : ""}
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>

      <ReviewSection
        title="Rental history"
        stepId="rentalHistory"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("rentalHistory")}
      >
        <DetailGrid
          items={[
            [
              "Ever evicted",
              draft.everEvicted === "yes"
                ? "Yes"
                : draft.everEvicted === "no"
                  ? "No"
                  : "—",
            ],
            [
              "Ever broke a lease",
              draft.everBrokeLease === "yes"
                ? "Yes"
                : draft.everBrokeLease === "no"
                  ? "No"
                  : "—",
            ],
            ["Notes", draft.rentalHistoryNotes || "—"],
          ]}
        />
      </ReviewSection>

      <ReviewSection
        title="References"
        stepId="references"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("references")}
      >
        <ul className="space-y-2 text-sm">
          {draft.references.map((reference) => (
            <li
              key={reference.id}
              className="rounded-xl bg-[var(--harbor-sand)]/50 px-3 py-2"
            >
              <p className="font-semibold">
                {reference.fullName || "Unnamed reference"}
              </p>
              <p className="text-[var(--harbor-ink)]/60">
                {reference.relationship || "—"}
                {reference.phone ? ` · ${reference.phone}` : ""}
                {reference.email ? ` · ${reference.email}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </ReviewSection>

      <ReviewSection
        title="Screening disclosures"
        stepId="screening"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("screening")}
      >
        <DetailGrid
          items={[
            [
              "Screening authorization",
              draft.authorizeScreening ? "Accepted" : "Missing",
            ],
            [
              "Fair housing acknowledgment",
              draft.acknowledgeFairHousing ? "Accepted" : "Missing",
            ],
            ["Optional notes", draft.disclosureNotes || "—"],
          ]}
        />
      </ReviewSection>

      <ReviewSection
        title="Uploaded documents"
        stepId="documents"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("documents")}
      >
        {successfulDocs.length === 0 ? (
          <p className="text-sm text-[var(--harbor-ink)]/60">
            No successful uploads yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {DOCUMENT_CATEGORIES.map((category) => {
              const docs = successfulDocs.filter(
                (doc) => doc.category === category.id
              );
              if (docs.length === 0) return null;
              return (
                <li key={category.id} className="text-sm">
                  <p className="font-semibold">{category.label}</p>
                  <ul className="mt-1 space-y-1">
                    {docs.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center gap-2 rounded-xl bg-[var(--harbor-sand)]/50 px-3 py-2"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
                        <span className="min-w-0 flex-1 truncate">
                          {doc.fileName}
                        </span>
                        <span className="text-xs opacity-55">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-[var(--harbor-ink)]/50">
          Document contents stay in secure mock storage — only file metadata is
          listed here.
          {successfulDocs.length > 0
            ? ` ${successfulDocs.length} file${successfulDocs.length === 1 ? "" : "s"} attached.`
            : ""}
        </p>
      </ReviewSection>

      <ReviewSection
        title="Application fee"
        stepId="fee"
        locked={locked}
        onEditStep={onEditStep}
        issue={issueByStep.get("fee")}
      >
        <DetailGrid
          items={[
            [
              "Status",
              draft.feeStatus === "paid"
                ? "Paid"
                : draft.feeStatus === "failed"
                  ? "Failed"
                  : draft.feeStatus === "processing"
                    ? "Processing"
                    : "Unpaid",
            ],
            ["Amount", formatFeeAmount()],
            ["Method", feePaymentMethodLabel(draft.feePaymentMethod)],
            ["Receipt", draft.feeReceiptId || "—"],
            ["Reference", draft.feePaymentReference || "—"],
            [
              "Paid at",
              draft.feePaidAt
                ? new Date(draft.feePaidAt).toLocaleString()
                : "—",
            ],
            ["Billing name", draft.feeBillingName || "—"],
            ["Billing email", draft.feeBillingEmail || "—"],
          ]}
        />
      </ReviewSection>

      <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-4 sm:p-5">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
          <div>
            <h3 className="font-semibold">Disclosures</h3>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
              By submitting, you reaffirm the screening authorization and fair
              housing acknowledgment from earlier, and confirm the application
              fee is non-refundable once screening begins. Harborline does not
              collect full SSN, bank, or unmasked ID numbers in this portal.
            </p>
            <ul className="mt-3 list-inside list-disc text-sm text-[var(--harbor-ink)]/60">
              <li>
                Screening authorization:{" "}
                {draft.authorizeScreening ? "Accepted" : "Not accepted"}
              </li>
              <li>
                Fair housing acknowledgment:{" "}
                {draft.acknowledgeFairHousing ? "Accepted" : "Not accepted"}
              </li>
              <li>
                Fee refundability acknowledgment:{" "}
                {draft.feeRefundPolicyAcknowledged
                  ? "Accepted"
                  : "Not accepted"}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-4 sm:p-5">
        <h3 className="font-semibold">Certifications and electronic signature</h3>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5"
            checked={draft.certifyAccuracy}
            disabled={locked}
            onChange={(event) =>
              onChange({ certifyAccuracy: event.target.checked })
            }
          />
          <span>
            <RequiredMark /> I certify that the information in this application
            is true and complete to the best of my knowledge.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5"
            checked={draft.certifyAuthorization}
            disabled={locked}
            onChange={(event) =>
              onChange({ certifyAuthorization: event.target.checked })
            }
          />
          <span>
            <RequiredMark /> I authorize Harborline to process this application
            and related screening permitted by law.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5"
            checked={draft.certifyElectronicSignature}
            disabled={locked}
            onChange={(event) =>
              onChange({ certifyElectronicSignature: event.target.checked })
            }
          />
          <span>
            <RequiredMark /> I agree that typing my name below is my electronic
            signature with the same effect as a handwritten signature.
          </span>
        </label>
        <label className="block max-w-md">
          <FieldLabel required>Electronic signature</FieldLabel>
          <input
            className="input input-bordered w-full font-[cursive] text-xl"
            placeholder="Type your full legal name"
            value={draft.signatureName}
            disabled={locked}
            onChange={(event) =>
              onChange({ signatureName: event.target.value })
            }
          />
          <span className="mt-1 block text-xs text-[var(--harbor-ink)]/50">
            Supported in this portal as a typed electronic signature.
          </span>
        </label>
      </section>

      {!locked && showSubmitButton ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--harbor-deep)]/10 pt-4">
          <p className="text-sm text-[var(--harbor-ink)]/55">
            {issues.length > 0
              ? "Submit stays disabled until missing items and certifications are complete."
              : "Ready to submit when certifications and signature are complete."}
          </p>
          <button
            type="button"
            className="btn btn-neutral"
            disabled={
              issues.length > 0 ||
              !draft.certifyAccuracy ||
              !draft.certifyAuthorization ||
              !draft.certifyElectronicSignature ||
              !draft.signatureName.trim()
            }
            onClick={onSubmit}
          >
            Submit application
          </button>
        </div>
      ) : null}

      {locked && draft.managementEditsPermitted ? (
        <p className="text-sm text-[var(--harbor-mid)]">
          Management has permitted changes on this application.
        </p>
      ) : null}
    </div>
  );
}
