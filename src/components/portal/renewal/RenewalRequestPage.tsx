"use client";

import Link from "next/link";
import { useId } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  LoaderCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { useLeaseRenewal } from "@/hooks/useLeaseRenewal";
import {
  canStartNewRenewalRequest,
  formatRenewalDate,
  formatRenewalDateTime,
  renewalStatusClass,
} from "@/lib/portal/renewal-format";
import type {
  RenewalContext,
  RenewalDraft,
  RenewalRequestRecord,
  RenewalTermOption,
  RenewalWizardStep,
} from "@/lib/portal/renewal-types";
import { RENEWAL_STATUSES } from "@/lib/portal/renewal-types";

export function RenewalRequestPage() {
  const {
    state,
    step,
    stepIndex,
    stepLabels,
    wizardSteps,
    draft,
    selectedTerm,
    termError,
    submitError,
    submitting,
    successMessage,
    reload,
    goNextFromOverview,
    selectTerm,
    goNextFromTerm,
    setMessage,
    goNextFromMessage,
    goBack,
    submitRequest,
    startOver,
  } = useLeaseRenewal();

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
          Loading renewal options…
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
                Renewal unavailable
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

  const { context, request } = state;
  const showingTracker =
    step === "confirmation" &&
    request &&
    !canStartNewRenewalRequest(request.status);

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
            <span className="font-medium">Important:</span> Submitting a renewal
            request does <span className="font-semibold">not</span> automatically
            finalize your renewal. A formal offer and signed documents are still
            required.
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

      {!showingTracker ? (
        <StepIndicator
          steps={wizardSteps}
          stepIndex={stepIndex}
          labels={stepLabels}
        />
      ) : null}

      {step === "overview" ? (
        <OverviewStep
          context={context}
          request={request}
          onContinue={goNextFromOverview}
        />
      ) : null}

      {step === "select-term" ? (
        <SelectTermStep
          terms={context.availableTerms}
          draft={draft}
          error={termError}
          onSelect={selectTerm}
          onBack={goBack}
          onContinue={goNextFromTerm}
        />
      ) : null}

      {step === "add-message" ? (
        <MessageStep
          message={draft.message}
          onChange={setMessage}
          onBack={goBack}
          onContinue={goNextFromMessage}
        />
      ) : null}

      {step === "review" ? (
        <ReviewStep
          context={context}
          term={selectedTerm}
          message={draft.message}
          submitting={submitting}
          onBack={goBack}
          onSubmit={() => void submitRequest()}
        />
      ) : null}

      {step === "confirmation" && request ? (
        <StatusTracker
          context={context}
          request={request}
          onStartOver={
            canStartNewRenewalRequest(request.status) ? startOver : undefined
          }
        />
      ) : null}

      <p className="text-sm text-[var(--harbor-muted)]">
        Need lease details?{" "}
        <Link href="/portal/lease" className="link link-primary">
          Lease information
        </Link>
        {" · "}
        <Link href="/portal/move-out" className="link link-primary">
          Move-out notice
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
  steps: RenewalWizardStep[];
  stepIndex: number;
  labels: Record<RenewalWizardStep, string>;
}) {
  return (
    <nav aria-label="Renewal request steps">
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
  request,
  onContinue,
}: {
  context: RenewalContext;
  request: RenewalRequestRecord | null;
  onContinue: () => void;
}) {
  const hasActiveRequest =
    request && !canStartNewRenewalRequest(request.status);

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="renewal-overview-heading"
      >
        <h2
          id="renewal-overview-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Current lease &amp; eligibility
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Meta label="Property" value={context.propertyName} />
          <Meta label="Unit" value={context.unitNumber} />
          <Meta label="Lease number" value={context.leaseNumber} />
          <Meta
            label="Current monthly rent"
            value={context.currentMonthlyRent}
          />
          <Meta
            label="Lease end date"
            value={formatRenewalDate(context.leaseEndDate)}
          />
          <Meta
            label="Renewal deadline"
            value={formatRenewalDate(context.renewalDeadline)}
          />
        </dl>

        <div
          className={`mt-4 rounded-xl px-3 py-3 text-sm ${
            context.eligibility.eligible
              ? "border border-success/25 bg-success/5"
              : "border border-error/25 bg-error/5"
          }`}
          role="status"
        >
          <p className="font-medium text-[var(--harbor-ink)]">
            Renewal eligibility:{" "}
            {context.eligibility.eligible ? "Eligible" : "Not eligible"}
          </p>
          <p className="mt-1 text-[var(--harbor-muted)]">
            {context.eligibility.reason}
          </p>
        </div>
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="terms-heading"
      >
        <h2
          id="terms-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Available terms
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-muted)]">
          Estimated new rent is shown when available. Final rent is confirmed
          only in a formal offer.
        </p>
        <ul className="mt-4 space-y-3">
          {context.availableTerms.map((term) => (
            <li
              key={term.id}
              className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/25 px-3 py-3"
            >
              <p className="font-medium text-[var(--harbor-ink)]">{term.label}</p>
              <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                {formatRenewalDate(term.proposedStartDate)} –{" "}
                {formatRenewalDate(term.proposedEndDate)}
                {" · "}
                Estimated rent:{" "}
                {term.estimatedMonthlyRent ?? "Available with offer"}
              </p>
              <p className="mt-1 text-xs text-[var(--harbor-muted)]">
                {term.notes}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="conditions-heading"
      >
        <h2
          id="conditions-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Important conditions
        </h2>
        <ul className="mt-4 space-y-3">
          {context.conditions.map((condition) => (
            <li key={condition.id}>
              <p className="text-sm font-medium text-[var(--harbor-ink)]">
                {condition.title}
              </p>
              <p className="mt-0.5 text-sm text-[var(--harbor-muted)]">
                {condition.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {hasActiveRequest ? (
        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 sm:p-5">
          <p className="text-sm text-[var(--harbor-muted)]">
            You already have a renewal request in progress (
            <span className={`badge badge-sm ${renewalStatusClass(request.status)}`}>
              {request.status}
            </span>
            ).
          </p>
          <button
            type="button"
            className="btn btn-neutral btn-sm mt-3 min-h-11 gap-1"
            onClick={onContinue}
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Track request status
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-neutral min-h-11 gap-1"
          onClick={onContinue}
          disabled={!context.eligibility.eligible}
        >
          Start renewal request
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function SelectTermStep({
  terms,
  draft,
  error,
  onSelect,
  onBack,
  onContinue,
}: {
  terms: RenewalTermOption[];
  draft: RenewalDraft;
  error: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const termErrorId = useId();

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="select-term-heading"
    >
      <h2
        id="select-term-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Select preferred term
      </h2>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Choose the term you would like CPMC to consider. This is a
        preference only until an offer is issued and signed.
      </p>

      {error ? (
        <div
          id={termErrorId}
          className="alert alert-error mt-4 py-2"
          role="alert"
        >
          <span className="text-sm">{error}</span>
        </div>
      ) : null}

      <fieldset
        className="mt-4 space-y-3"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? termErrorId : undefined}
      >
        <legend className="sr-only">Preferred renewal term</legend>
        {terms.map((term) => {
          const selected = draft.preferredTermId === term.id;
          return (
            <label
              key={term.id}
              className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 ${
                selected
                  ? "border-[var(--harbor-deep)] bg-[var(--harbor-deep)]/5"
                  : "border-[var(--harbor-deep)]/15 bg-white"
              }`}
            >
              <input
                type="radio"
                name="renewal-term"
                className="radio radio-sm mt-1"
                checked={selected}
                onChange={() => onSelect(term.id)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? termErrorId : undefined}
              />
              <span>
                <span className="block font-medium text-[var(--harbor-ink)]">
                  {term.label}
                </span>
                <span className="mt-1 block text-sm text-[var(--harbor-muted)]">
                  {formatRenewalDate(term.proposedStartDate)} –{" "}
                  {formatRenewalDate(term.proposedEndDate)}
                </span>
                <span className="mt-1 block text-sm text-[var(--harbor-muted)]">
                  Estimated new rent:{" "}
                  {term.estimatedMonthlyRent ?? "Available with offer"}
                </span>
                <span className="mt-1 block text-xs text-[var(--harbor-muted)]">
                  {term.notes}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

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
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function MessageStep({
  message,
  onChange,
  onBack,
  onContinue,
}: {
  message: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const messageId = useId();

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="message-heading"
    >
      <h2
        id="message-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Add a message
      </h2>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Optional notes for management (timing, questions, or special requests).
      </p>
      <label className="label mt-4" htmlFor={messageId}>
        <span className="label-text font-medium">Message to CPMC</span>
      </label>
      <textarea
        id={messageId}
        className="textarea textarea-bordered min-h-32 w-full portal-focus"
        value={message}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1000}
        aria-describedby={`${messageId}-count`}
        placeholder="Example: We prefer a 12-month term and would like to keep the same parking spaces."
      />
      <div className="label">
        <span
          id={`${messageId}-count`}
          className="label-text-alt text-[var(--harbor-muted)]"
        >
          {message.trim().length}/1000
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
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
          Review request
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function ReviewStep({
  context,
  term,
  message,
  submitting,
  onBack,
  onSubmit,
}: {
  context: RenewalContext;
  term: RenewalTermOption | null;
  message: string;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="review-heading"
    >
      <h2
        id="review-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Review your request
      </h2>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Confirm details before submitting. This request alone does not finalize
        the renewal.
      </p>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Meta label="Property / unit" value={`${context.propertyName} · ${context.unitNumber}`} />
        <Meta
          label="Lease end date"
          value={formatRenewalDate(context.leaseEndDate)}
        />
        <Meta
          label="Renewal deadline"
          value={formatRenewalDate(context.renewalDeadline)}
        />
        <Meta
          label="Preferred term"
          value={term?.label ?? "Not selected"}
        />
        <Meta
          label="Proposed dates"
          value={
            term
              ? `${formatRenewalDate(term.proposedStartDate)} – ${formatRenewalDate(term.proposedEndDate)}`
              : "—"
          }
        />
        <Meta
          label="Estimated new rent"
          value={term?.estimatedMonthlyRent ?? "Available with offer"}
        />
        <div className="sm:col-span-2">
          <Meta
            label="Message"
            value={message.trim() || "No message provided"}
          />
        </div>
      </dl>

      <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-3 text-sm">
        By submitting, you ask CPMC to review a renewal. You are not
        signing a new lease yet.
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
          disabled={submitting || !term}
        >
          {submitting ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit request
            </>
          )}
        </button>
      </div>
    </section>
  );
}

function StatusTracker({
  context,
  request,
  onStartOver,
}: {
  context: RenewalContext;
  request: RenewalRequestRecord;
  onStartOver?: () => void;
}) {
  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="status-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
              Request {request.id}
            </p>
            <h2
              id="status-heading"
              className="mt-1 text-lg font-semibold text-[var(--harbor-ink)]"
            >
              Renewal request status
            </h2>
          </div>
          <span className={`badge ${renewalStatusClass(request.status)}`}>
            {request.status}
          </span>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Meta
            label="Submitted"
            value={formatRenewalDateTime(request.submittedAt)}
          />
          <Meta
            label="Last update"
            value={formatRenewalDateTime(request.updatedAt)}
          />
          <Meta label="Preferred term" value={request.preferredTermLabel} />
          <Meta
            label="Estimated rent"
            value={request.estimatedMonthlyRent ?? "Pending offer"}
          />
          <Meta
            label="Lease end / deadline"
            value={`${formatRenewalDate(context.leaseEndDate)} · deadline ${formatRenewalDate(context.renewalDeadline)}`}
          />
          <div className="sm:col-span-2">
            <Meta
              label="Your message"
              value={request.message || "No message provided"}
            />
          </div>
        </dl>

        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-3 text-sm">
          Status updates track your request only. Even when an offer is
          available or marked accepted, a signed renewal is still required to
          finalize.
        </div>
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="status-pipeline-heading"
      >
        <h3
          id="status-pipeline-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Status pipeline
        </h3>
        <ol className="mt-4 flex flex-wrap gap-2">
          {RENEWAL_STATUSES.filter((s) => s !== "Not Started").map((status) => {
            const reached =
              request.timeline.some((t) => t.status === status) ||
              request.status === status;
            const current = request.status === status;
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
      </section>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="timeline-heading"
      >
        <h3
          id="timeline-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Timeline
        </h3>
        <ol className="mt-4 space-y-4">
          {[...request.timeline].reverse().map((entry) => (
            <li
              key={entry.id}
              className="relative border-l-2 border-[var(--harbor-deep)]/15 pl-4"
            >
              <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--harbor-deep)]" />
              <p className="text-xs text-[var(--harbor-muted)]">
                {formatRenewalDateTime(entry.at)}
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
        {onStartOver ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-11"
            onClick={onStartOver}
          >
            Start a new request
          </button>
        ) : null}
        <Link href="/portal/messages" className="btn btn-ghost btn-sm min-h-11">
          Contact management
        </Link>
      </div>
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
