"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Car,
  Layers,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  PORTAL_APPLY_PATH,
  TENANT_PORTAL_LOGIN_PATH,
  PORTAL_HOME_PATH,
} from "@/lib/portal/auth";
import {
  COMING_SOON_PROPERTIES,
  type ComingSoonProperty,
} from "@/lib/portal/coming-soon-properties";
import { portalPropertyImageUrl } from "@/lib/portal/property-images";

const TYPE_BLURBS: Record<string, string> = {
  multifamily: "Apartments & residential communities",
  office: "Professional office suites",
  retail: "Street-front & center retail",
  industrial: "Warehouse & flex industrial",
  "mixed-use": "Live / work / shop destinations",
  other: "Specialty commercial",
};

const TYPE_GRADIENTS: Record<string, string> = {
  multifamily:
    "linear-gradient(145deg, #0F3D3E 0%, #0D9488 55%, #5eead4 100%)",
  office: "linear-gradient(145deg, #0F3D3E 0%, #0f766e 55%, #99f6e4 120%)",
  retail: "linear-gradient(160deg, #0F3D3E 0%, #0D9488 70%, #f8fafc 160%)",
  industrial: "linear-gradient(145deg, #0F3D3E 0%, #334155 55%, #94a3b8 120%)",
  "mixed-use":
    "linear-gradient(150deg, #0F3D3E 0%, #0D9488 45%, #ccfbf1 130%)",
  other: "linear-gradient(145deg, #0F3D3E 0%, #0D9488 50%, #e2e8f0 160%)",
};

function startingRentHint(p: ManagementContractDraft): string {
  const roll = Number(p.monthlyRentRoll) || 0;
  const units = Number(p.unitsSuites) || 0;
  if (roll > 0 && units > 0) {
    const avg = Math.round(roll / units);
    return `From ~$${avg.toLocaleString()}/mo`;
  }
  if (roll > 0) return `Rent roll $${roll.toLocaleString()}/mo`;
  return "Inquire for pricing";
}

function sizeHint(p: ManagementContractDraft): string {
  const sf = p.rentableSf || p.grossSf;
  if (sf) return `${Number(sf).toLocaleString()} SF`;
  if (p.unitsSuites) return `${p.unitsSuites} units / suites`;
  return "Size on request";
}

function roomTypeHints(p: ManagementContractDraft): string[] {
  const type = (p.propertyType || "other").toLowerCase();
  const amenities = (p.amenities || "").toLowerCase();
  const rooms: string[] = [];

  if (type === "multifamily" || type === "mixed-use") {
    rooms.push("Studio", "1 bedroom", "2 bedroom");
    if (amenities.includes("3") || Number(p.unitsSuites) > 40) {
      rooms.push("3 bedroom");
    }
  } else if (type === "office") {
    rooms.push("Private office", "Open suite", "Conference-ready");
  } else if (type === "retail") {
    rooms.push("Street-front bay", "Inline suite", "Corner unit");
  } else if (type === "industrial") {
    rooms.push("Warehouse bay", "Flex office", "Dock-high");
  } else {
    rooms.push("Flexible layout", "Custom suite");
  }

  if (amenities.includes("loft")) rooms.unshift("Loft");
  if (amenities.includes("penthouse")) rooms.push("Penthouse");
  return [...new Set(rooms)].slice(0, 4);
}

function optionHints(p: ManagementContractDraft): string[] {
  const opts: string[] = [];
  const amenities = (p.amenities || "").toLowerCase();
  if (p.parkingSpaces) opts.push(`Parking (${p.parkingSpaces})`);
  if (amenities.includes("pet")) opts.push("Pet friendly");
  if (amenities.includes("gym") || amenities.includes("fitness")) {
    opts.push("Fitness");
  }
  if (amenities.includes("laundry")) opts.push("Laundry");
  if (amenities.includes("wifi") || amenities.includes("internet")) {
    opts.push("Internet ready");
  }
  if (amenities.includes("elevator")) opts.push("Elevator");
  if (p.floors) opts.push(`${p.floors} floors`);
  if (opts.length === 0 && p.amenities) {
    return p.amenities
      .split(/[,·|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }
  return opts.slice(0, 5);
}

/**
 * Public leasing browse — properties under CPMC management with inquire CTAs.
 */
export function PortalPropertyBrowse() {
  const { items: properties, loading } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<ManagementContractDraft | null>(
    null
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties.filter((p) => {
      if (!p.propertyName) return false;
      if (typeFilter !== "all" && (p.propertyType || "") !== typeFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        p.propertyName,
        p.city,
        p.state,
        p.streetAddress,
        p.propertyType,
        p.amenities,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [properties, query, typeFilter]);

  const comingSoonFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMING_SOON_PROPERTIES.filter((p) => {
      if (typeFilter !== "all" && p.propertyType !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        p.propertyName,
        p.city,
        p.state,
        p.streetAddress,
        p.propertyType,
        p.blurb,
        "joining us soon",
        String(p.availableYear),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, typeFilter]);

  const types = useMemo(() => {
    const set = new Set(
      [
        ...properties.map((p) => p.propertyType),
        ...COMING_SOON_PROPERTIES.map((p) => p.propertyType),
      ].filter(Boolean) as string[]
    );
    return ["all", ...Array.from(set).sort()];
  }, [properties]);

  const selectedPhoto = selected
    ? portalPropertyImageUrl(selected.propertyName)
    : null;

  const loginHref = `${TENANT_PORTAL_LOGIN_PATH}?next=${encodeURIComponent(PORTAL_HOME_PATH)}`;

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 15% 0%, rgba(13,148,136,0.12), transparent 50%), radial-gradient(ellipse 55% 45% at 95% 70%, rgba(15,61,62,0.08), transparent 45%), linear-gradient(165deg, #F8FAFC 0%, #F1F5F9 55%, #E2E8F0 100%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--harbor-ink)]/75 hover:text-[var(--harbor-ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
            CPMC
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href={loginHref}
              className="inline-flex min-h-10 items-center rounded-xl border border-[var(--harbor-deep)]/20 bg-white/80 px-4 text-sm font-semibold text-[var(--harbor-ink)] hover:bg-white"
            >
              Sign in
            </Link>
            <Link
              href={PORTAL_APPLY_PATH}
              className="inline-flex min-h-10 items-center rounded-xl bg-[var(--harbor-ink)] px-4 text-sm font-semibold text-[var(--harbor-sand)] hover:bg-[var(--harbor-deep)]"
            >
              Start application
            </Link>
          </div>
        </div>

        <header className="mt-10 max-w-2xl welcome-rise">
          <p className="font-display text-5xl tracking-tight text-[var(--harbor-ink)] sm:text-6xl">
            CPMC
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-snug text-[var(--harbor-deep)] sm:text-3xl">
            Find your next space
          </h1>
          <p className="mt-3 text-base text-[var(--harbor-ink)]/70 sm:text-lg">
            Browse communities and commercial assets under CPMC management.
            See location, size, room types, options, and starting prices — then
            inquire to open an application with Sales &amp; Marketing.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-3 welcome-rise-delay">
          <label className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-45" />
            <input
              className="input input-bordered w-full bg-white/90 pl-10"
              placeholder="Search by name, city, amenities…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            className="select select-bordered bg-white/90"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All property types" : t}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="mt-10 text-sm opacity-60">Loading properties…</p>
        ) : filtered.length === 0 && comingSoonFiltered.length === 0 ? (
          <p className="mt-10 text-sm opacity-60">
            No properties match these filters yet. Start an application for a
            general inquiry — Sales &amp; Marketing will follow up.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, index) => {
              const inquireHref = `${PORTAL_APPLY_PATH}?property=${encodeURIComponent(p.id)}&name=${encodeURIComponent(p.propertyName)}`;
              const rooms = roomTypeHints(p);
              const options = optionHints(p);
              const gradient =
                TYPE_GRADIENTS[p.propertyType || "other"] ||
                TYPE_GRADIENTS.other;
              const photo = portalPropertyImageUrl(p.propertyName);
              return (
                <article
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <button
                    type="button"
                    className="relative h-44 w-full overflow-hidden text-left"
                    style={photo ? undefined : { background: gradient }}
                    onClick={() => setSelected(p)}
                    aria-label={`View details for ${p.propertyName}`}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local public asset, simple card cover
                      <img
                        src={photo}
                        alt={`${p.propertyName} exterior`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2), transparent 35%)",
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--harbor-ink)]/55 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-end justify-between p-4">
                      {photo ? (
                        <span className="max-w-[70%] truncate text-sm font-semibold text-white drop-shadow">
                          {p.propertyName}
                        </span>
                      ) : (
                        <Building2 className="h-10 w-10 text-white/85" />
                      )}
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold capitalize text-[var(--harbor-ink)]">
                        {p.propertyType || "commercial"}
                      </span>
                    </div>
                  </button>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h2 className="text-lg font-semibold leading-snug text-[var(--harbor-ink)]">
                      {p.propertyName}
                    </h2>
                    <p className="flex items-start gap-1.5 text-sm text-[var(--harbor-ink)]/65">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {[p.streetAddress, p.city, p.state, p.zip]
                        .filter(Boolean)
                        .join(", ") || "Address on request"}
                    </p>
                    <p className="text-xs opacity-55">
                      {TYPE_BLURBS[p.propertyType || ""] ||
                        "CPMC managed asset"}
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      <li>
                        <span className="opacity-55">Size · </span>
                        {sizeHint(p)}
                      </li>
                      <li>
                        <span className="opacity-55">Starting · </span>
                        <span className="font-medium text-[var(--harbor-deep)]">
                          {startingRentHint(p)}
                        </span>
                      </li>
                      <li className="flex flex-wrap gap-1 pt-1">
                        {rooms.map((r) => (
                          <span
                            key={r}
                            className="rounded-md bg-[var(--harbor-mist)]/70 px-2 py-0.5 text-[11px] font-medium text-[var(--harbor-ink)]"
                          >
                            {r}
                          </span>
                        ))}
                      </li>
                      {options.length > 0 ? (
                        <li className="line-clamp-2 text-xs opacity-70">
                          {options.join(" · ")}
                        </li>
                      ) : null}
                    </ul>
                    <div className="mt-auto flex gap-2 pt-3">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm flex-1"
                        onClick={() => setSelected(p)}
                      >
                        Details
                      </button>
                      <Link
                        href={inquireHref}
                        className="btn btn-neutral btn-sm flex-[1.4]"
                      >
                        Inquire more
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}

            {comingSoonFiltered.map((p, index) => (
              <ComingSoonPropertyCard
                key={p.id}
                property={p}
                index={filtered.length + index}
              />
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--harbor-ink)]/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="property-detail-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--harbor-sand)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedPhoto ? (
            <div className="relative h-48 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto}
                alt={`${selected.propertyName} exterior`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--harbor-ink)]/70 via-[var(--harbor-ink)]/15 to-transparent" />
              <button
                type="button"
                className="absolute right-3 top-3 rounded-full bg-white/90 p-2"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <p
                  id="property-detail-title"
                  className="font-display text-3xl text-white drop-shadow"
                >
                  {selected.propertyName}
                </p>
                <p className="mt-1 text-sm text-white/85">
                  {[selected.streetAddress, selected.city, selected.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
            ) : (
            <div
              className="relative h-48"
              style={{
                background:
                  TYPE_GRADIENTS[selected.propertyType || "other"] ||
                  TYPE_GRADIENTS.other,
              }}
            >
              <button
                type="button"
                className="absolute right-3 top-3 rounded-full bg-white/90 p-2"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <p
                  id="property-detail-title"
                  className="font-display text-3xl text-white drop-shadow"
                >
                  {selected.propertyName}
                </p>
                <p className="mt-1 text-sm text-white/85">
                  {[selected.streetAddress, selected.city, selected.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
            )}
            <div className="space-y-4 p-5">
              <p className="text-sm text-[var(--harbor-ink)]/75">
                {TYPE_BLURBS[selected.propertyType || ""] ||
                  "CPMC managed property"}
                {selected.yearBuilt
                  ? ` · Built ${selected.yearBuilt}`
                  : ""}
                {selected.yearRenovated
                  ? ` · Renovated ${selected.yearRenovated}`
                  : ""}
              </p>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white/80 p-3">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-55">
                    <Layers className="h-3.5 w-3.5" /> Size
                  </dt>
                  <dd className="mt-1 font-semibold">{sizeHint(selected)}</dd>
                </div>
                <div className="rounded-xl bg-white/80 p-3">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-55">
                    <Sparkles className="h-3.5 w-3.5" /> Starting
                  </dt>
                  <dd className="mt-1 font-semibold text-[var(--harbor-deep)]">
                    {startingRentHint(selected)}
                  </dd>
                </div>
                <div className="rounded-xl bg-white/80 p-3">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-55">
                    <BedDouble className="h-3.5 w-3.5" /> Room types
                  </dt>
                  <dd className="mt-1 text-sm leading-snug">
                    {roomTypeHints(selected).join(", ")}
                  </dd>
                </div>
                <div className="rounded-xl bg-white/80 p-3">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-55">
                    <Car className="h-3.5 w-3.5" /> Parking
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {selected.parkingSpaces || "On request"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white/80 p-3">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-55">
                    <Bath className="h-3.5 w-3.5" /> Units / suites
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {selected.unitsSuites || "See availability"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white/80 p-3">
                  <dt className="text-xs uppercase tracking-wide opacity-55">
                    Occupancy
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {selected.occupancyPercent
                      ? `${selected.occupancyPercent}%`
                      : "Ask S&M"}
                  </dd>
                </div>
              </dl>

              {optionHints(selected).length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
                    Available options
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {optionHints(selected).map((o) => (
                      <span
                        key={o}
                        className="rounded-full border border-[var(--harbor-deep)]/15 bg-white px-3 py-1 text-xs font-medium"
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.amenities ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
                    Amenities &amp; notes
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--harbor-ink)]/80">
                    {selected.amenities}
                  </p>
                </div>
              ) : null}

              <Link
                href={`${PORTAL_APPLY_PATH}?property=${encodeURIComponent(selected.id)}&name=${encodeURIComponent(selected.propertyName)}`}
                className="btn btn-neutral w-full"
              >
                Inquire more
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ComingSoonPropertyCard({
  property: p,
  index,
}: {
  property: ComingSoonProperty;
  index: number;
}) {
  return (
    <article
      className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 shadow-sm grayscale"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      aria-label={`${p.propertyName} — joining us soon, in ${p.availableYear}`}
    >
      <div className="relative h-44 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt={`${p.propertyName} exterior`}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[var(--harbor-ink)]/35" />
        <div className="absolute inset-0 flex items-end justify-between p-4">
          <span className="max-w-[55%] truncate text-sm font-semibold text-white/90 drop-shadow">
            {p.propertyName}
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold capitalize text-[var(--harbor-ink)]/70">
            {p.propertyType}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 opacity-70">
        <h2 className="text-lg font-semibold leading-snug text-[var(--harbor-ink)]">
          {p.propertyName}
        </h2>
        <p className="flex items-start gap-1.5 text-sm text-[var(--harbor-ink)]/65">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {[p.streetAddress, p.city, p.state, p.zip]
            .filter(Boolean)
            .join(", ")}
        </p>
        <p className="text-xs opacity-55">
          {TYPE_BLURBS[p.propertyType] || p.blurb}
        </p>
        <p className="mt-auto rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-[var(--harbor-mist)]/40 px-3 py-2.5 text-center text-sm font-semibold text-[var(--harbor-deep)]">
          Joining us soon, in {p.availableYear}!
        </p>
      </div>
    </article>
  );
}
