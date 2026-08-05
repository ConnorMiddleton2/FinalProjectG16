"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CircleDot,
  Clock3,
  FileText,
  HelpCircle,
  MessageCircle,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";
import {
  APPLICATION_STATUS_DEFINITIONS,
  createDraftStatusRecord,
  getApplicationStatusMeta,
  readApplicationStatusRecords,
  updatePublicApplicationStatus,
  type ApplicationPublicStatus,
  type ApplicationStatusAction,
  type ApplicationStatusRecord,
} from "@/lib/application-status";
import {
  readRentalApplicationDraft,
  readSubmittedApplications,
} from "@/lib/rental-application";

function formatDate(value: string, fallback = "Not submitted"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString();
}

function statusToneClasses(status: ApplicationPublicStatus): string {
  switch (getApplicationStatusMeta(status).tone) {
    case "success":
      return "border-success/25 bg-success/10 text-success";
    case "warning":
      return "border-warning/30 bg-warning/10 text-warning";
    case "error":
      return "border-error/25 bg-error/10 text-error";
    case "info":
      return "border-info/25 bg-info/10 text-info";
    default:
      return "border-[var(--harbor-deep)]/15 bg-[var(--harbor-sand)]/60 text-[var(--harbor-ink)]";
  }
}

function actionDetails(
  action: ApplicationStatusAction,
  applicationId: string
): { label: string; href?: string; icon: typeof ArrowRight } {
  switch (action) {
    case "continue":
      return {
        label: "Continue Application",
        href: "/portal/apply",
        icon: ArrowRight,
      };
    case "pay":
      return {
        label: "Pay Application Fee",
        href: `/portal/applications/${applicationId}/fee`,
        icon: ArrowRight,
      };
    case "upload-document":
      return {
        label: "Upload Document",
        href: `/portal/applications/${applicationId}/documents`,
        icon: Upload,
      };
    case "provide-information":
      return {
        label: "Provide Information",
        href: `/portal/messages?application=${encodeURIComponent(applicationId)}&intent=additional-information`,
        icon: FileText,
      };
    case "review-application":
      return {
        label: "Review Application",
        href: `/portal/applications/${applicationId}/review`,
        icon: FileText,
      };
    case "review-lease-offer":
      return {
        label: "Review Lease Offer",
        href: "/portal/offers",
        icon: FileText,
      };
    case "contact-leasing":
      return {
        label: "Contact Leasing",
        href: `/portal/messages?application=${encodeURIComponent(applicationId)}`,
        icon: MessageCircle,
      };
    case "withdraw":
      return { label: "Withdraw Application", icon: XCircle };
  }
}

function ApplicationTimeline({
  record,
}: {
  record: ApplicationStatusRecord;
}) {
  return (
    <ol className="relative ml-2 border-l border-[var(--harbor-deep)]/15 pl-5">
      {record.timeline.map((event, index) => {
        const current = index === record.timeline.length - 1;
        return (
          <li
            key={event.id}
            className={index === record.timeline.length - 1 ? "" : "pb-5"}
          >
            <span
              className={`absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${
                current
                  ? "bg-[var(--harbor-mid)]"
                  : "bg-[var(--harbor-ink)]/35"
              }`}
              aria-hidden="true"
            />
            <div className={current ? "" : "opacity-70"}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{event.status}</p>
                {current ? (
                  <span className="badge badge-sm badge-outline">Current</span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-[var(--harbor-ink)]/50">
                {formatDate(event.occurredAt, "Date unavailable")}
              </p>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
                {event.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StatusActions({
  record,
  onWithdraw,
}: {
  record: ApplicationStatusRecord;
  onWithdraw: (applicationId: string) => void;
}) {
  const meta = getApplicationStatusMeta(record.currentStatus);

  if (meta.actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {meta.actions.map((action) => {
        const details = actionDetails(action, record.applicationId);
        const Icon = details.icon;
        if (action === "withdraw") {
          return (
            <button
              key={action}
              type="button"
              className="btn btn-ghost btn-sm gap-1 text-error"
              onClick={() => onWithdraw(record.applicationId)}
            >
              <Icon className="h-4 w-4" />
              {details.label}
            </button>
          );
        }
        return (
          <Link
            key={action}
            href={details.href ?? "/portal/applications"}
            className={`btn btn-sm gap-1 ${
              action === "continue" ||
              action === "pay" ||
              action === "upload-document" ||
              action === "provide-information" ||
              action === "review-lease-offer"
                ? "btn-neutral"
                : "btn-outline"
            }`}
          >
            <Icon className="h-4 w-4" />
            {details.label}
          </Link>
        );
      })}
    </div>
  );
}

function ApplicationStatusCard({
  record,
  onWithdraw,
}: {
  record: ApplicationStatusRecord;
  onWithdraw: (applicationId: string) => void;
}) {
  const meta = getApplicationStatusMeta(record.currentStatus);

  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90">
      <div className="border-b border-[var(--harbor-deep)]/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
              Application {record.applicationNumber}
            </p>
            <h2 className="mt-1 font-display text-2xl">
              {record.applicantName}
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
              {record.property} · {record.unit}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusToneClasses(record.currentStatus)}`}
          >
            {record.currentStatus}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Applicant", record.applicantName],
            ["Property", record.property],
            ["Unit", record.unit],
            ["Application number", record.applicationNumber],
            ["Submission date", formatDate(record.submissionDate)],
            ["Current status", record.currentStatus],
            [
              "Last updated",
              formatDate(record.lastUpdatedAt, "Date unavailable"),
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-[var(--harbor-sand)]/45 px-3 py-2"
            >
              <dt className="text-[10px] uppercase tracking-wide opacity-50">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 rounded-2xl border border-[var(--harbor-mid)]/20 bg-[var(--harbor-mist)]/25 p-4">
          <div className="flex items-start gap-2">
            <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/50">
                What this means
              </p>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
                {meta.explanation}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 border-t border-[var(--harbor-deep)]/10 pt-3">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/50">
                Next required action
              </p>
              <p className="mt-1 text-sm font-semibold">
                {meta.nextRequiredAction}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto]">
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/55">
            Application timeline
          </h3>
          <ApplicationTimeline record={record} />
        </div>
        <div className="lg:min-w-52">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/55">
            Available actions
          </h3>
          <StatusActions record={record} onWithdraw={onWithdraw} />
        </div>
      </div>
    </article>
  );
}

export function ApplicationStatusDashboard() {
  const [records, setRecords] = useState<ApplicationStatusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);

  function refresh() {
    setError(null);
    try {
      const submissions = readSubmittedApplications();
      const submittedRecords = readApplicationStatusRecords(submissions);
      const draft = readRentalApplicationDraft();
      const draftRecord =
        draft && draft.status === "draft" ? createDraftStatusRecord(draft) : null;
      setRecords(
        draftRecord
          ? [
              draftRecord,
              ...submittedRecords.filter(
                (record) => record.applicationId !== draftRecord.applicationId
              ),
            ]
          : submittedRecords
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load application statuses."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function confirmWithdrawal() {
    if (!withdrawTarget) return;
    const updated = updatePublicApplicationStatus(
      withdrawTarget,
      "Withdrawn",
      "Application withdrawn by the applicant."
    );
    if (updated) {
      setRecords((current) =>
        current.map((record) =>
          record.applicationId === updated.applicationId ? updated : record
        )
      );
    }
    setWithdrawTarget(null);
  }

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Applicant journey
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          Application status
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Follow each application, understand what its status means, and take
          only the actions currently needed from you.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/20 bg-white/65 px-4 py-3 text-sm text-[var(--harbor-ink)]/65">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
        <p>
          This dashboard shows applicant-facing updates only. Private screening
          criteria, scores, and internal management notes are never displayed.
        </p>
      </div>

      {error ? (
        <div className="alert border-error/20 bg-error/10">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1 text-sm">{error}</div>
          <button
            type="button"
            className="btn btn-sm btn-outline gap-1"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-72 w-full rounded-3xl" />
          <div className="skeleton h-48 w-full rounded-3xl" />
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/65 px-6 py-14 text-center">
          <FileText className="mx-auto h-10 w-10 text-[var(--harbor-mid)]" />
          <h2 className="mt-4 font-display text-3xl">No applications yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--harbor-ink)]/60">
            Start an application to see its status and timeline here.
          </p>
          <Link href="/portal/apply" className="btn btn-neutral mt-6">
            Start application
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {records.map((record) => (
            <ApplicationStatusCard
              key={record.applicationId}
              record={record}
              onWithdraw={setWithdrawTarget}
            />
          ))}
        </div>
      )}

      <details className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-5">
        <summary className="cursor-pointer list-none font-semibold">
          Status guide: what every status means
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {APPLICATION_STATUS_DEFINITIONS.map((definition) => (
            <div
              key={definition.status}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/35 p-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    definition.tone === "success"
                      ? "bg-success"
                      : definition.tone === "warning"
                        ? "bg-warning"
                        : definition.tone === "error"
                          ? "bg-error"
                          : definition.tone === "info"
                            ? "bg-info"
                            : "bg-[var(--harbor-ink)]/40"
                  }`}
                />
                <h3 className="font-semibold">{definition.status}</h3>
              </div>
              <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
                {definition.explanation}
              </p>
            </div>
          ))}
        </div>
      </details>

      {withdrawTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--harbor-ink)]/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Withdraw application"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <XCircle className="h-8 w-8 text-error" />
            <h2 className="mt-3 font-display text-3xl">
              Withdraw application?
            </h2>
            <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
              The application will no longer be considered. Fees already used
              for screening remain subject to the refundability policy.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setWithdrawTarget(null)}
              >
                Keep application
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={confirmWithdrawal}
              >
                Withdraw application
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
