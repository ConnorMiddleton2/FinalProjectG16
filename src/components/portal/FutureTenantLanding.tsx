"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Car,
  CheckCircle2,
  FileCheck2,
  Home,
  MapPin,
  MessageCircle,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import { useSharedCollection } from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { COLLECTIONS } from "@/lib/shared-store";

type Listing = {
  id: string;
  name: string;
  unit: string;
  address: string;
  type: string;
  size: string;
  rent: string;
  amenities: string[];
  artwork: string;
};

const SAMPLE_LISTINGS: Listing[] = [
  {
    id: "sample-pier-12",
    name: "Pier 12 Residences",
    unit: "Residence 305",
    address: "12 Harbor Walk · Downtown",
    type: "Multifamily",
    size: "1,180 sq ft",
    rent: "$2,450 / month",
    amenities: ["Water views", "Covered parking", "Fitness room"],
    artwork: "from-[#0b2a32] via-[#1f7a8c] to-[#9ed7df]",
  },
  {
    id: "sample-canal-yard",
    name: "Canal Yard Lofts",
    unit: "Loft A",
    address: "88 Canal Street · Arts District",
    type: "Mixed-use",
    size: "920 sq ft",
    rent: "$2,075 / month",
    amenities: ["Pet friendly", "High ceilings", "Bike storage"],
    artwork: "from-[#4c5f54] via-[#8fa78e] to-[#e6d7b8]",
  },
  {
    id: "sample-harbor-court",
    name: "Harbor Court",
    unit: "Suite 3B",
    address: "410 Seaport Avenue · East Wharf",
    type: "Multifamily",
    size: "1,340 sq ft",
    rent: "$2,790 / month",
    amenities: ["Roof terrace", "Package room", "On-site team"],
    artwork: "from-[#27384a] via-[#68849d] to-[#d4c29a]",
  },
];

const AMENITIES = [
  {
    icon: ShieldCheck,
    title: "Professionally managed",
    text: "Responsive on-site and portfolio support.",
  },
  {
    icon: Car,
    title: "Convenient parking",
    text: "Options vary by property and unit.",
  },
  {
    icon: Wifi,
    title: "Connected living",
    text: "Modern access and connectivity-ready spaces.",
  },
  {
    icon: Sparkles,
    title: "Well-kept spaces",
    text: "Clean common areas and thoughtful finishes.",
  },
];

const STEPS = [
  ["01", "Discover", "Search available units and save your favorites."],
  ["02", "Tour", "Choose a convenient time to visit the property."],
  ["03", "Apply", "Complete one guided application online."],
  ["04", "Move in", "Review your offer and finish onboarding."],
];

const FAQS = [
  [
    "What do I need before applying?",
    "Have contact information, income documentation, identification, and details for any co-applicants or occupants ready.",
  ],
  [
    "Can I tour before I create an account?",
    "Yes. Browse and request a tour first, then create an account when you are ready to save units or apply.",
  ],
  [
    "How will I know my application status?",
    "Sign in and open Application Status to see progress, outstanding items, and leasing decisions.",
  ],
  [
    "Are amenities the same at every property?",
    "No. Each listing identifies its available features, parking options, policies, and property-specific amenities.",
  ],
];

const ARTWORK = [
  "from-[#0b2a32] via-[#1f7a8c] to-[#9ed7df]",
  "from-[#4c5f54] via-[#8fa78e] to-[#e6d7b8]",
  "from-[#27384a] via-[#68849d] to-[#d4c29a]",
];

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toListings(properties: ManagementContractDraft[]): Listing[] {
  return properties.slice(0, 6).map((property, index) => ({
    id: property.id,
    name: property.propertyName || "Harborline Property",
    unit: property.unitsSuites
      ? `${property.unitsSuites} unit availability`
      : "Availability by request",
    address:
      [property.streetAddress, property.city, property.state]
        .filter(Boolean)
        .join(" · ") || "Location available from leasing",
    type: titleCase(property.propertyType || "other"),
    size: property.rentableSf
      ? `${property.rentableSf} rentable sq ft`
      : "Size varies by unit",
    rent: "Contact for pricing",
    amenities: property.amenities
      ? property.amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3)
      : ["Managed by Harborline", "Tour by appointment"],
    artwork: ARTWORK[index % ARTWORK.length],
  }));
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div
        className={`relative h-48 overflow-hidden bg-gradient-to-br ${listing.artwork}`}
        role="img"
        aria-label={`Replaceable artwork for ${listing.name}`}
      >
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_25%_20%,white_0,transparent_32%),linear-gradient(120deg,transparent_45%,white_46%,transparent_47%)]" />
        <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--harbor-ink)]">
          {listing.type}
        </span>
        <Link
          href="/portal/units/saved"
          className="btn btn-circle btn-sm absolute right-4 top-4 border-0 bg-white/90"
          aria-label={`Save ${listing.name}`}
        >
          <Bookmark className="h-4 w-4" />
        </Link>
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
          {listing.unit}
        </p>
        <h3 className="mt-1 font-display text-2xl">{listing.name}</h3>
        <p className="mt-2 flex items-start gap-2 text-sm text-[var(--harbor-ink)]/60">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {listing.address}
        </p>
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-y border-[var(--harbor-deep)]/10 py-3 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="h-4 w-4 text-[var(--harbor-mid)]" />
            {listing.size}
          </span>
          <strong>{listing.rent}</strong>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {listing.amenities.map((amenity) => (
            <span key={amenity} className="badge badge-ghost badge-sm">
              {amenity}
            </span>
          ))}
        </div>
        <Link
          href={`/portal/units/${listing.id}`}
          className="btn btn-neutral mt-5 w-full gap-2"
        >
          View unit details
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function LoadingListings() {
  return (
    <div
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading featured units"
    >
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70"
        >
          <div className="skeleton h-48 w-full rounded-none" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-7 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FutureTenantLanding() {
  const {
    items: properties,
    loading,
    error,
    refresh,
  } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [filters, setFilters] = useState({ location: "", type: "all" });

  const liveListings = useMemo(() => toListings(properties), [properties]);
  const sourceListings = liveListings.length ? liveListings : SAMPLE_LISTINGS;
  const filteredListings = useMemo(() => {
    const query = filters.location.trim().toLowerCase();
    return sourceListings.filter((listing) => {
      const locationMatches =
        !query ||
        `${listing.name} ${listing.address}`.toLowerCase().includes(query);
      const typeMatches =
        filters.type === "all" ||
        listing.type.toLowerCase() === filters.type;
      return locationMatches && typeMatches;
    });
  }, [filters, sourceListings]);

  function searchListings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ location, type: propertyType });
    document
      .getElementById("featured-units")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearSearch() {
    setLocation("");
    setPropertyType("all");
    setFilters({ location: "", type: "all" });
  }

  return (
    <div className="space-y-20 pb-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[var(--harbor-ink)] px-6 py-14 text-[var(--harbor-sand)] shadow-2xl sm:px-10 lg:px-14 lg:py-20">
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_78%_18%,rgba(31,122,140,.8),transparent_30%),radial-gradient(circle_at_15%_95%,rgba(240,194,122,.3),transparent_34%)]" />
        <div className="relative max-w-3xl">
          <span className="badge border-white/20 bg-white/10 px-4 py-3 text-[var(--harbor-sand)]">
            Leasing with Harborline
          </span>
          <h1 className="mt-6 font-display text-5xl leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            Find Your Next Home
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            Explore thoughtfully managed spaces, schedule a personal tour, and
            move from discovery to application with one clear process.
          </p>
        </div>

        <form
          onSubmit={searchListings}
          className="relative mt-9 grid gap-3 rounded-2xl border border-white/15 bg-white/95 p-3 text-[var(--harbor-ink)] shadow-xl md:grid-cols-[1.35fr_1fr_auto]"
          aria-label="Search available Harborline units"
        >
          <label className="input input-bordered flex w-full items-center gap-2 bg-white">
            <MapPin className="h-4 w-4 text-[var(--harbor-mid)]" />
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="grow"
              placeholder="Neighborhood, city, or property"
              aria-label="Location"
            />
          </label>
          <select
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
            className="select select-bordered w-full bg-white"
            aria-label="Property type"
          >
            <option value="all">All property types</option>
            <option value="multifamily">Multifamily</option>
            <option value="mixed-use">Mixed-use</option>
            <option value="office">Office</option>
            <option value="retail">Retail</option>
          </select>
          <button type="submit" className="btn btn-neutral gap-2 px-7">
            <Search className="h-4 w-4" />
            Search homes
          </button>
        </form>
        <div className="relative mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/65">
          {["Clear application steps", "Flexible tour requests", "Direct leasing support"].map(
            (item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--harbor-glow)]" />
                {item}
              </span>
            )
          )}
        </div>
      </section>

      <section id="featured-units" className="scroll-mt-36 space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-mid)]">
              Featured availability
            </p>
            <h2 className="mt-2 font-display text-4xl">Spaces worth seeing</h2>
            <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
              Compare locations, features, and availability before scheduling
              your visit.
            </p>
          </div>
          <Link href="/portal/units" className="btn btn-outline gap-2">
            See all units
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingListings />
        ) : (
          <>
            {error ? (
              <div className="alert border-error/20 bg-error/10 text-[var(--harbor-ink)]">
                <AlertCircle className="h-5 w-5 text-error" />
                <div className="flex-1">
                  <p className="font-semibold">
                    Live availability is temporarily unavailable.
                  </p>
                  <p className="text-sm opacity-70">
                    Showing replaceable sample listings while we reconnect.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="btn btn-sm btn-outline gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            ) : null}

            {!error && liveListings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 p-5 text-sm text-[var(--harbor-ink)]/70">
                <p className="font-semibold text-[var(--harbor-ink)]">
                  No live listings have been published yet.
                </p>
                <p className="mt-1">
                  Explore the sample spaces below or contact leasing for
                  upcoming availability.
                </p>
              </div>
            ) : null}

            {filteredListings.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredListings.slice(0, 3).map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 px-6 py-14 text-center">
                <Search className="mx-auto h-9 w-9 text-[var(--harbor-mid)]" />
                <h3 className="mt-4 font-display text-2xl">No matching spaces</h3>
                <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
                  Try a broader location or another property type.
                </p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm mt-5"
                  onClick={clearSearch}
                >
                  Clear search
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-[2rem] border border-[var(--harbor-deep)]/10 bg-white/65 px-6 py-10 sm:px-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-mid)]">
            Harborline living
          </p>
          <h2 className="mt-2 font-display text-4xl">
            Comfort, backed by a capable team
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AMENITIES.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl bg-[var(--harbor-sand)]/70 p-5"
            >
              <span className="inline-flex rounded-xl bg-[var(--harbor-ink)] p-2.5 text-[var(--harbor-sand)]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--harbor-ink)]/60">
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-mid)]">
            A clear path forward
          </p>
          <h2 className="mt-2 font-display text-4xl">
            From first look to front door
          </h2>
          <p className="mt-3 text-[var(--harbor-ink)]/65">
            Your portal keeps each leasing step organized, visible, and easy to
            continue.
          </p>
          <Link href="/portal/apply" className="btn btn-neutral mt-6 gap-2">
            Start an application
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map(([number, title, text]) => (
            <li
              key={number}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5"
            >
              <span className="font-display text-3xl text-[var(--harbor-mid)]">
                {number}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--harbor-ink)]/60">
                {text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] bg-[var(--harbor-deep)] px-6 py-10 text-[var(--harbor-sand)] sm:px-10">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <CalendarDays className="h-8 w-8 text-[var(--harbor-glow)]" />
            <h2 className="mt-4 font-display text-4xl">
              See the space for yourself
            </h2>
            <p className="mt-3 text-white/70">
              Tell us what you want to see and when you are available. A
              leasing specialist will confirm the details.
            </p>
          </div>
          <Link
            href="/portal/tours"
            className="btn bg-[var(--harbor-sand)] text-[var(--harbor-ink)] hover:bg-white"
          >
            Schedule a tour
          </Link>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-mid)]">
            Frequently asked questions
          </p>
          <h2 className="mt-2 font-display text-4xl">Before you apply</h2>
          <p className="mt-3 text-[var(--harbor-ink)]/65">
            Quick answers for planning your search and application.
          </p>
        </div>
        <div className="space-y-3">
          {FAQS.map(([question, answer], index) => (
            <details
              key={question}
              className="group rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5"
              open={index === 0}
            >
              <summary className="cursor-pointer list-none font-semibold">
                <span className="flex items-center justify-between gap-4">
                  {question}
                  <span className="text-xl text-[var(--harbor-mid)] group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 pr-8 text-sm leading-6 text-[var(--harbor-ink)]/65">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--harbor-deep)]/10 bg-[linear-gradient(135deg,#ffffff_0%,#d7eef2_100%)] p-8 text-center sm:p-12">
        <Home className="mx-auto h-9 w-9 text-[var(--harbor-mid)]" />
        <h2 className="mt-4 font-display text-4xl">
          Still deciding what fits?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[var(--harbor-ink)]/65">
          Share your timing, location, and space needs. Harborline leasing can
          help narrow the options and explain what comes next.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/portal/messages" className="btn btn-neutral gap-2">
            <MessageCircle className="h-4 w-4" />
            Contact leasing
          </Link>
          <Link href="/portal/applications" className="btn btn-outline gap-2">
            <FileCheck2 className="h-4 w-4" />
            Check application status
          </Link>
        </div>
      </section>
    </div>
  );
}
