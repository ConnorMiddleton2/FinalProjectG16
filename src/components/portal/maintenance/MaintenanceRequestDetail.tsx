"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  CalendarClock,
  ClipboardList,
  FileText,
  Paperclip,
  UserRound,
  Wrench,
} from "lucide-react";
import { usePortalModal } from "@/hooks/usePortalModal";
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
  const cancelDismissRef = useRef<HTMLButtonElement>(null);
  const { containerRef: cancelConfirmRef, titleId: cancelConfirmTitleId } =
    usePortalModal({
      open: showCancelConfirm,
      onClose: () => setShowCancelConfirm(false),
      initialFocusRef: cancelDismissRef,
    });

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
            <button
              type="button"
              className="btn btn-sm min-h-11"
              onClick={() => void reload()}
            >
              Try again
            </button>
            <Link
              href="/portal/maintenance"
              className="btn btn-sm btn-ghost min-h-11"
            >
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
            <Link
              href="/portal/maintenance"
              className="btn btn-sm btn-neutral min-h-11"
            >
              Back to maintenance
            </Link>
            <Link
              href="/portal/maintenance/new"
              className="btn btn-sm btn-ghost min-h-11"
            >
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
  const tenantNotes = detail.updates.filter(
    (entry) =>
      (entry.visibility ?? "tenant") === "tenant" &&
      (entry.kind === "note" || entry.kind === "tenant")
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
            Request number
          </p>
          <p className="font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
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
          <h2 className="font-display text-2xl tracking-tight text-[var(--harbor-ink)] sm:text-3xl">
            {detail.title}
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            Submitted {detail.submittedAtLabel} · Last update{" "}
            {formatMaintenanceDate(detail.lastUpdate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/portal/maintenance"
            className="btn btn-ghost btn-sm min-h-11"
          >
            All requests
          </Link>
          <Link
            href="/portal/maintenance/new"
            className="btn btn-outline btn-sm min-h-11"
          >
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
          aria-labelledby="appointment-heading"
        >
          <div className="flex items-center gap-2">
            <CalendarClock
              className="h-5 w-5 text-[var(--harbor-mid)]"
              aria-hidden="true"
            />
            <h2
              id="appointment-heading"
              className="text-lg font-semibold text-[var(--harbor-ink)]"
            >
              Appointment information
            </h2>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailItem
              label="Scheduled visit"
              value={
                detail.scheduledOn
                  ? formatMaintenanceDate(detail.scheduledOn)
                  : "Not scheduled yet"
              }
            />
            <DetailItem
              label="Appointment window"
              value={detail.appointmentWindow ?? "—"}
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
              label="Preferred window"
              value={labelServiceWindow(detail.preferredServiceWindow)}
            />
          </dl>
        </section>

        <section
          className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
          aria-labelledby="technician-heading"
        >
          <div className="flex items-center gap-2">
            <Wrench
              className="h-5 w-5 text-[var(--harbor-mid)]"
              aria-hidden="true"
            />
            <h2
              id="technician-heading"
              className="text-lg font-semibold text-[var(--harbor-ink)]"
            >
              Technician information
            </h2>
          </div>
          {detail.technicianName ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Technician" value={detail.technicianName} />
              <DetailItem
                label="Company"
                value={detail.technicianCompany ?? "—"}
              />
              <DetailItem
                label="Contact phone"
                value={detail.technicianPhone ?? "—"}
              />
              <DetailItem
                label="Permission to enter"
                value={labelPermission(detail.permissionToEnter)}
              />
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[var(--harbor-muted)]" role="status">
              A technician has not been assigned yet. Appointment and contact
              details will appear here when available.
            </p>
          )}
        </section>
      </div>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="request-summary-heading"
      >
        <div className="flex items-center gap-2">
          <ClipboardList
            className="h-5 w-5 text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <h2
            id="request-summary-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Request details
          </h2>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailItem label="Category" value={detail.category} />
          <DetailItem label="Property / unit" value={detail.propertyOrUnit} />
          <DetailItem label="Location in unit" value={detail.locationInUnit} />
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
          <div className="flex items-center gap-2">
            <UserRound
              className="h-4 w-4 text-[var(--harbor-mid)]"
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">
              Contact for this request
            </h3>
          </div>
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
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="attachments-heading"
      >
        <div className="flex items-center gap-2">
          <Paperclip
            className="h-5 w-5 text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <h2
            id="attachments-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Attachments
          </h2>
        </div>
        {detail.attachments.length > 0 ? (
          <>
            <ul className="mt-4 space-y-2">
              {detail.attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[var(--harbor-sand)]/45 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-[var(--harbor-ink)]">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-[var(--harbor-muted)]">
                    {formatFileSize(file.size)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--harbor-muted)]">
              File previews are not shown in this demo. Download links will
              appear when live storage is connected.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-[var(--harbor-muted)]" role="status">
            No photos or documents were attached to this request.
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="tenant-notes-heading"
      >
        <div className="flex items-center gap-2">
          <FileText
            className="h-5 w-5 text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <h2
            id="tenant-notes-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Notes visible to you
          </h2>
        </div>
        <p className="mt-1 text-sm text-[var(--harbor-muted)]">
          Only tenant-facing updates appear here. Internal employee notes are
          never shown in the portal.
        </p>
        {tenantNotes.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--harbor-muted)]" role="status">
            No tenant-visible notes yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {tenantNotes.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-[var(--harbor-deep)]/10 px-3 py-3"
              >
                <p className="text-xs text-[var(--harbor-muted)]">
                  {entry.createdAt} · {entry.author}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--harbor-ink)]">
                  {entry.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="timeline-heading"
      >
        <h2
          id="timeline-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Status timeline
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-muted)]">
          Status changes, schedule updates, technician assignments, and your
          follow-ups appear here.
        </p>

        {detail.updates.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--harbor-muted)]" role="status">
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
          <p className="mt-1 text-sm text-[var(--harbor-muted)]">
            Add information for the office, or cancel this request if it no
            longer needs attention.
          </p>

          {actionError ? (
            <div
              id={`${updateFieldId}-error`}
              className="alert alert-error mt-4"
              role="alert"
            >
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
                aria-invalid={Boolean(actionError)}
                aria-describedby={
                  actionError ? `${updateFieldId}-error` : undefined
                }
              />
              <div className="label">
                <span className="label-text-alt text-[var(--harbor-muted)]">
                  {updateText.trim().length}/1000
                </span>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-neutral min-h-11"
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
                className="btn btn-ghost btn-sm min-h-11 text-error"
                onClick={() => setShowCancelConfirm(true)}
                disabled={busy}
              >
                Cancel this request
              </button>
            ) : (
              <div
                ref={cancelConfirmRef}
                className="rounded-xl border border-error/30 bg-error/5 p-4 outline-none"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={cancelConfirmTitleId}
                tabIndex={-1}
              >
                <h2
                  id={cancelConfirmTitleId}
                  className="text-base font-medium text-[var(--harbor-ink)]"
                >
                  Cancel this maintenance request?
                </h2>
                <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                  The office will be notified that you no longer need this work
                  completed. You can still submit a new request later.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-error btn-sm min-h-11 portal-focus"
                    onClick={() => void handleCancel()}
                    disabled={busy}
                  >
                    {busy ? "Cancelling…" : "Yes, cancel request"}
                  </button>
                  <button
                    ref={cancelDismissRef}
                    type="button"
                    className="btn btn-ghost btn-sm min-h-11 portal-focus"
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

      <p className="text-sm text-[var(--harbor-muted)]">
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
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
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
      <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--harbor-deep)]" />
      <p className="text-xs text-[var(--harbor-muted)]">
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
