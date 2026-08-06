"use client";

import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, Phone, X } from "lucide-react";
import { useMaintenanceForm } from "@/hooks/useMaintenanceForm";
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  DESCRIPTION_MAX,
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  NOTES_MAX,
  TITLE_MAX,
} from "@/lib/portal/maintenance-form-validation";
import { MAINTENANCE_PROPERTY_OPTIONS } from "@/lib/portal/maintenance-mock";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
} from "@/lib/portal/maintenance-types";
import {
  PORTAL_MAX_SHORT_TEXT,
  todayIsoLocal,
} from "@/lib/portal/validation-utils";

export function MaintenanceRequestForm() {
  const {
    values,
    errors,
    submitting,
    submitError,
    result,
    updateField,
    addAttachments,
    removeAttachment,
    submit,
    reset,
  } = useMaintenanceForm();

  if (result) {
    return (
      <MaintenanceFormConfirmation
        result={result}
        onAnother={() => reset()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <EmergencyGuidanceBanner />

      <form
        className="space-y-5 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
            Submit a maintenance request
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            Complete the fields below. Required fields are marked. Attachments
            are optional (JPG, PNG, WEBP, or PDF · max {MAX_ATTACHMENTS} files ·{" "}
            {formatFileSize(MAX_ATTACHMENT_BYTES)} each).
          </p>
        </header>

        <fieldset className="space-y-4 rounded-xl border border-[var(--harbor-deep)]/10 p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--harbor-ink)]">
            Issue details
          </legend>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Property or unit"
            required
            error={errors.propertyOrUnit}
            htmlFor="maint-property"
          >
            <select
              id="maint-property"
              className="select select-bordered w-full"
              value={values.propertyOrUnit}
              onChange={(e) => updateField("propertyOrUnit", e.target.value)}
              aria-invalid={Boolean(errors.propertyOrUnit)}
              aria-describedby={errors.propertyOrUnit ? "maint-property-error" : undefined}
              required
            >
              <option value="">Select unit or property</option>
              {MAINTENANCE_PROPERTY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Category"
            required
            error={errors.category}
            htmlFor="maint-category"
          >
            <select
              id="maint-category"
              className="select select-bordered w-full"
              value={values.category}
              onChange={(e) =>
                updateField(
                  "category",
                  e.target.value as typeof values.category
                )
              }
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? "maint-category-error" : undefined}
              required
            >
              <option value="">Select category</option>
              {MAINTENANCE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Short title"
          required
          error={errors.title}
          htmlFor="maint-title"
        >
          <input
            id="maint-title"
            className="input input-bordered w-full"
            value={values.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="e.g. Sink leaking under vanity"
            maxLength={TITLE_MAX}
            aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "maint-title-error" : undefined}
            required
          />
        </Field>

        <Field
          label="Detailed description"
          required
          error={errors.description}
          htmlFor="maint-description"
        >
          <textarea
            id="maint-description"
            className="textarea textarea-bordered min-h-28 w-full"
            value={values.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="What is happening, when it started, and anything you have already tried."
            maxLength={DESCRIPTION_MAX}
            aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "maint-description-error" : undefined}
            required
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Location inside the unit"
            required
            error={errors.locationInUnit}
            htmlFor="maint-location"
          >
            <input
              id="maint-location"
              className="input input-bordered w-full"
              value={values.locationInUnit}
              onChange={(e) => updateField("locationInUnit", e.target.value)}
              placeholder="e.g. Kitchen sink cabinet"
              aria-invalid={Boolean(errors.locationInUnit)}
              aria-describedby={errors.locationInUnit ? "maint-location-error" : undefined}
              required
            />
          </Field>

          <Field
            label="Priority"
            required
            error={errors.priority}
            htmlFor="maint-priority"
          >
            <select
              id="maint-priority"
              className="select select-bordered w-full"
              value={values.priority}
              onChange={(e) =>
                updateField(
                  "priority",
                  e.target.value as typeof values.priority
                )
              }
              aria-invalid={Boolean(errors.priority)}
              aria-describedby={errors.priority ? "maint-priority-error" : undefined}
              required
            >
              <option value="">Select priority</option>
              {MAINTENANCE_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="When did you first notice this?"
            error={errors.noticedOn}
            htmlFor="maint-noticed"
            hint="Optional — helps with triage"
          >
            <input
              id="maint-noticed"
              type="date"
              className="input input-bordered w-full"
              value={values.noticedOn}
              onChange={(e) => updateField("noticedOn", e.target.value)}
              max={todayIsoLocal()}
              aria-invalid={Boolean(errors.noticedOn)}
              aria-describedby={errors.noticedOn ? "maint-noticed-error" : undefined}
            />
          </Field>

          <Field
            label="Has this happened before?"
            required
            error={errors.recurringIssue}
            htmlFor="maint-recurring"
          >
            <select
              id="maint-recurring"
              className="select select-bordered w-full"
              value={values.recurringIssue}
              onChange={(e) =>
                updateField(
                  "recurringIssue",
                  e.target.value as typeof values.recurringIssue
                )
              }
              aria-invalid={Boolean(errors.recurringIssue)}
              aria-describedby={errors.recurringIssue ? "maint-recurring-error" : undefined}
              required
            >
              <option value="">Select option</option>
              <option value="yes">Yes — recurring issue</option>
              <option value="no">No — first time</option>
            </select>
          </Field>
        </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-[var(--harbor-deep)]/10 p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--harbor-ink)]">
            Access, pets, and safety
          </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Permission to enter"
            required
            error={errors.permissionToEnter}
            htmlFor="maint-permission"
          >
            <select
              id="maint-permission"
              className="select select-bordered w-full"
              value={values.permissionToEnter}
              onChange={(e) =>
                updateField(
                  "permissionToEnter",
                  e.target.value as typeof values.permissionToEnter
                )
              }
              aria-invalid={Boolean(errors.permissionToEnter)}
              aria-describedby={errors.permissionToEnter ? "maint-permission-error" : undefined}
              required
            >
              <option value="">Select option</option>
              <option value="yes">Yes — ok to enter if I am away</option>
              <option value="call-first">Call first</option>
              <option value="no">No — I must be present</option>
            </select>
          </Field>

          <Field
            label="Pets in the unit"
            required
            error={errors.petsInUnit}
            htmlFor="maint-pets"
          >
            <select
              id="maint-pets"
              className="select select-bordered w-full"
              value={values.petsInUnit}
              onChange={(e) =>
                updateField(
                  "petsInUnit",
                  e.target.value as typeof values.petsInUnit
                )
              }
              aria-invalid={Boolean(errors.petsInUnit)}
              aria-describedby={errors.petsInUnit ? "maint-pets-error" : undefined}
              required
            >
              <option value="">Select option</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
        </div>

        <Field
          label="Access notes for technicians"
          error={errors.accessNotes}
          htmlFor="maint-access"
          hint="Optional — building entry tips only. Do not put alarm codes or passwords in this form."
        >
          <textarea
            id="maint-access"
            className="textarea textarea-bordered min-h-20 w-full"
            value={values.accessNotes}
            onChange={(e) => updateField("accessNotes", e.target.value)}
            placeholder="e.g. Use the south lobby entrance after 6 PM"
            maxLength={NOTES_MAX}
            aria-invalid={Boolean(errors.accessNotes)}
          />
        </Field>

        <Field
          label="Safety concerns"
          error={errors.safetyConcerns}
          htmlFor="maint-safety"
          hint="Optional — note hazards technicians should know about (not for active emergencies)."
        >
          <textarea
            id="maint-safety"
            className="textarea textarea-bordered min-h-20 w-full"
            value={values.safetyConcerns}
            onChange={(e) => updateField("safetyConcerns", e.target.value)}
            placeholder="e.g. Uneven flooring near the leak"
            maxLength={NOTES_MAX}
            aria-invalid={Boolean(errors.safetyConcerns)}
          />
        </Field>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--harbor-ink)]">
            Preferred contact method and contact time
          </legend>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Your name"
              required
              error={errors.contactName}
              htmlFor="maint-contact-name"
            >
              <input
                id="maint-contact-name"
                className="input input-bordered w-full"
                value={values.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
                placeholder="Alex Tenant"
                autoComplete="name"
                aria-invalid={Boolean(errors.contactName)}
              aria-describedby={errors.contactName ? "maint-contact-name-error" : undefined}
                required
              />
            </Field>

            <Field
              label="Preferred contact method"
              required
              error={errors.preferredContactMethod}
              htmlFor="maint-contact-method"
            >
              <select
                id="maint-contact-method"
                className="select select-bordered w-full"
                value={values.preferredContactMethod}
                onChange={(e) =>
                  updateField(
                    "preferredContactMethod",
                    e.target.value as typeof values.preferredContactMethod
                  )
                }
                aria-invalid={Boolean(errors.preferredContactMethod)}
              aria-describedby={errors.preferredContactMethod ? "maint-contact-method-error" : undefined}
                required
              >
                <option value="">Select method</option>
                <option value="email">Email</option>
                <option value="phone">Phone call</option>
                <option value="text">Text message</option>
                <option value="portal-message">Portal message</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Phone number"
              required={
                values.preferredContactMethod === "phone" ||
                values.preferredContactMethod === "text"
              }
              error={errors.contactPhone}
              htmlFor="maint-phone"
              hint={
                values.preferredContactMethod === "phone" ||
                values.preferredContactMethod === "text"
                  ? "Required for phone or text contact"
                  : "Optional"
              }
            >
              <input
                id="maint-phone"
                type="tel"
                className="input input-bordered w-full"
                value={values.contactPhone}
                onChange={(e) => updateField("contactPhone", e.target.value)}
                placeholder="(662) 555-0100"
                autoComplete="tel"
                aria-invalid={Boolean(errors.contactPhone)}
              aria-describedby={errors.contactPhone ? "maint-phone-error" : undefined}
              />
            </Field>

            <Field
              label="Email address"
              required={values.preferredContactMethod === "email"}
              error={errors.contactEmail}
              htmlFor="maint-email"
              hint={
                values.preferredContactMethod === "email"
                  ? "Required for email contact"
                  : "Optional"
              }
            >
              <input
                id="maint-email"
                type="email"
                className="input input-bordered w-full"
                value={values.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                aria-invalid={Boolean(errors.contactEmail)}
              aria-describedby={errors.contactEmail ? "maint-email-error" : undefined}
              />
            </Field>
          </div>

          <Field
            label="Best contact time"
            required
            error={errors.bestContactTime}
            htmlFor="maint-contact-time"
          >
            <input
              id="maint-contact-time"
              className="input input-bordered w-full"
              value={values.bestContactTime}
              onChange={(e) => updateField("bestContactTime", e.target.value)}
              placeholder="e.g. Weekdays after 3 PM"
              maxLength={PORTAL_MAX_SHORT_TEXT}
              aria-invalid={Boolean(errors.bestContactTime)}
              required
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-[var(--harbor-deep)]/10 p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--harbor-ink)]">
            Preferred service timing
          </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Preferred service date"
            error={errors.preferredServiceDate}
            htmlFor="maint-service-date"
            hint="Optional — helps scheduling"
          >
            <input
              id="maint-service-date"
              type="date"
              className="input input-bordered w-full"
              value={values.preferredServiceDate}
              onChange={(e) =>
                updateField("preferredServiceDate", e.target.value)
              }
              min={todayIsoLocal()}
              aria-invalid={Boolean(errors.preferredServiceDate)}
              aria-describedby={errors.preferredServiceDate ? "maint-service-date-error" : undefined}
            />
          </Field>

          <Field
            label="Preferred service window"
            error={errors.preferredServiceWindow}
            htmlFor="maint-service-window"
            hint="Optional"
          >
            <select
              id="maint-service-window"
              className="select select-bordered w-full"
              value={values.preferredServiceWindow}
              onChange={(e) =>
                updateField(
                  "preferredServiceWindow",
                  e.target.value as typeof values.preferredServiceWindow
                )
              }
            >
              <option value="">No preference</option>
              <option value="morning">Morning (8 AM – 12 PM)</option>
              <option value="afternoon">Afternoon (12 PM – 5 PM)</option>
              <option value="evening">Evening (5 PM – 8 PM)</option>
              <option value="anytime">Anytime</option>
            </select>
          </Field>
        </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--harbor-ink)]">
            Photo or document attachments
          </legend>
          <p className="text-xs text-[var(--harbor-muted)]">
            Allowed: {ALLOWED_ATTACHMENT_EXTENSIONS.join(", ")}. Max{" "}
            {MAX_ATTACHMENTS} files, {formatFileSize(MAX_ATTACHMENT_BYTES)}{" "}
            each. Invalid types or oversized files are rejected.
          </p>
          <input
            type="file"
            className="file-input file-input-bordered w-full max-w-md"
            accept={ALLOWED_ATTACHMENT_EXTENSIONS.join(",")}
            multiple
            onChange={(e) => {
              addAttachments(e.target.files);
              e.target.value = "";
            }}
            aria-invalid={Boolean(errors.attachments)}
            aria-describedby={
              errors.attachments ? "maint-attachments-error" : undefined
            }
          />
          {errors.attachments ? (
            <p
              id="maint-attachments-error"
              className="text-sm text-error"
              role="alert"
            >
              {errors.attachments}
            </p>
          ) : null}
          {values.attachments.length > 0 ? (
            <ul className="space-y-2">
              {values.attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[var(--harbor-sand)]/50 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-[var(--harbor-ink)]">
                    {file.name}{" "}
                    <span className="text-[var(--harbor-muted)]">
                      ({formatFileSize(file.size)})
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-square min-h-11 min-w-11 portal-focus"
                    onClick={() => removeAttachment(file.id)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </fieldset>

        {submitError ? (
          <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--harbor-deep)]/10 pt-4">
          <Link
            href="/portal/maintenance"
            className="btn btn-ghost btn-sm min-h-11"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-neutral min-h-11 gap-2"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Submitting…
              </>
            ) : (
              "Submit request"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function EmergencyGuidanceBanner() {
  return (
    <aside
      className="rounded-2xl border-2 border-error/40 bg-error/10 p-4 sm:p-5"
      aria-labelledby="emergency-guidance-heading"
      role="note"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-6 w-6 shrink-0 text-error"
          aria-hidden="true"
        />
        <div className="space-y-2">
          <h2
            id="emergency-guidance-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Emergency? Do not use this form for dispatch
          </h2>
          <p className="text-sm text-[var(--harbor-ink)]/80">
            If there is a <strong>fire</strong>, <strong>gas smell</strong>,{" "}
            <strong>flooding</strong>, <strong>electrical danger</strong>, or
            any <strong>immediate safety threat</strong>, leave the area if
            needed and call emergency services first (
            <a className="link font-semibold" href="tel:911">
              911
            </a>
            ). Then contact Harborline’s after-hours line.
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--harbor-ink)]">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Emergency / after-hours:{" "}
            <a className="link" href="tel:+16625550199">
              (662) 555-0199
            </a>
          </p>
          <p className="text-sm text-[var(--harbor-muted)]">
            This online form is for non-emergency maintenance only. Submitting
            here does <strong>not</strong> send an emergency technician.
          </p>
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className="form-control w-full">
      <label
        className="mb-1 block text-sm text-[var(--harbor-muted)]"
        htmlFor={htmlFor}
      >
        {label}
        {required ? (
          <>
            <span className="text-error" aria-hidden="true">
              {" "}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>
      {control}
      {hint ? (
        <span id={hintId} className="mt-1 text-xs text-[var(--harbor-muted)]">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="mt-1 text-sm text-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function MaintenanceFormConfirmation({
  result,
  onAnother,
}: {
  result: NonNullable<ReturnType<typeof useMaintenanceForm>["result"]>;
  onAnother: () => void;
}) {
  const { values } = result;
  return (
    <div
      className="space-y-5 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 h-7 w-7 text-success"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
            Request submitted
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-muted)]">
            Harborline received your maintenance request. Save your request
            number and track status on the request detail page.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-success/25 bg-success/10 px-4 py-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-muted)]">
          Your request number
        </p>
        <p className="mt-2 font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
          {result.requestNumber}
        </p>
        <p className="mt-2 text-sm text-[var(--harbor-muted)]">
          Submitted {result.submittedAt}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ConfirmTile label="Property / unit" value={values.propertyOrUnit} />
        <ConfirmTile label="Category" value={values.category || "—"} />
        <ConfirmTile label="Title" value={values.title} />
        <ConfirmTile label="Priority" value={values.priority || "—"} />
        <ConfirmTile label="Location in unit" value={values.locationInUnit} />
        <ConfirmTile
          label="First noticed"
          value={values.noticedOn || "Not specified"}
        />
        <ConfirmTile
          label="Recurring issue"
          value={
            values.recurringIssue === "yes"
              ? "Yes"
              : values.recurringIssue === "no"
                ? "No"
                : "—"
          }
        />
        <ConfirmTile
          label="Permission to enter"
          value={labelPermission(values.permissionToEnter)}
        />
        <ConfirmTile label="Contact name" value={values.contactName} />
        <ConfirmTile
          label="Contact method"
          value={labelContact(values.preferredContactMethod)}
        />
        <ConfirmTile
          label="Phone"
          value={values.contactPhone.trim() || "Not provided"}
        />
        <ConfirmTile
          label="Email"
          value={values.contactEmail.trim() || "Not provided"}
        />
        <ConfirmTile label="Best contact time" value={values.bestContactTime} />
        <ConfirmTile
          label="Pets in unit"
          value={
            values.petsInUnit === "yes"
              ? "Yes"
              : values.petsInUnit === "no"
                ? "No"
                : "—"
          }
        />
        <ConfirmTile
          label="Preferred service date"
          value={values.preferredServiceDate || "Not specified"}
        />
        <ConfirmTile
          label="Preferred service window"
          value={labelServiceWindow(values.preferredServiceWindow)}
        />
        <div className="sm:col-span-2">
          <ConfirmTile label="Description" value={values.description} />
        </div>
        {values.safetyConcerns.trim() ? (
          <div className="sm:col-span-2">
            <ConfirmTile
              label="Safety concerns"
              value={values.safetyConcerns}
            />
          </div>
        ) : null}
        {values.accessNotes.trim() ? (
          <div className="sm:col-span-2">
            <ConfirmTile label="Access notes" value={values.accessNotes} />
          </div>
        ) : null}
        <ConfirmTile
          label="Attachments"
          value={
            values.attachments.length === 0
              ? "None"
              : values.attachments
                  .map((f) => `${f.name} (${formatFileSize(f.size)})`)
                  .join(", ")
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/portal/maintenance/${result.id}`}
          className="btn btn-neutral btn-sm min-h-11"
        >
          View request details
        </Link>
        <Link
          href="/portal/maintenance"
          className="btn btn-ghost btn-sm min-h-11"
        >
          Back to maintenance dashboard
        </Link>
        <button
          type="button"
          className="btn btn-outline btn-sm min-h-11"
          onClick={onAnother}
        >
          Submit another request
        </button>
      </div>
    </div>
  );
}

function ConfirmTile({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--harbor-sand)]/40 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--harbor-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 text-[var(--harbor-ink)] ${
          emphasize
            ? "font-display text-xl tracking-tight"
            : "text-sm font-medium whitespace-pre-wrap"
        }`}
      >
        {value}
      </p>
    </div>
  );
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
