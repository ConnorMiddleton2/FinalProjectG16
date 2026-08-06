"use client";

import Link from "next/link";
import { useId } from "react";
import {
  AlertCircle,
  IdCard,
  LoaderCircle,
  Lock,
  Pencil,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { useTenantProfile } from "@/hooks/useTenantProfile";
import { leaseStatusClass } from "@/lib/portal/lease-format";
import type {
  CommunicationPreferences,
  EmergencyContact,
  PetInformation,
  TenantProfile,
  TenantProfileEditable,
  TenantProfileErrors,
  VehicleInformation,
} from "@/lib/portal/profile-types";
import {
  PREFERRED_CONTACT_METHODS,
} from "@/lib/portal/profile-types";
import { labelContactMethod } from "@/lib/portal/profile-validation";
import {
  PORTAL_MAX_MEDIUM_TEXT,
  PORTAL_MAX_NAME_LENGTH,
  PORTAL_MAX_SHORT_TEXT,
} from "@/lib/portal/validation-utils";

export function ProfilePage() {
  const {
    state,
    editing,
    draft,
    errors,
    saving,
    saveError,
    successMessage,
    reload,
    loadDemoData,
    startEdit,
    cancelEdit,
    updateDraft,
    save,
  } = useTenantProfile();

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
        <p className="text-sm text-[var(--harbor-muted)]">Loading profile…</p>
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
                Profile unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                {state.message}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm min-h-11 gap-1"
                onClick={reload}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm min-h-11"
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
          <IdCard
            className="mt-0.5 h-5 w-5 text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              No profile on file
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--harbor-muted)]">
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/portal/messages"
            className="btn btn-neutral btn-sm min-h-11"
          >
            Contact management
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm min-h-11"
            onClick={loadDemoData}
          >
            Preview with demo data
          </button>
        </div>
      </div>
    );
  }

  const { profile } = state;
  const values = editing && draft ? draft : editableFromView(profile);

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
        role="status"
      >
        Profile loaded
        {state.source === "mock" ? " (demo data)" : ""}.
      </div>

      {successMessage ? (
        <div className="alert alert-success" role="status">
          <span>{successMessage}</span>
        </div>
      ) : null}

      {saveError ? (
        <div className="alert alert-error" role="alert">
          <span>{saveError}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
            {profile.preferredName || profile.legalName}
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-muted)]">
            {profile.propertyName} · {profile.unitNumber}
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            className="btn btn-neutral btn-sm min-h-11 gap-1"
            onClick={startEdit}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit profile
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-neutral btn-sm min-h-11 gap-1"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm min-h-11 gap-1"
              onClick={cancelEdit}
              disabled={saving}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <IdentitySection profile={profile} />

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (editing) void save();
        }}
        noValidate
      >
        <ContactSection
          editing={editing}
          values={values}
          errors={errors}
          disabled={saving}
          onChange={updateDraft}
        />
        <EmergencySection
          editing={editing}
          values={values.emergencyContact}
          errors={errors}
          disabled={saving}
          onChange={(emergencyContact) =>
            updateDraft("emergencyContact", emergencyContact)
          }
        />
        <VehicleSection
          editing={editing}
          values={values.vehicle}
          errors={errors}
          disabled={saving}
          onChange={(vehicle) => updateDraft("vehicle", vehicle)}
        />
        <PetsSection
          editing={editing}
          values={values.pets}
          errors={errors}
          disabled={saving}
          onChange={(pets) => updateDraft("pets", pets)}
        />
        <CommunicationSection
          editing={editing}
          values={values.communication}
          errors={errors}
          disabled={saving}
          onChange={(communication) =>
            updateDraft("communication", communication)
          }
        />

        {editing ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="btn btn-neutral min-h-11 gap-1"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className="btn btn-ghost min-h-11"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </form>

      <p className="text-sm text-[var(--harbor-muted)]">
        Need help with account access?{" "}
        <Link href="/portal/messages" className="link link-primary">
          Message management
        </Link>
        .
      </p>
    </div>
  );
}

function editableFromView(profile: TenantProfile): TenantProfileEditable {
  return {
    preferredName: profile.preferredName,
    email: profile.email,
    phone: profile.phone,
    preferredContactMethod: profile.preferredContactMethod,
    emergencyContact: profile.emergencyContact,
    vehicle: profile.vehicle,
    pets: profile.pets,
    communication: profile.communication,
  };
}

function IdentitySection({ profile }: { profile: TenantProfile }) {
  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="identity-heading"
    >
      <div className="flex items-start gap-2">
        <Lock
          className="mt-1 h-4 w-4 shrink-0 text-[var(--harbor-mid)]"
          aria-hidden="true"
        />
        <div>
          <h3
            id="identity-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Account identity
          </h3>
          <p className="mt-1 text-sm text-[var(--harbor-muted)]">
            Legal name, tenant ID, property, unit, and lease status are
            read-only. Sensitive identity changes require Harborline’s
            verification process — contact management to request an update.
          </p>
        </div>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <ReadOnlyItem label="Legal name" value={profile.legalName} />
        <ReadOnlyItem label="Tenant ID" value={profile.tenantId} />
        <ReadOnlyItem label="Property" value={profile.propertyName} />
        <ReadOnlyItem label="Unit" value={profile.unitNumber} />
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
            Lease status
          </dt>
          <dd className="mt-1">
            <span className={`badge ${leaseStatusClass(profile.leaseStatus)}`}>
              {profile.leaseStatus}
            </span>
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <Link
          href="/portal/messages"
          className="btn btn-outline btn-sm min-h-11"
        >
          Request identity verification change
        </Link>
      </div>
    </section>
  );
}

function ContactSection({
  editing,
  values,
  errors,
  disabled,
  onChange,
}: {
  editing: boolean;
  values: TenantProfileEditable;
  errors: TenantProfileErrors;
  disabled: boolean;
  onChange: <K extends keyof TenantProfileEditable>(
    key: K,
    value: TenantProfileEditable[K]
  ) => void;
}) {
  const preferredNameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const methodId = useId();

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="contact-heading"
    >
      <h3
        id="contact-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Contact details
      </h3>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Preferred name and day-to-day contact information.
      </p>

      {editing ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Preferred name"
            htmlFor={preferredNameId}
            error={errors.preferredName}
            required
          >
            <input
              id={preferredNameId}
              className="input input-bordered w-full min-h-11 portal-focus"
              value={values.preferredName}
              onChange={(e) => onChange("preferredName", e.target.value)}
              disabled={disabled}
              maxLength={PORTAL_MAX_NAME_LENGTH}
              aria-invalid={Boolean(errors.preferredName)}
              aria-describedby={errors.preferredName ? `${preferredNameId}-error` : undefined}
              required
            />
          </Field>
          <Field
            label="Preferred contact method"
            htmlFor={methodId}
            error={errors.preferredContactMethod}
            required
          >
            <select
              id={methodId}
              className="select select-bordered w-full min-h-11 portal-focus"
              value={values.preferredContactMethod}
              onChange={(e) =>
                onChange(
                  "preferredContactMethod",
                  e.target.value as TenantProfileEditable["preferredContactMethod"]
                )
              }
              disabled={disabled}
              aria-invalid={Boolean(errors.preferredContactMethod)}
              aria-describedby={errors.preferredContactMethod ? `${methodId}-error` : undefined}
              required
            >
              <option value="">Select method</option>
              {PREFERRED_CONTACT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Email"
            htmlFor={emailId}
            error={errors.email}
            required
          >
            <input
              id={emailId}
              type="email"
              className="input input-bordered w-full min-h-11 portal-focus"
              value={values.email}
              onChange={(e) => onChange("email", e.target.value)}
              disabled={disabled}
              maxLength={PORTAL_MAX_SHORT_TEXT}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${emailId}-error` : undefined}
              required
              autoComplete="email"
            />
          </Field>
          <Field
            label="Phone"
            htmlFor={phoneId}
            error={errors.phone}
            required
          >
            <input
              id={phoneId}
              type="tel"
              className="input input-bordered w-full min-h-11 portal-focus"
              value={values.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              disabled={disabled}
              maxLength={PORTAL_MAX_SHORT_TEXT}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? `${phoneId}-error` : undefined}
              required
              autoComplete="tel"
            />
          </Field>
        </div>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <ReadOnlyItem label="Preferred name" value={values.preferredName} />
          <ReadOnlyItem
            label="Preferred contact method"
            value={labelContactMethod(values.preferredContactMethod)}
          />
          <ReadOnlyItem label="Email" value={values.email} />
          <ReadOnlyItem label="Phone" value={values.phone} />
        </dl>
      )}
    </section>
  );
}

function EmergencySection({
  editing,
  values,
  errors,
  disabled,
  onChange,
}: {
  editing: boolean;
  values: EmergencyContact;
  errors: TenantProfileErrors;
  disabled: boolean;
  onChange: (value: EmergencyContact) => void;
}) {
  const nameId = useId();
  const phoneId = useId();
  const relId = useId();

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="emergency-heading"
    >
      <h3
        id="emergency-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Emergency contact
      </h3>
      {editing ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field
            label="Name"
            htmlFor={nameId}
            error={errors.emergencyName}
            required
          >
            <input
              id={nameId}
              className="input input-bordered w-full min-h-11 portal-focus"
              value={values.name}
              onChange={(e) => onChange({ ...values, name: e.target.value })}
              disabled={disabled}
              maxLength={PORTAL_MAX_NAME_LENGTH}
              aria-invalid={Boolean(errors.emergencyName)}
              aria-describedby={errors.emergencyName ? `${nameId}-error` : undefined}
              required
            />
          </Field>
          <Field
            label="Phone"
            htmlFor={phoneId}
            error={errors.emergencyPhone}
            required
          >
            <input
              id={phoneId}
              type="tel"
              className="input input-bordered w-full min-h-11 portal-focus"
              value={values.phone}
              onChange={(e) => onChange({ ...values, phone: e.target.value })}
              disabled={disabled}
              maxLength={PORTAL_MAX_SHORT_TEXT}
              aria-invalid={Boolean(errors.emergencyPhone)}
              aria-describedby={errors.emergencyPhone ? `${phoneId}-error` : undefined}
              required
            />
          </Field>
          <Field
            label="Relationship"
            htmlFor={relId}
            error={errors.emergencyRelationship}
            required
          >
            <input
              id={relId}
              className="input input-bordered w-full min-h-11 portal-focus"
              value={values.relationship}
              onChange={(e) =>
                onChange({ ...values, relationship: e.target.value })
              }
              disabled={disabled}
              maxLength={PORTAL_MAX_SHORT_TEXT}
              aria-invalid={Boolean(errors.emergencyRelationship)}
              aria-describedby={errors.emergencyRelationship ? `${relId}-error` : undefined}
              required
            />
          </Field>
        </div>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <ReadOnlyItem label="Name" value={values.name} />
          <ReadOnlyItem label="Phone" value={values.phone} />
          <ReadOnlyItem label="Relationship" value={values.relationship} />
        </dl>
      )}
    </section>
  );
}

function VehicleSection({
  editing,
  values,
  errors,
  disabled,
  onChange,
}: {
  editing: boolean;
  values: VehicleInformation;
  errors: TenantProfileErrors;
  disabled: boolean;
  onChange: (value: VehicleInformation) => void;
}) {
  const makeId = useId();
  const colorId = useId();
  const plateId = useId();
  const permitId = useId();

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="vehicle-heading"
    >
      <h3
        id="vehicle-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Vehicle information
      </h3>
      {editing ? (
        <div className="mt-4 space-y-4">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox"
              checked={values.hasVehicle}
              onChange={(e) =>
                onChange({
                  ...values,
                  hasVehicle: e.target.checked,
                  ...(e.target.checked
                    ? {}
                    : {
                        makeModel: "",
                        color: "",
                        licensePlate: "",
                        parkingPermit: "",
                      }),
                })
              }
              disabled={disabled}
            />
            <span className="label-text">I have a vehicle on file</span>
          </label>
          {values.hasVehicle ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Make and model"
                htmlFor={makeId}
                error={errors.vehicleMakeModel}
                required
              >
                <input
                  id={makeId}
                  className="input input-bordered w-full min-h-11 portal-focus"
                  value={values.makeModel}
                  onChange={(e) =>
                    onChange({ ...values, makeModel: e.target.value })
                  }
                  disabled={disabled}
                  maxLength={PORTAL_MAX_SHORT_TEXT}
                  aria-invalid={Boolean(errors.vehicleMakeModel)}
              aria-describedby={errors.vehicleMakeModel ? `${makeId}-error` : undefined}
                  required
                />
              </Field>
              <Field label="Color" htmlFor={colorId} error={errors.vehicleColor}>
                <input
                  id={colorId}
                  className="input input-bordered w-full min-h-11 portal-focus"
                  value={values.color}
                  onChange={(e) =>
                    onChange({ ...values, color: e.target.value })
                  }
                  disabled={disabled}
                  maxLength={PORTAL_MAX_SHORT_TEXT}
                  aria-invalid={Boolean(errors.vehicleColor)}
              aria-describedby={errors.vehicleColor ? `${colorId}-error` : undefined}
                />
              </Field>
              <Field
                label="License plate"
                htmlFor={plateId}
                error={errors.vehicleLicensePlate}
                required
              >
                <input
                  id={plateId}
                  className="input input-bordered w-full min-h-11 portal-focus"
                  value={values.licensePlate}
                  onChange={(e) =>
                    onChange({ ...values, licensePlate: e.target.value })
                  }
                  disabled={disabled}
                  maxLength={20}
                  aria-invalid={Boolean(errors.vehicleLicensePlate)}
              aria-describedby={errors.vehicleLicensePlate ? `${plateId}-error` : undefined}
                  required
                />
              </Field>
              <Field
                label="Parking permit"
                htmlFor={permitId}
                error={errors.vehicleParkingPermit}
              >
                <input
                  id={permitId}
                  className="input input-bordered w-full min-h-11 portal-focus"
                  value={values.parkingPermit}
                  onChange={(e) =>
                    onChange({ ...values, parkingPermit: e.target.value })
                  }
                  disabled={disabled}
                  maxLength={PORTAL_MAX_SHORT_TEXT}
                  aria-invalid={Boolean(errors.vehicleParkingPermit)}
              aria-describedby={errors.vehicleParkingPermit ? `${permitId}-error` : undefined}
                />
              </Field>
            </div>
          ) : null}
        </div>
      ) : values.hasVehicle ? (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <ReadOnlyItem label="Make and model" value={values.makeModel} />
          <ReadOnlyItem label="Color" value={values.color || "—"} />
          <ReadOnlyItem label="License plate" value={values.licensePlate} />
          <ReadOnlyItem
            label="Parking permit"
            value={values.parkingPermit || "—"}
          />
        </dl>
      ) : (
        <p className="mt-3 text-sm text-[var(--harbor-muted)]">
          No vehicle on file.
        </p>
      )}
    </section>
  );
}

function PetsSection({
  editing,
  values,
  errors,
  disabled,
  onChange,
}: {
  editing: boolean;
  values: PetInformation;
  errors: TenantProfileErrors;
  disabled: boolean;
  onChange: (value: PetInformation) => void;
}) {
  const summaryId = useId();
  const detailsId = useId();

  return (
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
      {editing ? (
        <div className="mt-4 space-y-4">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox"
              checked={values.hasPets}
              onChange={(e) =>
                onChange({
                  ...values,
                  hasPets: e.target.checked,
                  ...(e.target.checked ? {} : { summary: "", details: "" }),
                })
              }
              disabled={disabled}
            />
            <span className="label-text">I have pets on file</span>
          </label>
          {values.hasPets ? (
            <div className="grid gap-4">
              <Field
                label="Summary"
                htmlFor={summaryId}
                error={errors.petSummary}
                required
              >
                <input
                  id={summaryId}
                  className="input input-bordered w-full min-h-11 portal-focus"
                  value={values.summary}
                  onChange={(e) =>
                    onChange({ ...values, summary: e.target.value })
                  }
                  disabled={disabled}
                  maxLength={PORTAL_MAX_SHORT_TEXT}
                  aria-invalid={Boolean(errors.petSummary)}
              aria-describedby={errors.petSummary ? `${summaryId}-error` : undefined}
                  required
                />
              </Field>
              <Field label="Details" htmlFor={detailsId} error={errors.petDetails}>
                <textarea
                  id={detailsId}
                  className="textarea textarea-bordered min-h-20 w-full portal-focus"
                  value={values.details}
                  onChange={(e) =>
                    onChange({ ...values, details: e.target.value })
                  }
                  disabled={disabled}
                  maxLength={PORTAL_MAX_MEDIUM_TEXT}
                  aria-invalid={Boolean(errors.petDetails)}
              aria-describedby={errors.petDetails ? `${detailsId}-error` : undefined}
                />
              </Field>
            </div>
          ) : null}
        </div>
      ) : values.hasPets ? (
        <dl className="mt-4 space-y-3">
          <ReadOnlyItem label="Summary" value={values.summary} />
          <ReadOnlyItem label="Details" value={values.details || "—"} />
        </dl>
      ) : (
        <p className="mt-3 text-sm text-[var(--harbor-muted)]">
          No pets on file.
        </p>
      )}
    </section>
  );
}

function CommunicationSection({
  editing,
  values,
  errors,
  disabled,
  onChange,
}: {
  editing: boolean;
  values: CommunicationPreferences;
  errors: TenantProfileErrors;
  disabled: boolean;
  onChange: (value: CommunicationPreferences) => void;
}) {
  const options: Array<{
    key: keyof CommunicationPreferences;
    label: string;
    hint: string;
  }> = [
    {
      key: "emailUpdates",
      label: "Email updates",
      hint: "Notices, receipts, and account updates",
    },
    {
      key: "smsUpdates",
      label: "Text / SMS updates",
      hint: "Urgent building and payment reminders",
    },
    {
      key: "portalMessages",
      label: "Portal messages",
      hint: "Inbox alerts for management replies",
    },
    {
      key: "phoneCalls",
      label: "Phone calls",
      hint: "Allow office callbacks when needed",
    },
    {
      key: "marketingOptIn",
      label: "Optional community updates",
      hint: "Events and non-required newsletters",
    },
  ];

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="comms-heading"
    >
      <h3
        id="comms-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Communication preferences
      </h3>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Choose how Harborline may contact you. At least one primary channel
        must stay enabled.
      </p>
      {errors.form ? (
        <p className="mt-3 text-sm text-error" role="alert">
          {errors.form}
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {options.map((option) => (
          <li
            key={option.key}
            className="flex items-start justify-between gap-3 rounded-xl bg-[var(--harbor-sand)]/30 px-3 py-3"
          >
            <div>
              <p className="text-sm font-medium text-[var(--harbor-ink)]">
                {option.label}
              </p>
              <p className="text-xs text-[var(--harbor-muted)]">{option.hint}</p>
            </div>
            {editing ? (
              <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={values[option.key]}
                  onChange={(e) =>
                    onChange({ ...values, [option.key]: e.target.checked })
                  }
                  disabled={disabled}
                  aria-label={option.label}
                />
              </label>
            ) : (
              <span className="badge badge-sm">
                {values[option.key] ? "On" : "Off"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  return (
    <div className="form-control">
      <label className="label" htmlFor={htmlFor}>
        <span className="label-text font-medium">
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
        </span>
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

function ReadOnlyItem({ label, value }: { label: string; value: string }) {
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
