"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { UnitCard } from "@/components/portal/future/UnitCard";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { useClientSearchParams } from "@/hooks/useClientSearchParams";
import { usePortalModal } from "@/hooks/usePortalModal";
import type {
  AvailableUnit,
  OccupancyClass,
  UnitAvailability,
} from "@/lib/portal/future/models";
import { occupancyClassLabel } from "@/lib/portal/occupancy";
import {
  getSavedUnitIdsSync,
  listUnits,
  removeSavedUnit,
  saveUnit,
  type UnitFilters,
  type UnitSort,
} from "@/lib/portal/future/services";

const PERSONAL_PROPERTIES = [
  "Pier 12 Residences",
  "Harborline Cove",
  "Wharf House",
];

const COMMERCIAL_PROPERTIES = [
  "Pier 12 Commerce",
  "Canal Yard",
  "Harborfront Retail Row",
];

const PERSONAL_AMENITIES = [
  "In-unit washer/dryer",
  "Balcony",
  "Fitness center",
  "Harbor view",
];

const COMMERCIAL_AMENITIES = [
  "Street frontage",
  "Conference room",
  "Grade-level loading",
  "Boardwalk frontage",
];

type FilterState = {
  occupancyClass: string;
  property: string;
  location: string;
  minRent: string;
  maxRent: string;
  beds: string;
  minSqft: string;
  moveInBy: string;
  petFriendly: boolean;
  availability: string;
  amenities: string[];
};

const EMPTY_FILTERS: FilterState = {
  occupancyClass: "",
  property: "",
  location: "",
  minRent: "",
  maxRent: "",
  beds: "",
  minSqft: "",
  moveInBy: "",
  petFriendly: false,
  availability: "",
  amenities: [],
};

function filtersFromSearchParams(
  searchParams: URLSearchParams
): FilterState {
  const occupancyClass = searchParams.get("occupancyClass") ?? "";
  const beds =
    occupancyClass === "commercial" ? "" : (searchParams.get("beds") ?? "");
  return {
    ...EMPTY_FILTERS,
    occupancyClass,
    location: searchParams.get("location") ?? "",
    beds,
    maxRent: searchParams.get("maxRent") ?? "",
    property: searchParams.get("property") ?? "",
    minRent: searchParams.get("minRent") ?? "",
    minSqft: searchParams.get("minSqft") ?? "",
  };
}

function toServiceFilters(state: FilterState): UnitFilters {
  const filters: UnitFilters = {};
  if (state.occupancyClass)
    filters.occupancyClass = state.occupancyClass as OccupancyClass;
  if (state.property) filters.property = state.property;
  if (state.location.trim()) filters.location = state.location.trim();
  if (state.minRent) filters.minRent = Number(state.minRent);
  if (state.maxRent) filters.maxRent = Number(state.maxRent);
  if (state.occupancyClass !== "commercial" && state.beds) {
    filters.beds = Number(state.beds);
  }
  if (state.minSqft) filters.minSqft = Number(state.minSqft);
  if (state.moveInBy) filters.moveInBy = state.moveInBy;
  if (state.petFriendly && state.occupancyClass !== "commercial") {
    filters.petFriendly = true;
  }
  if (state.amenities.length) filters.amenities = state.amenities;
  if (state.availability) {
    filters.availability = state.availability as UnitAvailability;
  }
  return filters;
}

function activeChips(
  state: FilterState
): Array<{ key: string; label: string }> {
  const chips: Array<{ key: string; label: string }> = [];
  if (state.occupancyClass)
    chips.push({
      key: "occupancyClass",
      label: occupancyClassLabel(state.occupancyClass as OccupancyClass),
    });
  if (state.property)
    chips.push({ key: "property", label: state.property });
  if (state.location.trim())
    chips.push({
      key: "location",
      label: state.location.trim(),
    });
  if (state.minRent)
    chips.push({ key: "minRent", label: `From $${state.minRent}` });
  if (state.maxRent)
    chips.push({ key: "maxRent", label: `Up to $${state.maxRent}` });
  if (state.beds) chips.push({ key: "beds", label: `${state.beds}+ beds` });
  if (state.minSqft)
    chips.push({ key: "minSqft", label: `${state.minSqft}+ sqft` });
  if (state.moveInBy)
    chips.push({ key: "moveInBy", label: `By ${state.moveInBy}` });
  if (state.petFriendly)
    chips.push({ key: "petFriendly", label: "Pet-friendly" });
  if (state.availability)
    chips.push({
      key: "availability",
      label:
        state.availability === "coming_soon"
          ? "Coming soon"
          : state.availability === "limited"
            ? "Limited"
            : "Available",
    });
  state.amenities.forEach((a) =>
    chips.push({ key: `amenity:${a}`, label: a })
  );
  return chips;
}

function propertyOptionsFor(occupancyClass: string) {
  if (occupancyClass === "personal") return PERSONAL_PROPERTIES;
  if (occupancyClass === "commercial") return COMMERCIAL_PROPERTIES;
  return [...PERSONAL_PROPERTIES, ...COMMERCIAL_PROPERTIES];
}

function amenityOptionsFor(occupancyClass: string) {
  if (occupancyClass === "commercial") return COMMERCIAL_AMENITIES;
  if (occupancyClass === "personal") return PERSONAL_AMENITIES;
  return [...PERSONAL_AMENITIES, ...COMMERCIAL_AMENITIES];
}

function FilterPanel({
  filters,
  onChange,
  idPrefix,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  idPrefix: string;
}) {
  const amenityOptions = amenityOptionsFor(filters.occupancyClass);
  const propertyOptions = propertyOptionsFor(filters.occupancyClass);
  const isCommercial = filters.occupancyClass === "commercial";

  function patch(partial: Partial<FilterState>) {
    const next = { ...filters, ...partial };
    if (partial.occupancyClass === "commercial") {
      next.beds = "";
      next.petFriendly = false;
      next.amenities = next.amenities.filter((a) =>
        COMMERCIAL_AMENITIES.includes(a)
      );
      if (
        next.property &&
        !COMMERCIAL_PROPERTIES.includes(next.property)
      ) {
        next.property = "";
      }
    }
    if (partial.occupancyClass === "personal") {
      next.amenities = next.amenities.filter((a) =>
        PERSONAL_AMENITIES.includes(a)
      );
      if (
        next.property &&
        !PERSONAL_PROPERTIES.includes(next.property)
      ) {
        next.property = "";
      }
    }
    onChange(next);
  }

  function toggleAmenity(value: string) {
    const amenities = filters.amenities.includes(value)
      ? filters.amenities.filter((item) => item !== value)
      : [...filters.amenities, value];
    patch({ amenities });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--harbor-ink)]">
          Property class
        </p>
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-label="Property class"
        >
          {(
            [
              { value: "", label: "All" },
              { value: "personal", label: "Personal" },
              { value: "commercial", label: "Commercial" },
            ] as const
          ).map((option) => (
            <button
              key={option.label}
              type="button"
              className={`min-h-11 rounded-xl border px-2 text-sm font-medium portal-focus ${
                filters.occupancyClass === option.value
                  ? "border-[var(--harbor-ink)] bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                  : "border-[var(--harbor-deep)]/15 bg-white text-[var(--harbor-ink)]"
              }`}
              aria-pressed={filters.occupancyClass === option.value}
              onClick={() => patch({ occupancyClass: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <PortalField
        label="Property"
        as="select"
        id={`${idPrefix}-property`}
        value={filters.property}
        onChange={(e) => patch({ property: e.target.value })}
      >
        <option value="">Any property</option>
        {propertyOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </PortalField>

      <PortalField
        label="Location"
        id={`${idPrefix}-location`}
        value={filters.location}
        onChange={(e) => patch({ location: e.target.value })}
        placeholder="City or neighborhood"
      />

      <div className="grid grid-cols-2 gap-3">
        <PortalField
          label="Min rent"
          type="number"
          min={0}
          id={`${idPrefix}-min-rent`}
          value={filters.minRent}
          onChange={(e) => patch({ minRent: e.target.value })}
        />
        <PortalField
          label="Max rent"
          type="number"
          min={0}
          id={`${idPrefix}-max-rent`}
          value={filters.maxRent}
          onChange={(e) => patch({ maxRent: e.target.value })}
        />
      </div>

      {isCommercial ? (
        <PortalField
          label="Min sqft"
          type="number"
          min={0}
          id={`${idPrefix}-min-sqft`}
          value={filters.minSqft}
          onChange={(e) => patch({ minSqft: e.target.value })}
        />
      ) : (
        <PortalField
          label="Beds"
          as="select"
          id={`${idPrefix}-beds`}
          value={filters.beds}
          onChange={(e) => patch({ beds: e.target.value })}
        >
          <option value="">Any</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
        </PortalField>
      )}

      <PortalField
        label="Available by"
        type="date"
        id={`${idPrefix}-move-in`}
        value={filters.moveInBy}
        onChange={(e) => patch({ moveInBy: e.target.value })}
      />

      <PortalField
        label="Availability"
        as="select"
        id={`${idPrefix}-availability`}
        value={filters.availability}
        onChange={(e) => patch({ availability: e.target.value })}
      >
        <option value="">Any</option>
        <option value="available">Available now</option>
        <option value="limited">Limited</option>
        <option value="coming_soon">Coming soon</option>
      </PortalField>

      {!isCommercial ? (
        <label className="flex min-h-11 items-center gap-2 text-sm text-[var(--harbor-ink)]">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={filters.petFriendly}
            onChange={(e) => patch({ petFriendly: e.target.checked })}
          />
          Pet-friendly
        </label>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-[var(--harbor-ink)]">
          Popular amenities
        </legend>
        <div className="space-y-2">
          {amenityOptions.map((amenity) => (
            <label
              key={amenity}
              className="flex min-h-11 items-center gap-2 text-sm text-[var(--harbor-ink)]"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={filters.amenities.includes(amenity)}
                onChange={() => toggleAmenity(amenity)}
              />
              {amenity}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function filtersEqual(a: FilterState, b: FilterState) {
  return (
    a.occupancyClass === b.occupancyClass &&
    a.property === b.property &&
    a.location === b.location &&
    a.minRent === b.minRent &&
    a.maxRent === b.maxRent &&
    a.beds === b.beds &&
    a.minSqft === b.minSqft &&
    a.moveInBy === b.moveInBy &&
    a.petFriendly === b.petFriendly &&
    a.availability === b.availability &&
    a.amenities.length === b.amenities.length &&
    a.amenities.every((item, index) => item === b.amenities[index])
  );
}

export function FutureUnitsPage() {
  const searchParams = useClientSearchParams();
  const searchKey = searchParams.toString();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<UnitSort>("newest");
  const [units, setUnits] = useState<AvailableUnit[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const requestIdRef = useRef(0);
  const mobileFiltersId = useId();
  const { containerRef } = usePortalModal({
    open: filtersOpen,
    onClose: () => setFiltersOpen(false),
    restoreFocusRef: filterButtonRef,
  });

  useEffect(() => {
    const next = filtersFromSearchParams(new URLSearchParams(searchKey));
    setFilters((current) => (filtersEqual(current, next) ? current : next));
  }, [searchKey]);

  useEffect(() => {
    setSavedIds(getSavedUnitIdsSync());
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    setError(null);
    const handle = window.setTimeout(() => {
      void (async () => {
        const result = await listUnits(toServiceFilters(filters), sort);
        if (requestId !== requestIdRef.current) return;
        if (!result.ok) {
          setError(result.error.message);
          setStatus("error");
          return;
        }
        setUnits(result.data);
        setStatus(result.data.length ? "ready" : "empty");
      })();
    }, 150);
    return () => {
      window.clearTimeout(handle);
    };
  }, [filters, sort]);

  const chips = useMemo(() => activeChips(filters), [filters]);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function removeChip(key: string) {
    const next = { ...filters };
    if (key.startsWith("amenity:")) {
      const value = key.slice("amenity:".length);
      next.amenities = next.amenities.filter((a) => a !== value);
    } else if (key === "petFriendly") {
      next.petFriendly = false;
    } else {
      (next as Record<string, unknown>)[key] = "";
    }
    setFilters(next);
  }

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

  if (!clientReady) {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading available units…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--harbor-muted)]" aria-live="polite">
          {status === "ready"
            ? `${units.length} unit${units.length === 1 ? "" : "s"} found`
            : status === "loading"
              ? "Searching units…"
              : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            ref={filterButtonRef}
            type="button"
            className="portal-btn portal-btn-secondary min-h-11 lg:hidden portal-focus"
            aria-expanded={filtersOpen}
            aria-controls={mobileFiltersId}
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {chips.length ? (
              <span className="rounded-full bg-[var(--harbor-ink)] px-2 py-0.5 text-xs text-[var(--harbor-sand)]">
                {chips.length}
              </span>
            ) : null}
          </button>
          <label className="flex items-center gap-2 text-sm text-[var(--harbor-ink)]">
            <span className="sr-only sm:not-sr-only">Sort</span>
            <select
              className="portal-native-select min-h-11 portal-focus"
              value={sort}
              onChange={(e) => setSort(e.target.value as UnitSort)}
              aria-label="Sort units"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="earliest_move_in">Earliest move-in</option>
              <option value="sqft_desc">Largest</option>
            </select>
          </label>
        </div>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--harbor-deep)]/15 bg-white px-3 text-sm portal-focus"
              onClick={() => removeChip(chip.key)}
            >
              {chip.label}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <button
            type="button"
            className="min-h-11 rounded px-2 text-sm font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline portal-focus"
            onClick={clearFilters}
          >
            Clear all
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <PortalCard
          className="hidden self-start lg:block"
          as="aside"
          aria-label="Unit filters"
        >
          <h2 className="portal-section-title mb-4">Filters</h2>
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            idPrefix="desktop"
          />
        </PortalCard>

        <div className="min-w-0 space-y-4">
          {status === "loading" ? (
            <p className="text-sm text-[var(--harbor-muted)]" role="status">
              Loading available units…
            </p>
          ) : null}
          {status === "error" ? (
            <p className="portal-empty text-error" role="alert">
              {error ?? "Could not load units."}
            </p>
          ) : null}
          {status === "empty" ? (
            <PortalCard className="space-y-3">
              <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
                No units match
              </h2>
              <p className="text-sm text-[var(--harbor-muted)]">
                Try clearing filters or broadening your search.
              </p>
              <button
                type="button"
                className="portal-btn portal-btn-secondary portal-focus"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </PortalCard>
          ) : null}
          {status === "ready" ? (
            <div className="grid gap-4 md:grid-cols-2">
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
        </div>
      </div>

      {filtersOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--harbor-ink)]/40 lg:hidden"
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
        />
      ) : null}

      {filtersOpen ? (
        <div
          id={mobileFiltersId}
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Unit filters"
          tabIndex={-1}
          className="fixed inset-x-4 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white p-4 shadow-lg outline-none lg:hidden"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="portal-section-title">Filters</h2>
            <button
              type="button"
              className="btn btn-ghost min-h-11 min-w-11 portal-focus"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            idPrefix="mobile"
          />
          <button
            type="button"
            className="portal-btn portal-btn-primary mt-4 w-full portal-focus"
            onClick={() => setFiltersOpen(false)}
          >
            Show results
          </button>
        </div>
      ) : null}

      <p className="text-xs text-[var(--harbor-muted)]">
        Need help choosing?{" "}
        <Link
          href="/portal/future/messages"
          className="font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline"
        >
          Contact leasing
        </Link>
      </p>
    </div>
  );
}
