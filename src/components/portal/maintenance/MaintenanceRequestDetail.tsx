"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useMaintenanceRequestDetail } from "@/hooks/useMaintenanceRequestDetail";
import {
  formatMaintenanceDate,
  maintenancePriorityClass,
  maintenanceRequestStatusClass,
} from "@/lib/portal/maintenance-format";
import type { MaintenanceStatusUpdate } from "@/lib/portal/maintenance-detail-types";
import { formatFileSize } from "@/lib/portal/maintenance-form-validation";

type Props = {
  requestId: string;
};

export function MaintenanceRequestDetail({ requestId }: Props) {
  const {
    state,
    actionMessage,
    actionError,
    busy,
    reload,
    addUpdate,
    cancelRequest,
  } = useMaintenanceRequestDetail(requestId);

  const updateFieldId = useId();
  const [updateText, setUpdateText] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await addUpdate(updateText);
    if (ok) setUpdateText("");
  }

  async function handleCancel() {
    const ok = await cancelRequest();
    if (ok) setShowCancelConfirm(false);
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--harbor-sand)]/70" />
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--harbor-sand)]/70" />
        <div className="h-56 animate-pulse rounded-2xl bg-[var(--harbor-sand)]/70" />
        <p className="sr-only">Loading maintenance request details…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="alert alert-error" role="alert">
        <div>
          <h2 className="font-semibold">Couldn’t load this request</h2>
          <p className="text-sm opacity-90">{state.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" onClick={() => void reload()}>
              Try again
            </button>
            <Link href="/portal/maintenance" className="btn btn-sm btn-ghost">
              Back to maintenance
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="alert" role="status">
        <div>
          <h2 className="font-semibold">Request not found</h2>
          <p className="text-sm opacity-90">{state.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/portal/maintenance" className="btn btn-sm btn-neutral">
              Back to maintenance
            </Link>
            <Link href="/portal/maintenance/new" className="btn btn-sm btn-ghost">
              Submit a new request
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const detail = state.detail;
  const canFollowUp =
    detail.status === "Open" || detail.status === "Scheduled";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-ink)]/50">
            {detail.requestNumber}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`badge ${maintenanceRequestStatusClass(detail.status)}`}
            >
              {detail.status}
            </span>
            <span
              className={`badge ${maintenancePriorityClass(detail.priority)}`}
            >
              {detail.priority}
            </span>
          </div>
          <h1 className="font-display text-2xl tracking-tight text-[var(--harbor-ink)] sm:text-3xl">
            {detail.title}
          </h1>
          <p className="text-sm text-[var(--harbor-ink)]/65">
            Submitted {detail.submittedAtLabel} · Last update{" "}
            {formatMaintenanceDate(detail.lastUpdate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/maintenance" className="btn btn-ghost btn-sm">
            All requests
          </Link>
          <Link href="/portal/maintenance/new" className="btn btn-outline btn-sm">
            New request
          </Link>
        </div>
      </div>

      {detail.status === "Cancelled" ? (
        <div className="alert" role="status">
          <span>
            This request was cancelled. Contact the office if you still need
            help, or submit a new request.
          </span>
        </div>
      ) : null}

      {detail.status === "Completed" ? (
        <div className="alert alert-success" role="status">
          <span>This request is marked completed.</span>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="alert alert-success" role="status">
          <span>{actionMessage}</span>
        </div>
      ) : null}

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="request-summary-heading"
      >
        <h2
          id="request-summary-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Request details
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailItem label="Category" value={detail.category} />
          <DetailItem label="Property / unit" value={detail.propertyOrUnit} />
          <DetailItem label="Location in unit" value={detail.locationInUnit} />
          <DetailItem
            label="Permission to enter"
            value={labelPermission(detail.permissionToEnter)}
          />
          <DetailItem
            label="Pets in unit"
            value={
              detail.petsInUnit === "yes"
                ? "Yes"
                : detail.petsInUnit === "no"
                  ? "No"
                  : "—"
            }
          />
          <DetailItem
            label="First noticed"
            value={
              detail.noticedOn
                ? formatMaintenanceDate(detail.noticedOn)
                : "Not specified"
            }
          />
          <DetailItem
            label="Recurring issue"
            value={
              detail.recurringIssue === "yes"
                ? "Yes"
                : detail.recurringIssue === "no"
                  ? "No"
                  : "—"
            }
          />
          <DetailItem
            label="Preferred service date"
            value={
              detail.preferredServiceDate
                ? formatMaintenanceDate(detail.preferredServiceDate)
                : "Not specified"
            }
          />
          <DetailItem
            label="Preferred service window"
            value={labelServiceWindow(detail.preferredServiceWindow)}
          />
          <DetailItem
            label="Scheduled visit"
            value={
              detail.scheduledOn
                ? formatMaintenanceDate(detail.scheduledOn)
                : "Not scheduled"
            }
          />
          <DetailItem
            label="Technician"
            value={detail.technicianName ?? "Not assigned"}
          />
          <DetailItem
            label="Last update"
            value={formatMaintenanceDate(detail.lastUpdate)}
          />
          <div className="sm:col-span-2">
            <DetailItem label="Description" value={detail.description} multiline />
          </div>
          {detail.safetyConcerns.trim() ? (
            <div className="sm:col-span-2">
              <DetailItem
                label="Safety concerns"
                value={detail.safetyConcerns}
                multiline
              />
            </div>
          ) : null}
          {detail.accessNotes.trim() ? (
            <div className="sm:col-span-2">
              <DetailItem
                label="Access notes"
                value={detail.accessNotes}
                multiline
              />
            </div>
          ) : null}
        </dl>

        <div className="mt-5 border-t border-[var(--harbor-deep)]/10 pt-4">
          <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">
            Contact for this request
          </h3>
          <dl className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Name" value={detail.contactName} />
            <DetailItem label="Phone" value={detail.contactPhone || "—"} />
            <DetailItem label="Email" value={detail.contactEmail || "—"} />
            <DetailItem
              label="Preferred method"
              value={labelContact(detail.preferredContactMethod)}
            />
            <DetailItem
              label="Best contact time"
              value={detail.bestContactTime || "—"}
            />
          </dl>
        </div>

        {detail.attachments.length > 0 ? (
          <div className="mt-5 border-t border-[var(--harbor-deep)]/10 pt-4">
            <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">
              Attachments
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-[var(--harbor-ink)]/80">
              {detail.attachments.map((file) => (
                <li key={file.id}>
                  {file.name} ({formatFileSize(file.size)})
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--harbor-ink)]/55">
              File previews are not shown in this demo.
            </p>
          </div>
        ) : null}
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="timeline-heading"
      >
        <h2
          id="timeline-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Updates &amp; timeline
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
          Status changes and messages appear here so you can track follow-up.
        </p>

        {detail.updates.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--harbor-ink)]/65" role="status">
            No updates yet.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {detail.updates.map((entry) => (
              <TimelineItem key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </section>

      {canFollowUp ? (
        <section
          className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
          aria-labelledby="follow-up-heading"
        >
          <h2
            id="follow-up-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Follow-up actions
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
            Add information for the office, or cancel this request if it no
            longer needs attention.
          </p>

          {actionError ? (
            <div className="alert alert-error mt-4" role="alert">
              <span>{actionError}</span>
            </div>
          ) : null}

          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => void handleUpdateSubmit(e)}
            noValidate
          >
            <div className="form-control">
              <label className="label" htmlFor={updateFieldId}>
                <span className="label-text font-medium">Add an update</span>
              </label>
              <textarea
                id={updateFieldId}
                className="textarea textarea-bordered min-h-24 w-full"
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Share new details, availability, or questions…"
                maxLength={1000}
                disabled={busy}
              />
              <div className="label">
                <span className="label-text-alt text-[var(--harbor-ink)]/55">
                  {updateText.trim().length}/1000
                </span>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-neutral"
              disabled={busy || updateText.trim().length < 3}
            >
              {busy ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Saving…
                </>
              ) : (
                "Post update"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-[var(--harbor-deep)]/10 pt-4">
            {!showCancelConfirm ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm text-error"
                onClick={() => setShowCancelConfirm(true)}
                disabled={busy}
              >
                Cancel this request
              </button>
            ) : (
              <div
                className="rounded-xl border border-error/30 bg-error/5 p-4"
                role="alertdialog"
                aria-labelledby="cancel-confirm-title"
              >
                <p
                  id="cancel-confirm-title"
                  className="font-medium text-[var(--harbor-ink)]"
                >
                  Cancel this maintenance request?
                </p>
                <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
                  The office will be notified that you no longer need this work
                  completed. You can still submit a new request later.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-error btn-sm"
                    onClick={() => void handleCancel()}
                    disabled={busy}
                  >
                    {busy ? "Cancelling…" : "Yes, cancel request"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={busy}
                  >
                    Keep request open
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <p className="text-sm text-[var(--harbor-ink)]/65">
        Need something unrelated?{" "}
        <Link href="/portal/maintenance/new" className="link link-primary">
          Submit a new maintenance request
        </Link>
        .
      </p>
    </div>
  );
}

function DetailItem({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-ink)]/50">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-[var(--harbor-ink)] ${
          multiline ? "whitespace-pre-wrap leading-relaxed" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function TimelineItem({ entry }: { entry: MaintenanceStatusUpdate }) {
  return (
    <li className="relative border-l-2 border-[var(--harbor-deep)]/15 pl-4">
      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--harbor-deep)]" />
      <p className="text-xs text-[var(--harbor-ink)]/55">
        {entry.createdAt} · {entry.author}
        <span className="ml-1 opacity-70">({labelUpdateKind(entry.kind)})</span>
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--harbor-ink)]">
        {entry.message}
      </p>
    </li>
  );
}

function labelUpdateKind(kind: MaintenanceStatusUpdate["kind"]) {
  switch (kind) {
    case "status":
      return "Status";
    case "note":
      return "Note";
    case "technician":
      return "Technician";
    case "schedule":
      return "Schedule";
    case "tenant":
      return "Your update";
    default:
      return "Update";
  }
}

function labelPermission(value: string) {
  switch (value) {
    case "yes":
      return "Yes — ok to enter if away";
    case "call-first":
      return "Call first";
    case "no":
      return "No — must be present";
    default:
      return "—";
  }
}

function labelContact(value: string) {
  switch (value) {
    case "email":
      return "Email";
    case "phone":
      return "Phone call";
    case "text":
      return "Text message";
    case "portal-message":
      return "Portal message";
    default:
      return "—";
  }
}

function labelServiceWindow(value: string) {
  switch (value) {
    case "morning":
      return "Morning (8 AM – 12 PM)";
    case "afternoon":
      return "Afternoon (12 PM – 5 PM)";
    case "evening":
      return "Evening (5 PM – 8 PM)";
    case "anytime":
      return "Anytime";
    default:
      return "No preference";
  }
}
