import { Mail, Phone } from "lucide-react";
import type { OwnerApplication } from "@/lib/owner-auth";
import { OwnerApplicationPropertySummary } from "@/components/OwnerApplicationPropertySummary";

/**
 * Properties-tab view of an owner application.
 * Decisions (send contract / request info / decline) live only in
 * Management → Owner Accounts & Applications.
 */
export function PendingApplicationCard({
  application,
}: {
  application: OwnerApplication;
}) {
  return (
    <article className="space-y-4 rounded-2xl border border-[var(--harbor-border)] bg-[var(--harbor-card)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--harbor-text)]">
            {application.fullName}
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            {application.companyName || "No company listed"} · Submitted{" "}
            {new Date(application.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`badge ${
            application.status === "needs_info" ? "badge-info" : "badge-warning"
          }`}
        >
          {application.status === "needs_info" ? "Needs info" : "Pending"}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={`mailto:${application.email}`}
          className="btn btn-outline btn-sm gap-1"
        >
          <Mail className="h-4 w-4" />
          {application.email}
        </a>
        {application.phone ? (
          <a
            href={`tel:${application.phone}`}
            className="btn btn-outline btn-sm gap-1"
          >
            <Phone className="h-4 w-4" />
            {application.phone}
          </a>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--harbor-text)]">
          Properties requested
        </p>
        <ul className="space-y-2">
          {application.properties.map((property, index) => (
            <li key={`${application.id}-${index}`}>
              <OwnerApplicationPropertySummary property={property} />
            </li>
          ))}
        </ul>
      </div>

      {(application.entityType ||
        application.mailingAddress ||
        application.communicationPreference) && (
        <div className="rounded-xl border border-[var(--harbor-border)] bg-[var(--harbor-sand)] px-3 py-2 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-muted-soft)]">
            Ownership / engagement
          </p>
          <p className="text-[var(--harbor-muted)]">
            {[
              application.entityType,
              application.mailingAddress,
              application.preferredContactMethod
                ? `Contact: ${application.preferredContactMethod}`
                : null,
              application.communicationPreference
                ? `Comm: ${application.communicationPreference.replaceAll("_", " ")}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-1 text-xs text-[var(--harbor-muted-soft)]">
            Docs ready:{" "}
            {[
              application.ownershipProofAvailable ? "deed" : null,
              application.rentRollAvailable ? "rent roll" : null,
              application.leasesAvailable ? "leases" : null,
              application.insuranceDocsAvailable ? "insurance" : null,
              application.bankingReady ? "banking" : null,
            ]
              .filter(Boolean)
              .join(", ") || "none marked"}
          </p>
        </div>
      )}

      {application.message ? (
        <p className="text-sm text-[var(--harbor-muted)]">
          <span className="font-medium text-[var(--harbor-text)]">Notes: </span>
          {application.message}
        </p>
      ) : null}

      {application.reviewedAt ? (
        <p className="text-xs text-[var(--harbor-muted-soft)]">
          Last review: {application.reviewedBy || "staff"} ·{" "}
          {new Date(application.reviewedAt).toLocaleString()}
          {application.reviewerDecision
            ? ` · ${application.reviewerDecision}`
            : ""}
        </p>
      ) : null}

      {application.reviewNotes ? (
        <p className="rounded-lg border border-[var(--harbor-border)] bg-[var(--harbor-sand)] px-3 py-2 text-sm text-[var(--harbor-muted)]">
          <span className="font-medium text-[var(--harbor-text)]">
            Review notes:{" "}
          </span>
          {application.reviewNotes}
        </p>
      ) : null}

      <div className="rounded-xl border border-dashed border-[var(--harbor-border)] bg-[var(--harbor-sand)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--harbor-text)]">
          Decisions are in Management
        </p>
        <p className="mt-1 text-sm text-[var(--harbor-muted)]">
          Send contract, request more information, and decline application are
          only available under Management → Owner Accounts &amp; Applications.
        </p>
      </div>
    </article>
  );
}

export function AwaitingSignatureCard({
  application,
}: {
  application: OwnerApplication;
}) {
  return (
    <article className="space-y-3 rounded-2xl border border-[var(--harbor-mid)]/25 bg-[var(--harbor-card)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--harbor-text)]">
            {application.fullName}
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            {application.companyName || "No company listed"} ·{" "}
            {application.email}
          </p>
        </div>
        <span className="badge badge-info">Awaiting signature</span>
      </div>
      <p className="text-sm text-[var(--harbor-muted)]">
        Contract sent for owner review. The applicant signs on{" "}
        <span className="font-medium text-[var(--harbor-text)]">
          Check Application Status
        </span>
        ; login credentials are issued there after they sign.
      </p>
      <p className="text-xs text-[var(--harbor-muted-soft)]">
        Sent{" "}
        {application.reviewedAt
          ? new Date(application.reviewedAt).toLocaleString()
          : "—"}
        {application.contractPropertyIds?.length
          ? ` · ${application.contractPropertyIds.length} agreement${application.contractPropertyIds.length === 1 ? "" : "s"}`
          : ""}
        {" · "}
        App ID: <span className="font-mono">{application.id}</span>
      </p>
    </article>
  );
}
