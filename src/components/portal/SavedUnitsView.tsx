"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bath,
  BedDouble,
  Bookmark,
  CalendarDays,
  LogIn,
  MapPin,
  RefreshCw,
  Ruler,
  Search,
  Trash2,
} from "lucide-react";
import { useSavedUnits } from "@/hooks/useSavedUnits";
import {
  AVAILABLE_UNIT_DETAILS,
  type AvailableUnitDetails,
} from "@/lib/available-unit-details";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function bedsLabel(beds: number) {
  return beds === 0 ? "Studio" : `${beds} bed`;
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-label="Loading saved units">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70"
        >
          <div className="skeleton h-36 w-full rounded-none" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-7 w-2/3" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SavedUnitCard({
  unit,
  onRemove,
}: {
  unit: AvailableUnitDetails;
  onRemove: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm">
      <div className="grid md:grid-cols-[14rem_1fr]">
        <div
          className={`relative min-h-44 bg-gradient-to-br ${unit.artwork[0]}`}
          role="img"
          aria-label={`Replaceable artwork for ${unit.floorPlan}`}
        >
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_25%_20%,white_0,transparent_32%)]" />
          <span className="badge badge-outline absolute left-4 top-4 border-white/40 bg-white/90">
            {unit.availability}
          </span>
        </div>

        <div className="flex flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
                {unit.property}
              </p>
              <h2 className="mt-1 font-display text-2xl">{unit.floorPlan}</h2>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--harbor-ink)]/60">
                <MapPin className="h-4 w-4" />
                {unit.neighborhood}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl">
                ${unit.rent.toLocaleString()}
              </p>
              <p className="text-xs text-[var(--harbor-ink)]/55">per month</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-y border-[var(--harbor-deep)]/10 py-3 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-[var(--harbor-mid)]" />
              {bedsLabel(unit.beds)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-[var(--harbor-mid)]" />
              {unit.baths} bath
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-[var(--harbor-mid)]" />
              {unit.sqft.toLocaleString()} sq ft
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-[var(--harbor-mid)]" />
              {formatDate(unit.availableDate)}
            </span>
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <Link
              href={`/portal/units/${unit.id}`}
              className="btn btn-neutral btn-sm gap-1"
            >
              View details
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={`/portal/apply?unit=${unit.id}`}
              className="btn btn-outline btn-sm"
            >
              Start application
            </Link>
            <Link
              href={`/portal/tours?unit=${unit.id}`}
              className="btn btn-outline btn-sm"
            >
              Schedule tour
            </Link>
            <button
              type="button"
              onClick={onRemove}
              className="btn btn-ghost btn-sm gap-1 text-error"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ComparisonTable({ units }: { units: AvailableUnitDetails[] }) {
  if (units.length < 2) return null;

  const rows: Array<{
    label: string;
    value: (unit: AvailableUnitDetails) => string;
  }> = [
    { label: "Property", value: (unit) => unit.property },
    { label: "Floor plan", value: (unit) => unit.floorPlan },
    {
      label: "Monthly rent",
      value: (unit) => `$${unit.rent.toLocaleString()}`,
    },
    { label: "Bedrooms", value: (unit) => bedsLabel(unit.beds) },
    { label: "Bathrooms", value: (unit) => String(unit.baths) },
    {
      label: "Square footage",
      value: (unit) => `${unit.sqft.toLocaleString()} sq ft`,
    },
    {
      label: "Move-in date",
      value: (unit) => formatDate(unit.availableDate),
    },
    { label: "Availability", value: (unit) => unit.availability },
    { label: "Deposit", value: (unit) => unit.deposit },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90">
      <div className="border-b border-[var(--harbor-deep)]/10 px-5 py-4 sm:px-6">
        <h2 className="font-display text-2xl">Compare saved units</h2>
        <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
          Side-by-side basics for the homes you are considering.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="min-w-36">Detail</th>
              {units.map((unit) => (
                <th key={unit.id} className="min-w-44">
                  {unit.property}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="text-xs uppercase tracking-wide opacity-60">
                  {row.label}
                </th>
                {units.map((unit) => (
                  <td key={`${unit.id}-${row.label}`}>{row.value(unit)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="text-xs uppercase tracking-wide opacity-60">
                Actions
              </th>
              {units.map((unit) => (
                <td key={`${unit.id}-actions`}>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/portal/apply?unit=${unit.id}`}
                      className="btn btn-neutral btn-xs"
                    >
                      Apply
                    </Link>
                    <Link
                      href={`/portal/tours?unit=${unit.id}`}
                      className="btn btn-outline btn-xs"
                    >
                      Tour
                    </Link>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SavedUnitsView() {
  const { ids, loading, error, refresh, remove, clear } = useSavedUnits();

  const units = ids
    .map((id) => AVAILABLE_UNIT_DETAILS.find((unit) => unit.id === id))
    .filter((unit): unit is AvailableUnitDetails => Boolean(unit));
  const missingCount = ids.length - units.length;

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Your shortlist
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Saved units</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Compare favorites, schedule tours, and start applications when you
          are ready.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/75 p-4 text-sm text-[var(--harbor-ink)]/70 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p>
          Saved units stay in this browser for signed-out visitors. Sign in with
          an existing Harborline account if you want a longer-term applicant
          profile.
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

      {error ? (
        <div className="alert border-error/20 bg-error/10 text-[var(--harbor-ink)]">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1">
            <p className="font-semibold">Could not load saved units</p>
            <p className="text-sm opacity-70">{error}</p>
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

      {loading ? (
        <LoadingState />
      ) : !error && units.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/65 px-6 py-16 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-[var(--harbor-mid)]" />
          <h2 className="mt-4 font-display text-3xl">No saved units yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--harbor-ink)]/60">
            Browse available homes and tap Save Unit to build a shortlist you
            can compare later.
          </p>
          <Link href="/portal/units" className="btn btn-neutral mt-6 gap-2">
            <Search className="h-4 w-4" />
            Browse available units
          </Link>
        </div>
      ) : !error ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {units.length} {units.length === 1 ? "unit" : "units"} saved
              </p>
              {missingCount > 0 ? (
                <p className="text-xs text-[var(--harbor-ink)]/55">
                  {missingCount} saved{" "}
                  {missingCount === 1 ? "listing is" : "listings are"} no longer
                  available and {missingCount === 1 ? "was" : "were"} skipped.
                </p>
              ) : (
                <p className="text-xs text-[var(--harbor-ink)]/55">
                  Stored temporarily in this browser
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={clear}
              className="btn btn-ghost btn-sm gap-1"
              disabled={ids.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          </div>

          <ComparisonTable units={units} />

          <div className="space-y-5">
            {units.map((unit) => (
              <SavedUnitCard
                key={unit.id}
                unit={unit}
                onRemove={() => remove(unit.id)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
