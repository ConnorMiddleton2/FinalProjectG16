"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Search,
} from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  PORTAL_APPLY_PATH,
  PORTAL_LOGIN_PATH,
  PORTAL_HOME_PATH,
} from "@/lib/portal/auth";

const TYPE_BLURBS: Record<string, string> = {
  multifamily: "Apartments & residential communities",
  office: "Professional office suites",
  retail: "Street-front & center retail",
  industrial: "Warehouse & flex industrial",
  "mixed-use": "Live / work / shop destinations",
  other: "Specialty commercial",
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

/**
 * Public leasing browse — properties under Harborline management with inquire CTAs.
 */
export function PortalPropertyBrowse() {
  const { items: properties, loading } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

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

  const types = useMemo(() => {
    const set = new Set(
      properties.map((p) => p.propertyType).filter(Boolean) as string[]
    );
    return ["all", ...Array.from(set).sort()];
  }, [properties]);

  const loginHref = `${PORTAL_LOGIN_PATH}?next=${encodeURIComponent(PORTAL_HOME_PATH)}`;

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 15% 0%, rgba(31,122,140,0.2), transparent 50%), radial-gradient(ellipse 55% 45% at 95% 70%, rgba(240,194,122,0.16), transparent 45%), linear-gradient(165deg, #f7f3ea 0%, #dceef1 50%, #0f3d46 100%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--harbor-ink)]/75 hover:text-[var(--harbor-ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Harborline
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

        <header className="mt-10 max-w-2xl">
          <p className="font-display text-5xl tracking-tight text-[var(--harbor-ink)] sm:text-6xl">
            Harborline
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-snug text-[var(--harbor-deep)] sm:text-3xl">
            Find your next space
          </h1>
          <p className="mt-3 text-base text-[var(--harbor-ink)]/70 sm:text-lg">
            Browse communities and commercial assets under Harborline management.
            Inquire on any property to start an application with Sales &amp;
            Marketing.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
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
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-sm opacity-60">
            No properties match these filters yet.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const inquireHref = `${PORTAL_APPLY_PATH}?property=${encodeURIComponent(p.id)}&name=${encodeURIComponent(p.propertyName)}`;
              return (
                <article
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 shadow-sm"
                >
                  <div
                    className="relative h-40 w-full"
                    style={{
                      background: `linear-gradient(145deg, #134e5a 0%, #1f7a8c 45%, #f0c27a 160%)`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-end p-4">
                      <Building2 className="h-10 w-10 text-white/80" />
                    </div>
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold capitalize text-[var(--harbor-ink)]">
                      {p.propertyType || "commercial"}
                    </span>
                  </div>
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
                        "Harborline managed asset"}
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      <li>
                        <span className="opacity-55">Size · </span>
                        {sizeHint(p)}
                      </li>
                      <li>
                        <span className="opacity-55">Occupancy · </span>
                        {p.occupancyPercent
                          ? `${p.occupancyPercent}%`
                          : "See availability"}
                      </li>
                      <li>
                        <span className="opacity-55">Starting · </span>
                        {startingRentHint(p)}
                      </li>
                      {p.amenities ? (
                        <li className="line-clamp-2 text-xs opacity-70">
                          {p.amenities}
                        </li>
                      ) : null}
                    </ul>
                    <div className="mt-auto pt-3">
                      <Link
                        href={inquireHref}
                        className="btn btn-neutral btn-sm w-full"
                      >
                        Inquire more
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
