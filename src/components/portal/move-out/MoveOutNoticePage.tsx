"use client";

import Link from "next/link";
import { useId } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  ClipboardList,
  LoaderCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { useMoveOutNotice } from "@/hooks/useMoveOutNotice";
import {
  canStartNewMoveOutNotice,
  formatMoveOutDate,
  formatMoveOutDateTime,
  isMoveOutAcknowledgedOrLater,
  moveOutStatusClass,
} from "@/lib/portal/move-out-validation";
import type {
  MoveOutContext,
  MoveOutFormErrors,
  MoveOutFormValues,
  MoveOutNoticeRecord,
  MoveOutWizardStep,
} from "@/lib/portal/move-out-types";
import {
  MOVE_OUT_REASONS,
  MOVE_OUT_STATUSES,
} from "@/lib/portal/move-out-types";
import {
  PORTAL_MAX_ADDRESS_LENGTH,
  PORTAL_MAX_MEDIUM_TEXT,
} from "@/lib/portal/validation-utils";

export function MoveOutNoticePage() {
  const {
    state,
    step,
    stepIndex,
    stepLabels,
    wizardSteps,
    values,
    errors,
    noticeWarning,
    submitting,
    submitError,
    successMessage,
    reload,
    updateField,
    goNextFromOverview,
    goNextFromDetails,
    goBack,
    submitNotice,
    advanceDemoStatus,
    startOver,
  } = useMoveOutNotice();

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
          Loading move-out information…
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
                Move-out unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                {state.message}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-neutral btn-sm min-h-11 gap-1"
              onClick={reload}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { context, notice } = state;

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-[var(--harbor-ink)]"
        role="status"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
            aria-hidden="true"
          />
          <p>
            <span className="font-medium">Important:</span> Submitting a
            move-out notice does <span className="font-semibold">not</span> mean
            it is accepted. Harborline must acknowledge or approve the notice
            before it is treated as approved.
          </p>
        </div>
      </div>

      {successMessage ? (
        <div className="alert alert-success" role="status">
          <span>{successMessage}</span>
        </div>
      ) : null}

      {submitError ? (
        <div className="alert alert-error" role="alert">
          <span>{submitError}</span>
        </div>
      ) : null}

      {step !== "confirmation" ? (
        <StepIndicator
          steps={wizardSteps}
          stepIndex={stepIndex}
          labels={stepLabels}
        />
      ) : null}

      {step === "overview" ? (
        <OverviewStep
          context={context}
          notice={notice}
          onContinue={goNextFromOverview}
        />
      ) : null}

      {step === "details" && values ? (
        <DetailsStep
          context={context}
          values={values}
          errors={errors}
          noticeWarning={noticeWarning}
          onChange={updateField}
          onBack={goBack}
          onContinue={goNextFromDetails}
        />
      ) : null}

      {step === "review" && values ? (
        <ReviewStep
          context={context}
          values={values}
          noticeWarning={noticeWarning}
          submitting={submitting}
          onBack={goBack}
          onSubmit={() => void submitNotice()}
        />
      ) : null}

      {step === "confirmation" && notice ? (
        <ConfirmationAndTracker
          context={context}
          notice={notice}
          onAdvanceDemo={advanceDemoStatus}
          onStartOver={
            canStartNewMoveOutNotice(notice.status) ? startOver : undefined
          }
        />
      ) : null}

      <p className="text-sm text-[var(--harbor-muted)]">
        <Link href="/portal/lease" className="link link-primary">
          Lease information
        </Link>
        {" · "}
        <Link href="/portal/renewal" className="link link-primary">
          Renewal request
        </Link>
      </p>
    </div>
  );
}

function StepIndicator({
  steps,
  stepIndex,
  labels,
}: {
  steps: MoveOutWizardStep[];
  stepIndex: number;
  labels: Record<MoveOutWizardStep, string>;
}) {
  return (
    <nav aria-label="Move-out notice steps">
      <p className="text-sm font-medium text-[var(--harbor-ink)] sm:hidden">
        Step {stepIndex + 1} of {steps.length} · {labels[steps[stepIndex]!]}
      </p>
      <ol className="hidden flex-wrap gap-2 sm:flex">
        {steps.map((step, index) => {
          const active = index === stepIndex;
          const done = index < stepIndex;
          return (
            <li
              key={step}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                active
                  ? "bg-[var(--harbor-deep)] text-white"
                  : done
                    ? "bg-[var(--harbor-deep)]/15 text-[var(--harbor-ink)]"
                    : "bg-[var(--harbor-sand)]/50 text-[var(--harbor-muted)]"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {index + 1}. {labels[step]}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function OverviewStep({
  context,
  notice,
  onContinue,
}: {
  context: MoveOutContext;
  notice: MoveOutNoticeRecord | null;
  onContinue: () => void;
}) {
  const hasActive = notice && !canStartNewMoveOutNotice(notice.status);

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="moveout-overview-heading"
      >
        <h2
          id="moveout-overview-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Lease &amp; notice requirements
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Meta label="Property" value={context.propertyName} />
          <Meta label="Unit" value={context.unitNumber} />
          <Meta label="Lease number" value={context.leaseNumber} />
          <Meta
            label="Lease end date"
            value={formatMoveOutDate(context.leaseEndDate)}
          />
          <Meta
            label="Required notice period"
            value={`${context.requiredNoticeDays} days`}
          />
          <div className="sm:col-span-2">
            <Meta
              label="Notice requirement"
              value={context.noticeRequirementLabel}
            />
          </div>
        </dl>
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="checklist-preview-heading"
      >
        <h2
          id="checklist-preview-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Move-out checklist (preview)
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-muted)]">
          A full checklist appears with your submission receipt. Completing
          tasks does not replace management acknowledgment.
        </p>
        <ul className="mt-4 space-y-2">
          {context.checklist.slice(0, 4).map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 text-sm text-[var(--harbor-ink)]/80"
            >
              <CheckSquare
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]"
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {hasActive ? (
        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 sm:p-5">
          <p className="text-sm text-[var(--harbor-ink)]/80">
            You already have a move-out notice on file (
            <span
              className={`badge badge-sm ${moveOutStatusClass(notice.status)}`}
            >
              {notice.status}
            </span>
            ).
            {!isMoveOutAcknowledgedOrLater(notice.status) ? (
              <span className="block mt-1 text-[var(--harbor-muted)]">
                It is not accepted until management acknowledges or approves it.
              </span>
            ) : null}
          </p>
          <button
            type="button"
            className="btn btn-neutral btn-sm mt-3 min-h-11 gap-1"
            onClick={onContinue}
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            View receipt &amp; status
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-neutral min-h-11 gap-1"
          onClick={onContinue}
        >
          Start move-out notice
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function DetailsStep({
  context,
  values,
  errors,
  noticeWarning,
  onChange,
  onBack,
  onContinue,
}: {
  context: MoveOutContext;
  values: MoveOutFormValues;
  errors: MoveOutFormErrors;
  noticeWarning: string | null;
  onChange: <K extends keyof MoveOutFormValues>(
    key: K,
    value: MoveOutFormValues[K]
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const moveOutId = useId();
  const reasonId = useId();
  const otherId = useId();
  const addressId = useId();
  const inspectId = useId();
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const notesId = useId();
  const ackId = useId();

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="details-heading"
    >
      <h2
        id="details-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Move-out notice details
      </h2>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Lease end date: {formatMoveOutDate(context.leaseEndDate)} · Required
        notice: {context.requiredNoticeDays} days
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Requested move-out date"
          htmlFor={moveOutId}
          error={errors.requestedMoveOutDate}
        >
          <input
            id={moveOutId}
            type="date"
            className="input input-bordered w-full min-h-11 portal-focus"
            value={values.requestedMoveOutDate}
            min={context.todayIso}
            onChange={(e) => onChange("requestedMoveOutDate", e.target.value)}
            aria-invalid={Boolean(errors.requestedMoveOutDate)}
            aria-describedby={
              errors.requestedMoveOutDate ? `${moveOutId}-error` : undefined
            }
            required
          />
        </Field>
        <Field
          label="Preferred inspection date"
          htmlFor={inspectId}
          error={errors.preferredInspectionDate}
        >
          <input
            id={inspectId}
            type="date"
            className="input input-bordered w-full min-h-11 portal-focus"
            value={values.preferredInspectionDate}
            min={context.todayIso}
            onChange={(e) =>
              onChange("preferredInspectionDate", e.target.value)
            }
            aria-invalid={Boolean(errors.preferredInspectionDate)}
            aria-describedby={
              errors.preferredInspectionDate ? `${inspectId}-error` : undefined
            }
            required
          />
        </Field>
        <Field label="Reason for moving" htmlFor={reasonId} error={errors.reason}>
          <select
            id={reasonId}
            className="select select-bordered w-full min-h-11 portal-focus"
            value={values.reason}
            onChange={(e) =>
              onChange(
                "reason",
                e.target.value as MoveOutFormValues["reason"]
              )
            }
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={errors.reason ? `${reasonId}-error` : undefined}
            required
          >
            <option value="">Select a reason</option>
            {MOVE_OUT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </Field>
        {values.reason === "Other" ? (
          <Field
            label="Describe reason"
            htmlFor={otherId}
            error={errors.reasonOther}
          >
            <input
              id={otherId}
              className="input input-bordered w-full min-h-11 portal-focus"
              value={values.reasonOther}
              onChange={(e) => onChange("reasonOther", e.target.value)}
              maxLength={PORTAL_MAX_MEDIUM_TEXT}
              aria-invalid={Boolean(errors.reasonOther)}
              aria-describedby={
                errors.reasonOther ? `${otherId}-error` : undefined
              }
            />
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <div className="sm:col-span-2">
          <Field
            label="Forwarding address"
            htmlFor={addressId}
            error={errors.forwardingAddress}
          >
            <textarea
              id={addressId}
              className="textarea textarea-bordered min-h-20 w-full portal-focus"
              value={values.forwardingAddress}
              onChange={(e) => onChange("forwardingAddress", e.target.value)}
              maxLength={PORTAL_MAX_ADDRESS_LENGTH}
              aria-invalid={Boolean(errors.forwardingAddress)}
              aria-describedby={
                errors.forwardingAddress ? `${addressId}-error` : undefined
              }
              required
              placeholder="Street, city, state, ZIP"
            />
          </Field>
        </div>
        <Field
          label="Contact name"
          htmlFor={nameId}
          error={errors.contactName}
        >
          <input
            id={nameId}
            className="input input-bordered w-full min-h-11 portal-focus"
            value={values.contactName}
            onChange={(e) => onChange("contactName", e.target.value)}
            aria-invalid={Boolean(errors.contactName)}
            aria-describedby={errors.contactName ? `${nameId}-error` : undefined}
            required
          />
        </Field>
        <Field
          label="Contact phone"
          htmlFor={phoneId}
          error={errors.contactPhone}
        >
          <input
            id={phoneId}
            type="tel"
            className="input input-bordered w-full min-h-11 portal-focus"
            value={values.contactPhone}
            onChange={(e) => onChange("contactPhone", e.target.value)}
            aria-invalid={Boolean(errors.contactPhone)}
            aria-describedby={
              errors.contactPhone ? `${phoneId}-error` : undefined
            }
            required
          />
        </Field>
        <div className="sm:col-span-2">
          <Field
            label="Contact email"
            htmlFor={emailId}
            error={errors.contactEmail}
          >
            <input
              id={emailId}
              type="email"
              className="input input-bordered w-full min-h-11 portal-focus"
              value={values.contactEmail}
              onChange={(e) => onChange("contactEmail", e.target.value)}
              aria-invalid={Boolean(errors.contactEmail)}
              aria-describedby={
                errors.contactEmail ? `${emailId}-error` : undefined
              }
              required
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes (optional)" htmlFor={notesId}>
            <textarea
              id={notesId}
              className="textarea textarea-bordered min-h-20 w-full portal-focus"
              value={values.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              maxLength={PORTAL_MAX_MEDIUM_TEXT}
              placeholder="Access instructions, timing constraints, or other notes"
            />
          </Field>
        </div>
      </div>

      {noticeWarning ? (
        <div
          className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-3 text-sm text-[var(--harbor-ink)]"
          role="status"
        >
          <p className="font-medium">Notice period warning</p>
          <p className="mt-1 text-[var(--harbor-ink)]/80">{noticeWarning}</p>
        </div>
      ) : null}

      <div className="mt-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--harbor-sand)]/35 px-3 py-3">
          <input
            id={ackId}
            type="checkbox"
            className="checkbox mt-0.5"
            checked={values.acknowledgment}
            onChange={(e) => onChange("acknowledgment", e.target.checked)}
            aria-invalid={Boolean(errors.acknowledgment)}
            aria-describedby={
              errors.acknowledgment ? `${ackId}-error` : undefined
            }
          />
          <span className="text-sm text-[var(--harbor-ink)]/85">
            I understand that submitting this notice does not mean it is
            accepted. Harborline must acknowledge or approve the notice before
            it is treated as approved, and final move-out steps still apply.
          </span>
        </label>
        {errors.acknowledgment ? (
          <p id={`${ackId}-error`} className="mt-1 text-xs text-error" role="alert">
            {errors.acknowledgment}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm min-h-11 gap-1"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          className="btn btn-neutral btn-sm min-h-11 gap-1"
          onClick={onContinue}
        >
          Review notice
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function ReviewStep({
  context,
  values,
  noticeWarning,
  submitting,
  onBack,
  onSubmit,
}: {
  context: MoveOutContext;
  values: MoveOutFormValues;
  noticeWarning: string | null;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const reasonLabel =
    values.reason === "Other"
      ? `Other — ${values.reasonOther}`
      : values.reason || "—";

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="review-heading"
    >
      <h2
        id="review-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Review move-out notice
      </h2>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Confirm details before submitting. This notice is not accepted until
        management acknowledges or approves it.
      </p>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Meta
          label="Lease end date"
          value={formatMoveOutDate(context.leaseEndDate)}
        />
        <Meta
          label="Required notice period"
          value={`${context.requiredNoticeDays} days`}
        />
        <Meta
          label="Requested move-out date"
          value={formatMoveOutDate(values.requestedMoveOutDate)}
        />
        <Meta
          label="Preferred inspection date"
          value={formatMoveOutDate(values.preferredInspectionDate)}
        />
        <Meta label="Reason for moving" value={reasonLabel} />
        <Meta
          label="Contact"
          value={`${values.contactName} · ${values.contactPhone} · ${values.contactEmail}`}
        />
        <div className="sm:col-span-2">
          <Meta label="Forwarding address" value={values.forwardingAddress} />
        </div>
        <div className="sm:col-span-2">
          <Meta
            label="Notes"
            value={values.notes.trim() || "No additional notes"}
          />
        </div>
      </dl>

      {noticeWarning ? (
        <div
          className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-3 text-sm"
          role="status"
        >
          <p className="font-medium">Notice period warning remains</p>
          <p className="mt-1 text-[var(--harbor-ink)]/80">{noticeWarning}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-3 text-sm">
        Submitting creates a receipt and starts tracking. It does{" "}
        <span className="font-semibold">not</span> finalize acceptance of your
        move-out notice.
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm min-h-11 gap-1"
          onClick={onBack}
          disabled={submitting}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          className="btn btn-neutral btn-sm min-h-11 gap-1"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit notice
            </>
          )}
        </button>
      </div>
    </section>
  );
}

function ConfirmationAndTracker({
  context,
  notice,
  onAdvanceDemo,
  onStartOver,
}: {
  context: MoveOutContext;
  notice: MoveOutNoticeRecord;
  onAdvanceDemo: () => void;
  onStartOver?: () => void;
}) {
  const acknowledged = isMoveOutAcknowledgedOrLater(notice.status);
  const reasonLabel =
    notice.values.reason === "Other"
      ? `Other — ${notice.values.reasonOther}`
      : notice.values.reason;

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="receipt-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
              Confirmation {notice.confirmationNumber}
            </p>
            <h2
              id="receipt-heading"
              className="mt-1 text-lg font-semibold text-[var(--harbor-ink)]"
            >
              Submission receipt
            </h2>
          </div>
          <span className={`badge ${moveOutStatusClass(notice.status)}`}>
            {notice.status}
          </span>
        </div>

        {!acknowledged ? (
          <div
            className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-3 text-sm"
            role="status"
          >
            This notice has been submitted for review. It is{" "}
            <span className="font-semibold">not accepted</span> until management
            acknowledges or approves it.
          </div>
        ) : (
          <div
            className="mt-4 rounded-xl border border-success/30 bg-success/5 px-3 py-3 text-sm"
            role="status"
          >
            Management has acknowledged this notice. Continue with checklist
            items and the scheduled inspection.
          </div>
        )}

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Meta
            label="Submitted"
            value={formatMoveOutDateTime(notice.submittedAt)}
          />
          <Meta
            label="Last update"
            value={formatMoveOutDateTime(notice.updatedAt)}
          />
          <Meta
            label="Requested move-out"
            value={formatMoveOutDate(notice.values.requestedMoveOutDate)}
          />
          <Meta
            label="Preferred inspection"
            value={formatMoveOutDate(notice.values.preferredInspectionDate)}
          />
          <Meta label="Reason" value={reasonLabel} />
          <Meta
            label="Contact"
            value={`${notice.values.contactName} · ${notice.values.contactPhone}`}
          />
          <div className="sm:col-span-2">
            <Meta
              label="Forwarding address"
              value={notice.values.forwardingAddress}
            />
          </div>
        </dl>

        {notice.noticeWarning ? (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 px-3 py-3 text-sm">
            <p className="font-medium">Notice period flag on file</p>
            <p className="mt-1 text-[var(--harbor-ink)]/75">
              {notice.noticeWarning}
            </p>
          </div>
        ) : null}
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="full-checklist-heading"
      >
        <h3
          id="full-checklist-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Move-out checklist
        </h3>
        <ul className="mt-4 space-y-3">
          {context.checklist.map((item) => (
            <li
              key={item.id}
              className="rounded-xl bg-[var(--harbor-sand)]/30 px-3 py-3"
            >
              <p className="text-sm font-medium text-[var(--harbor-ink)]">
                {item.label}
              </p>
              <p className="mt-0.5 text-sm text-[var(--harbor-muted)]">
                {item.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="status-heading"
      >
        <h3
          id="status-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Status tracker
        </h3>
        <ol className="mt-4 flex flex-wrap gap-2">
          {MOVE_OUT_STATUSES.filter((s) => s !== "Not Started").map((status) => {
            const reached =
              notice.timeline.some((t) => t.status === status) ||
              notice.status === status;
            const current = notice.status === status;
            return (
              <li
                key={status}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  current
                    ? "bg-[var(--harbor-deep)] text-white"
                    : reached
                      ? "bg-[var(--harbor-deep)]/15 text-[var(--harbor-ink)]"
                      : "bg-[var(--harbor-sand)]/40 text-[var(--harbor-muted)]"
                }`}
              >
                {status}
              </li>
            );
          })}
        </ol>

        <ol className="mt-5 space-y-4">
          {[...notice.timeline].reverse().map((entry) => (
            <li
              key={entry.id}
              className="relative border-l-2 border-[var(--harbor-deep)]/15 pl-4"
            >
              <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--harbor-deep)]" />
              <p className="text-xs text-[var(--harbor-muted)]">
                {formatMoveOutDateTime(entry.at)}
              </p>
              <p className="mt-0.5 text-sm font-medium text-[var(--harbor-ink)]">
                {entry.status}
              </p>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/75">
                {entry.note}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-2">
        {notice.status === "Submitted" ||
        notice.status === "Under Review" ||
        notice.status === "Acknowledged" ||
        notice.status === "Inspection Scheduled" ? (
          <button
            type="button"
            className="btn btn-outline btn-sm min-h-11"
            onClick={onAdvanceDemo}
          >
            Advance demo status
          </button>
        ) : null}
        {onStartOver ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-11"
            onClick={onStartOver}
          >
            Start a new notice
          </button>
        ) : null}
        <Link href="/portal/messages" className="btn btn-ghost btn-sm min-h-11">
          Contact management
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  return (
    <div className="form-control">
      <label className="label" htmlFor={htmlFor}>
        <span className="label-text font-medium">{label}</span>
      </label>
      {children}
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
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
