"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { FutureFaq } from "@/components/portal/future/FutureFaq";
import { UnitCard } from "@/components/portal/future/UnitCard";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalSection } from "@/components/portal/PortalSection";
import type { AvailableUnit } from "@/lib/portal/future/models";
import {
  FUTURE_APPLY,
  FUTURE_MESSAGES,
  FUTURE_TOURS,
  FUTURE_UNITS,
} from "@/lib/portal/future/paths";
import {
  getSavedUnitIdsSync,
  listUnits,
  removeSavedUnit,
  saveUnit,
} from "@/lib/portal/future/services";

const AMENITIES_STRIP = [
  "Personal homes & commercial suites",
  "In-unit laundry",
  "Fitness center",
  "Harbor views",
  "Office & retail spaces",
  "Covered parking",
];

const APPLICATION_STEPS = [
  {
    title: "Browse inventory",
    body: "Filter personal homes or commercial suites by rent, size, and move-in date.",
  },
  {
    title: "Tour a property",
    body: "Book in-person, virtual, or self-guided tours with leasing.",
  },
  {
    title: "Apply online",
    body: "Complete the multi-step application and upload documents.",
  },
  {
    title: "Review & move in",
    body: "Track status, review a lease offer, then finish onboarding.",
  },
];

export function FutureLandingPage() {
  const [units, setUnits] = useState<AvailableUnit[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setSavedIds(getSavedUnitIdsSync());
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      const result = await listUnits({}, "newest");
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        setStatus("error");
        return;
      }
      const featured = result.data.slice(0, 3);
      setUnits(featured);
      setStatus(featured.length ? "ready" : "empty");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggleSave(unitId: string) {
    setSavingId(unitId);
    const isSaved = savedIds.includes(unitId);
    const result = isSaved
      ? await removeSavedUnit(unitId)
      : await saveUnit(unitId);
    if (result.ok) {
      setSavedIds(result.data.map((item) => item.unitId));
    }
    setSavingId(null);
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const occupancyClass = String(form.get("occupancyClass") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const beds = String(form.get("beds") ?? "").trim();
    const maxRent = String(form.get("maxRent") ?? "").trim();
    if (occupancyClass) params.set("occupancyClass", occupancyClass);
    if (location) params.set("location", location);
    if (beds) params.set("beds", beds);
    if (maxRent) params.set("maxRent", maxRent);
    const qs = params.toString();
    window.location.href = qs ? `${FUTURE_UNITS}?${qs}` : FUTURE_UNITS;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-[linear-gradient(135deg,#0b2a32_0%,#1a5a66_55%,#2f7f8c_100%)] px-6 py-12 text-[var(--harbor-sand)] sm:px-10 sm:py-16">
        <div className="relative z-10 max-w-2xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--harbor-sand)]/70">
            Harborline leasing
          </p>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            Find Your Next Space
          </h1>
          <p className="text-base text-[var(--harbor-sand)]/85 sm:text-lg">
            Browse Harborline personal homes and commercial suites, schedule a
            tour, and start your rental application when you are ready.
          </p>

          <form
            onSubmit={onSearch}
            className="grid gap-3 rounded-2xl bg-white/95 p-4 text-[var(--harbor-ink)] sm:grid-cols-[1fr_9rem_7rem_8rem_auto]"
            aria-label="Search available units"
          >
            <label className="sr-only" htmlFor="landing-location">
              Location or neighborhood
            </label>
            <input
              id="landing-location"
              name="location"
              className="input input-bordered min-h-11 w-full portal-focus"
              placeholder="City or neighborhood"
            />
            <label className="sr-only" htmlFor="landing-occupancy">
              Property class
            </label>
            <select
              id="landing-occupancy"
              name="occupancyClass"
              className="portal-native-select min-h-11 portal-focus"
              defaultValue=""
            >
              <option value="">Personal &amp; commercial</option>
              <option value="personal">Personal</option>
              <option value="commercial">Commercial</option>
            </select>
            <label className="sr-only" htmlFor="landing-beds">
              Minimum bedrooms
            </label>
            <select
              id="landing-beds"
              name="beds"
              className="portal-native-select min-h-11 portal-focus"
              defaultValue=""
            >
              <option value="">Beds</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </select>
            <label className="sr-only" htmlFor="landing-max-rent">
              Maximum rent
            </label>
            <input
              id="landing-max-rent"
              name="maxRent"
              type="number"
              min={0}
              step={50}
              className="input input-bordered min-h-11 portal-focus"
              placeholder="Max rent"
            />
            <button
              type="submit"
              className="portal-btn portal-btn-primary min-h-11 portal-focus"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <PortalSection
        title="Featured units"
        description="Featured personal homes and commercial suites across Harborline."
        href={FUTURE_UNITS}
        linkLabel="View all units"
      >
        {status === "loading" ? (
          <p className="text-sm text-[var(--harbor-muted)]" role="status">
            Loading featured units…
          </p>
        ) : null}
        {status === "error" ? (
          <p className="portal-empty text-error" role="alert">
            {error ?? "Could not load featured units."}
          </p>
        ) : null}
        {status === "empty" ? (
          <p className="portal-empty">
            No featured units are available right now. Check back soon or browse
            the full inventory.
          </p>
        ) : null}
        {status === "ready" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {units.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                saved={savedIds.includes(unit.id)}
                saving={savingId === unit.id}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        ) : null}
      </PortalSection>

      <PortalSection title="Across Harborline" description="Amenities and features for personal homes and commercial suites.">
        <ul className="flex flex-wrap gap-2">
          {AMENITIES_STRIP.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[var(--harbor-deep)]/15 bg-[var(--harbor-sand)]/50 px-3 py-2 text-sm text-[var(--harbor-ink)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </PortalSection>

      <PortalSection
        title="How applying works"
        description="Four clear steps from browsing to move-in."
      >
        <ol className="grid gap-4 sm:grid-cols-2">
          {APPLICATION_STEPS.map((step, index) => (
            <li key={step.title} className="rounded-xl bg-[var(--harbor-mist)]/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
                Step {index + 1}
              </p>
              <h3 className="mt-1 font-semibold text-[var(--harbor-ink)]">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--harbor-muted)]">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={FUTURE_TOURS} className="portal-btn portal-btn-secondary portal-focus">
            Schedule a tour
          </Link>
          <Link href={FUTURE_APPLY} className="portal-btn portal-btn-primary portal-focus">
            Start application
          </Link>
        </div>
      </PortalSection>

      <PortalSection title="Frequently asked questions">
        <FutureFaq />
      </PortalSection>

      <PortalCard className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="portal-section-title">Questions about a home?</h2>
          <p className="mt-1 text-sm text-[var(--harbor-muted)]">
            Message Harborline leasing about units, tours, or applications.
          </p>
        </div>
        <Link href={FUTURE_MESSAGES} className="portal-btn portal-btn-primary portal-focus">
          Contact leasing
        </Link>
      </PortalCard>
    </div>
  );
}
