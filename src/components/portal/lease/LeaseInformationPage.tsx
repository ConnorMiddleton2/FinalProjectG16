"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  LoaderCircle,
  Mail,
  RefreshCw,
  ScrollText,
  X,
} from "lucide-react";
import { usePortalModal } from "@/hooks/usePortalModal";
import { useLeaseInformation } from "@/hooks/useLeaseInformation";
import {
  formatLeaseDate,
  leaseStatusClass,
} from "@/lib/portal/lease-format";
import { buildLeaseDocumentText } from "@/lib/portal/lease-mock";
import type { LeaseInformation } from "@/lib/portal/lease-types";

export function LeaseInformationPage() {
  const { state, reload, loadDemoData } = useLeaseInformation();
  const [showFullLease, setShowFullLease] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  function showSuccess(message: string) {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 3500);
  }

  function downloadLease(lease: LeaseInformation) {
    const text = buildLeaseDocumentText(lease);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = lease.documentFileName.replace(/\.pdf$/i, ".txt");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showSuccess(`Downloaded tenant copy of ${lease.documentTitle}.`);
  }

  if (state.status === "loading") {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          className="h-8 w-8 animate-spin text-[var(--harbor-mid)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--harbor-muted)]">
          Loading lease information…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className="rounded-2xl border border-error/30 bg-error/5 p-6"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-error" aria-hidden="true" />
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                Lease information unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                {state.message}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm gap-1"
                onClick={() => void reload()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadDemoData}
              >
                Use demo data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <ScrollText
            className="mt-0.5 h-5 w-5 text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              No lease on file
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--harbor-muted)]">
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/messages" className="btn btn-neutral btn-sm gap-1">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Contact Management
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadDemoData}
          >
            Preview with demo data
          </button>
        </div>
      </div>
    );
  }

  const { lease } = state;

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
        role="status"
      >
        Lease information loaded
        {state.source === "mock" ? " (demo data)" : ""}. Tenant-facing details
        only — private management notes are not shown.
      </div>

      {actionMessage ? (
        <div className="alert alert-success" role="status">
          <span>{actionMessage}</span>
        </div>
      ) : null}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${leaseStatusClass(lease.status)}`}>
              {lease.status}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
              {lease.leaseNumber}
            </span>
          </div>
          <h2 className="font-display text-2xl tracking-tight text-[var(--harbor-ink)] sm:text-3xl">
            {lease.propertyName}
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            {lease.unitNumber} · {formatLeaseDate(lease.leaseStartDate)} –{" "}
            {formatLeaseDate(lease.leaseEndDate)}
          </p>
        </div>
      </header>

      <LeaseActions
        onViewFull={() => setShowFullLease(true)}
        onDownload={() => downloadLease(lease)}
      />

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="lease-terms-heading"
      >
        <h3
          id="lease-terms-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Lease terms
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailItem label="Property address" value={lease.propertyAddress} />
          <DetailItem label="Unit number" value={lease.unitNumber} />
          <DetailItem
            label="Lease start date"
            value={formatLeaseDate(lease.leaseStartDate)}
          />
          <DetailItem
            label="Lease end date"
            value={formatLeaseDate(lease.leaseEndDate)}
          />
          <DetailItem label="Monthly rent" value={lease.monthlyRent} />
          <DetailItem label="Security deposit" value={lease.securityDeposit} />
          <DetailItem label="Lease status" value={lease.status} />
          <DetailItem
            label="Renewal deadline"
            value={formatLeaseDate(lease.renewalDeadline)}
          />
          <div className="sm:col-span-2">
            <DetailItem
              label="Move-out notice requirement"
              value={lease.moveOutNoticeRequirement}
            />
          </div>
        </dl>
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="occupants-heading"
      >
        <h3
          id="occupants-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Occupants
        </h3>
        {lease.occupants.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--harbor-muted)]" role="status">
            No occupants listed on this lease.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--harbor-deep)]/10">
            {lease.occupants.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <span className="font-medium text-[var(--harbor-ink)]">
                  {person.name}
                </span>
                <span className="text-sm text-[var(--harbor-muted)]">
                  {person.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
          aria-labelledby="parking-heading"
        >
          <h3
            id="parking-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Parking information
          </h3>
          <dl className="mt-4 space-y-3">
            <DetailItem
              label="Assigned spaces"
              value={String(lease.parking.spaces)}
            />
            <DetailItem label="Locations" value={lease.parking.locations} />
            <DetailItem label="Permits" value={lease.parking.permits} />
            <DetailItem label="Parking notes" value={lease.parking.notes} />
          </dl>
        </section>

        <section
          className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
          aria-labelledby="pets-heading"
        >
          <h3
            id="pets-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Pet information
          </h3>
          <dl className="mt-4 space-y-3">
            <DetailItem
              label="Pets allowed"
              value={lease.pets.allowed ? "Yes" : "No"}
            />
            <DetailItem label="Summary" value={lease.pets.summary} />
            <DetailItem label="Details" value={lease.pets.details} />
          </dl>
        </section>
      </div>

      {showFullLease ? (
        <FullLeaseModal
          lease={lease}
          onClose={() => setShowFullLease(false)}
          onDownload={() => downloadLease(lease)}
        />
      ) : null}
    </div>
  );
}

function LeaseActions({
  onViewFull,
  onDownload,
}: {
  onViewFull: () => void;
  onDownload: () => void;
}) {
  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="lease-actions-heading"
    >
      <h3
        id="lease-actions-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Actions
      </h3>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Review your lease document or continue with renewal, move-out, or
        management contact.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        <li>
          <button
            type="button"
            className="btn btn-neutral btn-sm min-h-11 gap-1"
            onClick={onViewFull}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            View Full Lease
          </button>
        </li>
        <li>
          <button
            type="button"
            className="btn btn-outline btn-sm min-h-11 gap-1"
            onClick={onDownload}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download Lease
          </button>
        </li>
        <li>
          <Link href="/portal/renewal" className="btn btn-outline btn-sm min-h-11">
            Request Renewal
          </Link>
        </li>
        <li>
          <Link href="/portal/move-out" className="btn btn-outline btn-sm min-h-11">
            Submit Move-Out Notice
          </Link>
        </li>
        <li>
          <Link
            href="/portal/messages"
            className="btn btn-ghost btn-sm min-h-11 gap-1"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Contact Management
          </Link>
        </li>
      </ul>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[var(--harbor-ink)] whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  );
}

function FullLeaseModal({
  lease,
  onClose,
  onDownload,
}: {
  lease: LeaseInformation;
  onClose: () => void;
  onDownload: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { containerRef, titleId } = usePortalModal({
    open: true,
    onClose,
    initialFocusRef: closeRef,
  });
  const documentText = buildLeaseDocumentText(lease);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--harbor-ink)]/40 p-3 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--harbor-deep)]/15 bg-white shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--harbor-deep)]/10 px-4 py-4 sm:px-5">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--harbor-ink)]"
            >
              Full lease
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-muted)]">
              {lease.documentTitle}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost btn-square min-h-11 min-w-11 portal-focus"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--harbor-ink)]/85">
            {documentText}
          </pre>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[var(--harbor-deep)]/10 px-4 py-4 sm:px-5">
          <button
            type="button"
            className="btn btn-neutral btn-sm min-h-11 gap-1"
            onClick={onDownload}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download Lease
          </button>
          <Link href="/portal/documents" className="btn btn-ghost btn-sm min-h-11">
            Open Documents
          </Link>
        </div>
      </div>
    </div>
  );
}
