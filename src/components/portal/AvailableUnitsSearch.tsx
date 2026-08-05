"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Bookmark,
  CalendarDays,
  Check,
  Filter,
  MapPin,
  PawPrint,
  Ruler,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useSavedUnits } from "@/hooks/useSavedUnits";

type Availability = "Available now" | "Available soon" | "Waitlist";
type SortOption =
  | "price-asc"
  | "price-desc"
  | "newest"
  | "move-in"
  | "sqft";

type Unit = {
  id: string;
  property: string;
  floorPlan: string;
  location: string;
  rent: number;
  beds: number;
  baths: number;
  sqft: number;
  availableDate: string;
  listedAt: string;
  petFriendly: boolean;
  accessible: boolean;
  amenities: string[];
  availability: Availability;
  artwork: string;
};

type Filters = {
  property: string;
  location: string;
  maxRent: string;
  bedrooms: string;
  bathrooms: string;
  moveInDate: string;
  minSqft: string;
  pets: string;
  accessibility: string;
  amenities: string[];
  availability: string;
};

const UNITS: Unit[] = [
  {
    id: "pier-12-305",
    property: "Pier 12 Residences",
    floorPlan: "Residence 305 · Harbor One",
    location: "Downtown · Harbor Walk",
    rent: 2450,
    beds: 1,
    baths: 1,
    sqft: 1180,
    availableDate: "2026-08-15",
    listedAt: "2026-08-04",
    petFriendly: true,
    accessible: true,
    amenities: ["Water views", "Covered parking", "Fitness room"],
    availability: "Available now",
    artwork: "from-[#0b2a32] via-[#1f7a8c] to-[#9ed7df]",
  },
  {
    id: "canal-yard-a",
    property: "Canal Yard Lofts",
    floorPlan: "Loft A · Open Studio",
    location: "Arts District · Canal Street",
    rent: 2075,
    beds: 0,
    baths: 1,
    sqft: 920,
    availableDate: "2026-08-22",
    listedAt: "2026-08-01",
    petFriendly: true,
    accessible: false,
    amenities: ["High ceilings", "Bike storage", "Pet wash"],
    availability: "Available now",
    artwork: "from-[#4c5f54] via-[#8fa78e] to-[#e6d7b8]",
  },
  {
    id: "harbor-court-3b",
    property: "Harbor Court",
    floorPlan: "Suite 3B · The Mariner",
    location: "East Wharf · Seaport Avenue",
    rent: 2790,
    beds: 2,
    baths: 2,
    sqft: 1340,
    availableDate: "2026-09-01",
    listedAt: "2026-08-05",
    petFriendly: true,
    accessible: true,
    amenities: ["Roof terrace", "Package room", "On-site team"],
    availability: "Available soon",
    artwork: "from-[#27384a] via-[#68849d] to-[#d4c29a]",
  },
  {
    id: "wharf-east-402",
    property: "Wharf East",
    floorPlan: "Residence 402 · Tidal Two",
    location: "East Wharf · Market Pier",
    rent: 3180,
    beds: 2,
    baths: 2,
    sqft: 1510,
    availableDate: "2026-09-12",
    listedAt: "2026-07-29",
    petFriendly: false,
    accessible: true,
    amenities: ["Balcony", "Covered parking", "Elevator"],
    availability: "Available soon",
    artwork: "from-[#283b45] via-[#557d8d] to-[#b7c9d6]",
  },
  {
    id: "pier-12-708",
    property: "Pier 12 Residences",
    floorPlan: "Residence 708 · Harbor Two",
    location: "Downtown · Harbor Walk",
    rent: 3495,
    beds: 2,
    baths: 2.5,
    sqft: 1680,
    availableDate: "2026-10-01",
    listedAt: "2026-08-03",
    petFriendly: true,
    accessible: false,
    amenities: ["Water views", "Private terrace", "Fitness room"],
    availability: "Waitlist",
    artwork: "from-[#102f3a] via-[#286d7b] to-[#d3b77d]",
  },
  {
    id: "canal-yard-c",
    property: "Canal Yard Lofts",
    floorPlan: "Loft C · Gallery One",
    location: "Arts District · Canal Street",
    rent: 2325,
    beds: 1,
    baths: 1,
    sqft: 1085,
    availableDate: "2026-08-10",
    listedAt: "2026-07-31",
    petFriendly: true,
    accessible: false,
    amenities: ["High ceilings", "Coworking lounge", "Bike storage"],
    availability: "Available now",
    artwork: "from-[#3b4038] via-[#82917b] to-[#d9cbb2]",
  },
  {
    id: "harbor-court-5a",
    property: "Harbor Court",
    floorPlan: "Suite 5A · The Beacon",
    location: "East Wharf · Seaport Avenue",
    rent: 3890,
    beds: 3,
    baths: 2,
    sqft: 1920,
    availableDate: "2026-09-20",
    listedAt: "2026-08-02",
    petFriendly: true,
    accessible: true,
    amenities: ["Roof terrace", "Package room", "Covered parking"],
    availability: "Available soon",
    artwork: "from-[#243949] via-[#6b879d] to-[#e0c78f]",
  },
  {
    id: "marina-house-214",
    property: "Marina House",
    floorPlan: "Residence 214 · Cove One",
    location: "North Marina · Anchor Lane",
    rent: 1895,
    beds: 1,
    baths: 1,
    sqft: 780,
    availableDate: "2026-08-18",
    listedAt: "2026-08-05",
    petFriendly: false,
    accessible: true,
    amenities: ["Elevator", "Package room", "Transit nearby"],
    availability: "Available now",
    artwork: "from-[#1e3740] via-[#51808d] to-[#b8d5d7]",
  },
];

const EMPTY_FILTERS: Filters = {
  property: "",
  location: "",
  maxRent: "",
  bedrooms: "",
  bathrooms: "",
  moveInDate: "",
  minSqft: "",
  pets: "",
  accessibility: "",
  amenities: [],
  availability: "",
};

const AMENITIES = [
  "Water views",
  "Covered parking",
  "Fitness room",
  "Roof terrace",
  "Elevator",
  "Package room",
  "Bike storage",
  "High ceilings",
];

const PROPERTIES = Array.from(new Set(UNITS.map((unit) => unit.property)));

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function activeFilterLabels(filters: Filters) {
  const labels: Array<{ key: string; label: string }> = [];
  if (filters.property)
    labels.push({ key: "property", label: filters.property });
  if (filters.location)
    labels.push({ key: "location", label: `Location: ${filters.location}` });
  if (filters.maxRent)
    labels.push({
      key: "maxRent",
      label: `Up to $${Number(filters.maxRent).toLocaleString()}`,
    });
  if (filters.bedrooms)
    labels.push({
      key: "bedrooms",
      label: filters.bedrooms === "0" ? "Studio" : `${filters.bedrooms}+ beds`,
    });
  if (filters.bathrooms)
    labels.push({ key: "bathrooms", label: `${filters.bathrooms}+ baths` });
  if (filters.moveInDate)
    labels.push({
      key: "moveInDate",
      label: `Move by ${formatDate(filters.moveInDate)}`,
    });
  if (filters.minSqft)
    labels.push({ key: "minSqft", label: `${filters.minSqft}+ sq ft` });
  if (filters.pets)
    labels.push({
      key: "pets",
      label: filters.pets === "yes" ? "Pet friendly" : "No pets needed",
    });
  if (filters.accessibility)
    labels.push({ key: "accessibility", label: "Accessible features" });
  if (filters.availability)
    labels.push({ key: "availability", label: filters.availability });
  filters.amenities.forEach((amenity) =>
    labels.push({ key: `amenity:${amenity}`, label: amenity })
  );
  return labels;
}

function FilterPanel({
  filters,
  onChange,
  onClear,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
}) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function toggleAmenity(amenity: string) {
    set(
      "amenities",
      filters.amenities.includes(amenity)
        ? filters.amenities.filter((item) => item !== amenity)
        : [...filters.amenities, amenity]
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          Filter units
        </h2>
        <button type="button" onClick={onClear} className="btn btn-ghost btn-xs">
          Clear all
        </button>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
          Property
        </span>
        <select
          className="select select-bordered select-sm w-full"
          value={filters.property}
          onChange={(event) => set("property", event.target.value)}
        >
          <option value="">All properties</option>
          {PROPERTIES.map((property) => (
            <option key={property}>{property}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
          Location
        </span>
        <label className="input input-bordered input-sm flex w-full items-center gap-2">
          <Search className="h-3.5 w-3.5 opacity-55" />
          <input
            className="grow"
            value={filters.location}
            onChange={(event) => set("location", event.target.value)}
            placeholder="Neighborhood or address"
          />
        </label>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            Max rent
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.maxRent}
            onChange={(event) => set("maxRent", event.target.value)}
          >
            <option value="">Any</option>
            <option value="2000">$2,000</option>
            <option value="2500">$2,500</option>
            <option value="3000">$3,000</option>
            <option value="3500">$3,500</option>
            <option value="4000">$4,000</option>
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            Min sq ft
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.minSqft}
            onChange={(event) => set("minSqft", event.target.value)}
          >
            <option value="">Any</option>
            <option value="750">750+</option>
            <option value="1000">1,000+</option>
            <option value="1250">1,250+</option>
            <option value="1500">1,500+</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            Bedrooms
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.bedrooms}
            onChange={(event) => set("bedrooms", event.target.value)}
          >
            <option value="">Any</option>
            <option value="0">Studio</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            Bathrooms
          </span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.bathrooms}
            onChange={(event) => set("bathrooms", event.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="2.5">2.5+</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
          Move-in by
        </span>
        <input
          type="date"
          className="input input-bordered input-sm w-full"
          value={filters.moveInDate}
          onChange={(event) => set("moveInDate", event.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
          Availability
        </span>
        <select
          className="select select-bordered select-sm w-full"
          value={filters.availability}
          onChange={(event) => set("availability", event.target.value)}
        >
          <option value="">Any availability</option>
          <option>Available now</option>
          <option>Available soon</option>
          <option>Waitlist</option>
        </select>
      </label>

      <div className="grid grid-cols-1 gap-2">
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--harbor-deep)]/10 p-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <PawPrint className="h-4 w-4 text-[var(--harbor-mid)]" />
            Pet friendly
          </span>
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={filters.pets === "yes"}
            onChange={(event) => set("pets", event.target.checked ? "yes" : "")}
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--harbor-deep)]/10 p-3 text-sm">
          <span>Accessibility features</span>
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={filters.accessibility === "yes"}
            onChange={(event) =>
              set("accessibility", event.target.checked ? "yes" : "")
            }
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide">
          Amenities
        </legend>
        <div className="grid gap-2">
          {AMENITIES.map((amenity) => (
            <label
              key={amenity}
              className="flex cursor-pointer items-center gap-2 text-sm"
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

function UnitCard({
  unit,
  saved,
  onSave,
}: {
  unit: Unit;
  saved: boolean;
  onSave: () => void;
}) {
  const badgeClass =
    unit.availability === "Available now"
      ? "badge-success"
      : unit.availability === "Available soon"
        ? "badge-info"
        : "badge-warning";

  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm transition hover:shadow-lg">
      <div className="grid md:grid-cols-[15rem_1fr]">
        <div
          className={`relative min-h-56 bg-gradient-to-br ${unit.artwork}`}
          role="img"
          aria-label={`Replaceable artwork for ${unit.property} ${unit.floorPlan}`}
        >
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_22%_18%,white_0,transparent_34%),linear-gradient(125deg,transparent_45%,white_46%,transparent_47%)]" />
          <span className={`badge ${badgeClass} absolute left-4 top-4`}>
            {unit.availability}
          </span>
          <button
            type="button"
            onClick={onSave}
            className={`btn btn-circle btn-sm absolute right-4 top-4 border-0 ${
              saved ? "bg-[var(--harbor-glow)]" : "bg-white/90"
            }`}
            aria-label={saved ? `Unsave ${unit.floorPlan}` : `Save ${unit.floorPlan}`}
          >
            {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
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
                {unit.location}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl">${unit.rent.toLocaleString()}</p>
              <p className="text-xs text-[var(--harbor-ink)]/55">per month</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-y border-[var(--harbor-deep)]/10 py-3 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-[var(--harbor-mid)]" />
              {unit.beds === 0 ? "Studio" : `${unit.beds} bed`}
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

          <div className="mt-4 flex flex-wrap gap-2">
            {unit.amenities.slice(0, 3).map((amenity) => (
              <span key={amenity} className="badge badge-ghost badge-sm">
                {amenity}
              </span>
            ))}
            {unit.petFriendly ? (
              <span className="badge badge-ghost badge-sm">Pet friendly</span>
            ) : null}
            {unit.accessible ? (
              <span className="badge badge-ghost badge-sm">Accessible</span>
            ) : null}
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <Link
              href={`/portal/units/${unit.id}`}
              className="btn btn-neutral btn-sm gap-1"
            >
              View Details
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button type="button" onClick={onSave} className="btn btn-outline btn-sm">
              {saved ? "Saved" : "Save Unit"}
            </button>
            <Link href={`/portal/tours?unit=${unit.id}`} className="btn btn-outline btn-sm">
              Schedule Tour
            </Link>
            <Link href={`/portal/apply?unit=${unit.id}`} className="btn btn-ghost btn-sm">
              Apply
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AvailableUnitsSearch() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortOption>("price-asc");
  const { ids: savedIds, isSaved, toggle, loading: savedLoading } =
    useSavedUnits();

  const activeFilters = activeFilterLabels(filters);
  const results = useMemo(() => {
    const filtered = UNITS.filter((unit) => {
      const locationQuery = filters.location.trim().toLowerCase();
      return (
        (!filters.property || unit.property === filters.property) &&
        (!locationQuery ||
          `${unit.location} ${unit.property}`
            .toLowerCase()
            .includes(locationQuery)) &&
        (!filters.maxRent || unit.rent <= Number(filters.maxRent)) &&
        (!filters.bedrooms || unit.beds >= Number(filters.bedrooms)) &&
        (!filters.bathrooms || unit.baths >= Number(filters.bathrooms)) &&
        (!filters.moveInDate || unit.availableDate <= filters.moveInDate) &&
        (!filters.minSqft || unit.sqft >= Number(filters.minSqft)) &&
        (!filters.pets || unit.petFriendly) &&
        (!filters.accessibility || unit.accessible) &&
        (!filters.availability || unit.availability === filters.availability) &&
        filters.amenities.every((amenity) => unit.amenities.includes(amenity))
      );
    });

    return filtered.sort((a, b) => {
      switch (sort) {
        case "price-desc":
          return b.rent - a.rent;
        case "newest":
          return b.listedAt.localeCompare(a.listedAt);
        case "move-in":
          return a.availableDate.localeCompare(b.availableDate);
        case "sqft":
          return b.sqft - a.sqft;
        default:
          return a.rent - b.rent;
      }
    });
  }, [filters, sort]);

  function removeFilter(key: string) {
    if (key.startsWith("amenity:")) {
      const amenity = key.slice("amenity:".length);
      setFilters((current) => ({
        ...current,
        amenities: current.amenities.filter((item) => item !== amenity),
      }));
      return;
    }
    setFilters((current) => ({ ...current, [key]: "" }));
  }

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Live the Harborline way
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Available units</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Refine your search, compare floor plans, and take the next step when
          a space feels right.
        </p>
      </div>

      <details className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold">
          <span className="inline-flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </span>
          {activeFilters.length ? (
            <span className="badge badge-neutral">{activeFilters.length}</span>
          ) : null}
        </summary>
        <div className="border-t border-[var(--harbor-deep)]/10 p-4">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
          />
        </div>
      </details>

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="sticky top-4 hidden rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 lg:block">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
          />
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">
                {results.length} {results.length === 1 ? "unit" : "units"} found
              </p>
              <p className="text-xs text-[var(--harbor-ink)]/55">
                {savedLoading
                  ? "Loading shortlist…"
                  : `${savedIds.length} saved for comparison`}{" "}
                ·{" "}
                <Link href="/portal/units/saved" className="link">
                  View saved
                </Link>
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="shrink-0">Sort by</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="select select-bordered select-sm w-full sm:w-auto"
              >
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="newest">Newest availability</option>
                <option value="move-in">Earliest move-in date</option>
                <option value="sqft">Square footage</option>
              </select>
            </label>
          </div>

          {activeFilters.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/55">
                Active filters
              </span>
              {activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => removeFilter(filter.key)}
                  className="badge badge-outline h-auto gap-1 py-2"
                >
                  {filter.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="btn btn-ghost btn-xs"
              >
                Clear all
              </button>
            </div>
          ) : null}

          {results.length ? (
            <div className="space-y-5">
              {results.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  saved={isSaved(unit.id)}
                  onSave={() => toggle(unit.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/65 px-6 py-16 text-center">
              <Search className="mx-auto h-10 w-10 text-[var(--harbor-mid)]" />
              <h2 className="mt-4 font-display text-3xl">No units match</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--harbor-ink)]/60">
                Try removing an amenity, widening your budget, or choosing a
                later move-in date.
              </p>
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="btn btn-neutral mt-6"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
