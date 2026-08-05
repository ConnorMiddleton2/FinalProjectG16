"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  FileText,
  LogIn,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useApplicantProfile } from "@/hooks/useApplicantProfile";
import { useSavedUnits } from "@/hooks/useSavedUnits";
import { useTourBookings } from "@/hooks/useTourBookings";
import {
  canShowPreviousApplications,
  emptyApplicantProfile,
  type ApplicantProfile,
  type PreferredContactMethod,
  type PreferredUnitType,
} from "@/lib/applicant-profile";
import { AVAILABLE_UNIT_DETAILS } from "@/lib/available-unit-details";
import { formatDateLabel } from "@/lib/tour-scheduling";

const PROPERTIES = Array.from(
  new Set(AVAILABLE_UNIT_DETAILS.map((unit) => unit.property))
).sort();

const UNIT_TYPES: PreferredUnitType[] = [
  "",
  "Studio",
  "1 bedroom",
  "2 bedrooms",
  "3+ bedrooms",
  "Any",
];

const CONTACT_METHODS: PreferredContactMethod[] = ["Email", "Phone", "Text"];

function formatShortDate(value: string) {
  if (!value) return "Not set";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  }
  try {
    return formatDateLabel(value.slice(0, 10));
  } catch {
    return value;
  }
}

function statusBadge(status: string) {
  if (status === "Approved") return "badge-success";
  if (status === "In review" || status === "Draft") return "badge-info";
  if (status === "Declined") return "badge-error";
  return "badge-ghost";
}

export function ApplicantProfileView() {
  const {
    profile,
    applications,
    loading,
    error,
    saving,
    refresh,
    save,
  } = useApplicantProfile();
  const {
    ids: savedIds,
    loading: savedLoading,
    error: savedError,
  } = useSavedUnits();
  const {
    bookings,
    loading: toursLoading,
    error: toursError,
  } = useTourBookings();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ApplicantProfile>(emptyApplicantProfile);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const savedUnits = useMemo(
    () =>
      savedIds
        .map((id) => AVAILABLE_UNIT_DETAILS.find((unit) => unit.id === id))
        .filter(Boolean),
    [savedIds]
  );

  const upcomingTours = useMemo(
    () =>
      bookings.filter((booking) => booking.status === "confirmed").slice(0, 5),
    [bookings]
  );

  const activeApplication = applications.find(
    (application) => application.isActive
  );
  const previousApplications = applications.filter(
    (application) => !application.isActive
  );
  const showPrevious = canShowPreviousApplications(applications);

  function updateDraft<K extends keyof ApplicantProfile>(
    key: K,
    value: ApplicantProfile[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError(null);
    setSavedMessage(null);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!draft.fullName.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!draft.email.trim() || !draft.email.includes("@")) {
      setFormError("Enter a valid email.");
      return;
    }
    if (!draft.phone.trim()) {
      setFormError("Phone is required.");
      return;
    }

    try {
      await save({
        ...draft,
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        streetAddress: draft.streetAddress.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        zip: draft.zip.trim(),
      });
      setEditing(false);
      setSavedMessage("Profile updated.");
      window.setTimeout(() => setSavedMessage(null), 3000);
    } catch {
      // error surfaced by hook
    }
  }

  if (loading || savedLoading || toursLoading) {
    return (
      <div className="space-y-4" aria-label="Loading applicant profile">
        <div className="skeleton h-40 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
        <div className="skeleton h-48 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Applicant account
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          Applicant profile
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Keep contact preferences and leasing goals up to date. Sensitive
          identity and banking details are never shown here.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/75 p-4 text-sm text-[var(--harbor-ink)]/70 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p>
          Profile data for this demo is stored in your browser. Sign in with an
          existing Harborline account when you are ready for a longer-term
          applicant record.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
          <Link href="/login" className="btn btn-outline btn-sm gap-1">
            <LogIn className="h-3.5 w-3.5" />
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-ghost btn-sm">
            Create account
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--harbor-mid)]/20 bg-[var(--harbor-mist)]/40 p-4 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--harbor-mid)]" />
          <div>
            <p className="font-semibold text-[var(--harbor-ink)]">
              Privacy on this page
            </p>
            <p className="mt-1 text-[var(--harbor-ink)]/65">
              Full Social Security numbers, banking information, and unmasked
              identification numbers are not displayed. Verification documents
              are handled only inside the application flow when required.
            </p>
          </div>
        </div>
      </div>

      {error || savedError || toursError ? (
        <div className="alert border-error/20 bg-error/10 text-[var(--harbor-ink)]">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1">
            <p className="font-semibold">Something could not be loaded</p>
            <p className="text-sm opacity-70">
              {error || savedError || toursError}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="btn btn-sm btn-outline gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      {savedMessage ? (
        <div className="alert alert-success text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>{savedMessage}</span>
        </div>
      ) : null}

      <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[var(--harbor-ink)] p-3 text-[var(--harbor-sand)]">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-3xl">Contact & preferences</h2>
              <p className="text-sm text-[var(--harbor-ink)]/55">
                {profile.updatedAt
                  ? `Last updated ${new Date(profile.updatedAt).toLocaleString()}`
                  : "Not saved yet"}
              </p>
            </div>
          </div>
          {!editing ? (
            <button
              type="button"
              className="btn btn-outline btn-sm gap-1"
              onClick={() => {
                setDraft(profile);
                setEditing(true);
                setFormError(null);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit profile
            </button>
          ) : null}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            {formError ? (
              <div className="alert alert-warning text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{formError}</span>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                  Full name
                </span>
                <input
                  className="input input-bordered w-full"
                  value={draft.fullName}
                  onChange={(event) =>
                    updateDraft("fullName", event.target.value)
                  }
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                  Email
                </span>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={draft.email}
                  onChange={(event) => updateDraft("email", event.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                  Phone
                </span>
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  value={draft.phone}
                  onChange={(event) => updateDraft("phone", event.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                  Preferred contact method
                </span>
                <select
                  className="select select-bordered w-full"
                  value={draft.preferredContact}
                  onChange={(event) =>
                    updateDraft(
                      "preferredContact",
                      event.target.value as PreferredContactMethod
                    )
                  }
                >
                  {CONTACT_METHODS.map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                  Desired move-in date
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={draft.desiredMoveInDate}
                  onChange={(event) =>
                    updateDraft("desiredMoveInDate", event.target.value)
                  }
                />
              </label>
            </div>

            <fieldset className="rounded-2xl border border-[var(--harbor-deep)]/10 p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide">
                Current address
              </legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                    Street
                  </span>
                  <input
                    className="input input-bordered w-full"
                    value={draft.streetAddress}
                    onChange={(event) =>
                      updateDraft("streetAddress", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                    City
                  </span>
                  <input
                    className="input input-bordered w-full"
                    value={draft.city}
                    onChange={(event) =>
                      updateDraft("city", event.target.value)
                    }
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                      State
                    </span>
                    <input
                      className="input input-bordered w-full"
                      value={draft.state}
                      onChange={(event) =>
                        updateDraft("state", event.target.value)
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                      ZIP
                    </span>
                    <input
                      className="input input-bordered w-full"
                      value={draft.zip}
                      onChange={(event) =>
                        updateDraft("zip", event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                  Preferred property
                </span>
                <select
                  className="select select-bordered w-full"
                  value={draft.preferredProperty}
                  onChange={(event) =>
                    updateDraft("preferredProperty", event.target.value)
                  }
                >
                  <option value="">No preference yet</option>
                  {PROPERTIES.map((property) => (
                    <option key={property}>{property}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                  Preferred unit type
                </span>
                <select
                  className="select select-bordered w-full"
                  value={draft.preferredUnitType}
                  onChange={(event) =>
                    updateDraft(
                      "preferredUnitType",
                      event.target.value as PreferredUnitType
                    )
                  }
                >
                  {UNIT_TYPES.map((type) => (
                    <option key={type || "blank"} value={type}>
                      {type || "No preference yet"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-neutral"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(false);
                  setDraft(profile);
                  setFormError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Name", profile.fullName || "Not set"],
              ["Email", profile.email || "Not set"],
              ["Phone", profile.phone || "Not set"],
              ["Preferred contact", profile.preferredContact],
              [
                "Current address",
                [profile.streetAddress, profile.city, profile.state, profile.zip]
                  .filter(Boolean)
                  .join(", ") || "Not set",
              ],
              [
                "Desired move-in",
                formatShortDate(profile.desiredMoveInDate),
              ],
              [
                "Preferred property",
                profile.preferredProperty || "No preference yet",
              ],
              [
                "Preferred unit type",
                profile.preferredUnitType || "No preference yet",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl bg-[var(--harbor-sand)]/55 p-4"
              >
                <dt className="text-xs uppercase tracking-wide text-[var(--harbor-ink)]/50">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 font-display text-2xl">
              <Bookmark className="h-5 w-5 text-[var(--harbor-mid)]" />
              Saved units
            </h2>
            <Link href="/portal/units/saved" className="btn btn-ghost btn-xs">
              View all
            </Link>
          </div>
          {savedUnits.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--harbor-ink)]/60">
              No saved units yet.{" "}
              <Link href="/portal/units" className="link">
                Browse availability
              </Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {savedUnits.slice(0, 4).map((unit) =>
                unit ? (
                  <li
                    key={unit.id}
                    className="rounded-2xl border border-[var(--harbor-deep)]/10 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
                      {unit.property}
                    </p>
                    <p className="font-semibold">{unit.floorPlan}</p>
                    <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                      ${unit.rent.toLocaleString()} / month
                    </p>
                  </li>
                ) : null
              )}
            </ul>
          )}
        </article>

        <article className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 font-display text-2xl">
              <CalendarDays className="h-5 w-5 text-[var(--harbor-mid)]" />
              Scheduled tours
            </h2>
            <Link href="/portal/tours" className="btn btn-ghost btn-xs">
              Manage
            </Link>
          </div>
          {upcomingTours.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--harbor-ink)]/60">
              No confirmed tours.{" "}
              <Link href="/portal/tours" className="link">
                Schedule one
              </Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcomingTours.map((tour) => (
                <li
                  key={tour.id}
                  className="rounded-2xl border border-[var(--harbor-deep)]/10 p-3"
                >
                  <p className="font-semibold">{tour.property}</p>
                  <p className="text-sm text-[var(--harbor-ink)]/65">
                    {tour.floorPlan}
                  </p>
                  <p className="mt-1 text-sm">
                    {formatDateLabel(tour.date)} · {tour.time} ·{" "}
                    {tour.tourType}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 font-display text-3xl">
            <FileText className="h-6 w-6 text-[var(--harbor-mid)]" />
            Applications
          </h2>
          <Link href="/portal/applications" className="btn btn-outline btn-sm">
            Application status
          </Link>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/50">
            Active application
          </h3>
          {activeApplication ? (
            <div className="mt-3 rounded-2xl border border-[var(--harbor-deep)]/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{activeApplication.property}</p>
                  <p className="text-sm text-[var(--harbor-ink)]/60">
                    {activeApplication.floorPlan}
                  </p>
                  <p className="mt-1 text-sm">
                    Submitted {formatShortDate(activeApplication.submittedAt)}
                  </p>
                </div>
                <span
                  className={`badge ${statusBadge(activeApplication.status)}`}
                >
                  {activeApplication.status}
                </span>
              </div>
              <Link
                href={`/portal/applications/${activeApplication.id}/review`}
                className="btn btn-ghost btn-sm mt-3"
              >
                Continue application
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--harbor-ink)]/60">
              No active application.{" "}
              <Link href="/portal/apply" className="link">
                Start applying
              </Link>
            </p>
          )}
        </div>

        {showPrevious ? (
          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/50">
              Previous applications
            </h3>
            <ul className="mt-3 space-y-3">
              {previousApplications.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--harbor-sand)]/50 p-4"
                >
                  <div>
                    <p className="font-semibold">{application.property}</p>
                    <p className="text-sm text-[var(--harbor-ink)]/60">
                      {application.floorPlan} · Submitted{" "}
                      {formatShortDate(application.submittedAt)}
                    </p>
                  </div>
                  <span className={`badge ${statusBadge(application.status)}`}>
                    {application.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--harbor-ink)]/55">
            Previous applications will appear here when history is available.
          </p>
        )}
      </section>

      <p className="text-center text-xs text-[var(--harbor-ink)]/50">
        Profile fields are editable above. Saved units and tours sync from this
        browser’s Harborline leasing data.
      </p>
    </div>
  );
}
