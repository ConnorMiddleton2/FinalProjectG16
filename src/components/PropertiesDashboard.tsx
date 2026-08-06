"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  FilePlus2,
  LogOut,
} from "lucide-react";
import {
  AcquireManagementContractForm,
  useSavedContracts,
} from "@/components/AcquireManagementContractForm";
import { PropertyDetailView } from "@/components/PropertyDetailView";
import { PortfolioCompositionChart } from "@/components/PortfolioCompositionChart";
import { teamLogout } from "@/app/team/actions";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  formatMetricCurrency,
  formatPropertyAddress,
  LOW_OCCUPANCY_THRESHOLD,
  type ManagementContractDraft,
  type PropertyType,
} from "@/lib/management-contract";
import {
  buildPortfolioInsights,
  leaseRiskBuckets,
} from "@/lib/portfolio-insights";
import {
  formatLiveOccupancy,
  buildLivePortfolioMetrics,
  LIVE_TENANT_OCCUPANCY_HELPER,
  VACANT_UNITS_HELPER,
} from "@/lib/property-live-metrics";
import {
  getMonthlyRent,
  getOutstandingBalance,
  type TenantRecord,
} from "@/lib/tenants";
import type { RentalReceivable } from "@/lib/rental-receivables";

type Props = {
  pendingApplicationCount: number;
};

type Filters = {
  search: string;
  propertyType: PropertyType | "all";
  lowOccupancy: boolean;
  hasAr: boolean;
};

type SortKey = "name" | "occupancy" | "rentRoll" | "ar" | "vacant";

type SortDir = "asc" | "desc";

const defaultFilters: Filters = {
  search: "",
  propertyType: "all",
  lowOccupancy: false,
  hasAr: false,
};

const PROPERTY_TYPES: PropertyType[] = [
  "office",
  "retail",
  "industrial",
  "mixed-use",
  "multifamily",
  "other",
];

function SummaryCard({
  label,
  value,
  hint,
  emphasize = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm ${
        emphasize ? "px-4 py-4 sm:col-span-2 lg:col-span-1" : "px-3 py-3"
      }`}
      title={hint}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`uppercase tracking-wide opacity-55 ${
            emphasize ? "text-xs" : "text-[10px]"
          }`}
        >
          {label}
        </p>
        {hint && (
          <span
            className="tooltip tooltip-left text-[10px] font-semibold opacity-45"
            data-tip={hint}
          >
            ?
          </span>
        )}
      </div>
      <p
        className={`mt-1 font-semibold text-[var(--harbor-ink)] ${
          emphasize ? "text-2xl" : "text-lg"
        } ${value === "Not entered" ? "italic opacity-55" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function SortSelect({
  sortKey,
  sortDir,
  onChange,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onChange: (key: SortKey, dir: SortDir) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        className="select select-bordered select-sm bg-white"
        value={sortKey}
        onChange={(e) => onChange(e.target.value as SortKey, sortDir)}
        aria-label="Sort properties by"
      >
        <option value="name">Sort: property name</option>
        <option value="occupancy">Sort: live occupancy</option>
        <option value="vacant">Sort: vacant units</option>
        <option value="rentRoll">Sort: monthly rent roll</option>
        <option value="ar">Sort: outstanding A/R</option>
      </select>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onChange(sortKey, sortDir === "asc" ? "desc" : "asc")}
      >
        {sortDir === "asc" ? "Ascending" : "Descending"}
      </button>
    </div>
  );
}

function ComparisonBars({
  title,
  hint,
  rows,
  formatValue,
  tone = "mid",
}: {
  title: string;
  hint?: string;
  rows: { id: string; label: string; value: number }[];
  formatValue: (n: number) => string;
  tone?: "mid" | "warn" | "danger";
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const barClass =
    tone === "danger"
      ? "bg-red-500/80"
      : tone === "warn"
        ? "bg-amber-500/80"
        : "bg-[var(--harbor-mid)]";

  return (
    <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]">
          {title}
        </p>
        {hint && (
          <span
            className="tooltip tooltip-left text-[10px] font-semibold opacity-45"
            data-tip={hint}
          >
            ?
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs opacity-60">No properties to compare.</p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {rows.map((r) => {
            const display = formatValue(r.value);
            return (
              <li key={r.id}>
                <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-medium text-[var(--harbor-ink)]">
                    {r.label}
                  </span>
                  <span
                    className={`shrink-0 opacity-70 ${
                      display === "Not entered" ? "italic" : ""
                    }`}
                  >
                    {display}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-base-200">
                  <div
                    className={`h-full rounded-full ${barClass}`}
                    style={{
                      width: `${
                        r.value > 0 ? Math.max((r.value / max) * 100, 3) : 0
                      }%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PropertiesDashboard({ pendingApplicationCount }: Props) {
  const [mode, setMode] = useState<"list" | "acquire" | "detail">("list");
  const { contracts, refresh, loading, error } = useSavedContracts();
  const { items: masterTenants } = useSharedCollection<TenantRecord>(
    COLLECTIONS.tenants
  );
  const { items: receivables } = useSharedCollection<RentalReceivable>(
    COLLECTIONS.rentalReceivables
  );
  const [justSaved, setJustSaved] = useState<ManagementContractDraft | null>(
    null
  );
  const [selected, setSelected] = useState<ManagementContractDraft | null>(
    null
  );
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const live = useMemo(
    () => buildLivePortfolioMetrics(contracts, masterTenants, receivables),
    [contracts, masterTenants, receivables]
  );

  const portfolio = useMemo(
    () => ({
      totalProperties: contracts.length,
      totalUnits: live.totalUnits,
      currentTenants: live.currentTenants,
      occupiedUnits: live.occupiedUnits,
      vacantUnits: live.vacantUnits,
      liveOccupancyPercent: live.liveOccupancyPercent,
      monthlyRentRoll: live.monthlyRentRoll,
      outstandingAr: live.outstandingAr,
    }),
    [contracts.length, live]
  );

  const insights = useMemo(
    () => buildPortfolioInsights(contracts, masterTenants, live),
    [contracts, masterTenants, live]
  );

  const leaseRisk = useMemo(
    () => leaseRiskBuckets(masterTenants),
    [masterTenants]
  );

  const extras = useMemo(() => {
    const byProperty = new Map<string, number>();
    for (const t of masterTenants) {
      const key = t.propertyLeased || "Unassigned";
      byProperty.set(key, (byProperty.get(key) ?? 0) + 1);
    }
    const concentration = Array.from(byProperty.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const highestRent = [...masterTenants].sort(
      (a, b) => getMonthlyRent(b) - getMonthlyRent(a)
    )[0];
    const largestBalance = [...masterTenants].sort(
      (a, b) => getOutstandingBalance(b) - getOutstandingBalance(a)
    )[0];
    return { concentration, highestRent, largestBalance };
  }, [masterTenants]);

  function openProperty(id: string) {
    const found = contracts.find((c) => c.id === id);
    if (!found) return;
    setSelected(found);
    setMode("detail");
  }

  const filteredContracts = useMemo(() => {
    const rows = contracts.filter((c) => {
      if (filters.propertyType !== "all" && c.propertyType !== filters.propertyType) {
        return false;
      }
      if (filters.lowOccupancy) {
        const liveOcc = live.byPropertyId[c.id]?.liveOccupancyPercent;
        if (
          !(
            liveOcc != null &&
            liveOcc > 0 &&
            liveOcc < LOW_OCCUPANCY_THRESHOLD
          )
        ) {
          return false;
        }
      }
      if (filters.hasAr) {
        const ar = live.byPropertyId[c.id]?.outstandingAr ?? 0;
        if (ar <= 0) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = `${c.propertyName} ${formatPropertyAddress(c)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.propertyName.localeCompare(b.propertyName) * dir;
        case "occupancy": {
          const ao = live.byPropertyId[a.id]?.liveOccupancyPercent ?? -1;
          const bo = live.byPropertyId[b.id]?.liveOccupancyPercent ?? -1;
          return (ao - bo) * dir;
        }
        case "rentRoll": {
          const ae = live.byPropertyId[a.id]?.monthlyRentRoll ?? 0;
          const be = live.byPropertyId[b.id]?.monthlyRentRoll ?? 0;
          return (ae - be) * dir;
        }
        case "vacant": {
          const ae = live.byPropertyId[a.id]?.vacantUnits ?? 0;
          const be = live.byPropertyId[b.id]?.vacantUnits ?? 0;
          return (ae - be) * dir;
        }
        case "ar": {
          const ae = live.byPropertyId[a.id]?.outstandingAr ?? 0;
          const be = live.byPropertyId[b.id]?.outstandingAr ?? 0;
          return (ae - be) * dir;
        }
        default:
          return 0;
      }
    });
    return rows;
  }, [contracts, filters, sortKey, sortDir, live]);

  const comparisonSource =
    filteredContracts.length > 0 ? filteredContracts : contracts;

  const occupancyBars = comparisonSource.map((c) => ({
    id: c.id,
    label: c.propertyName || "Untitled",
    value: live.byPropertyId[c.id]?.liveOccupancyPercent ?? 0,
  }));
  const vacantBars = comparisonSource.map((c) => ({
    id: c.id,
    label: c.propertyName || "Untitled",
    value: live.byPropertyId[c.id]?.vacantUnits ?? 0,
  }));
  const rentBars = comparisonSource.map((c) => ({
    id: c.id,
    label: c.propertyName || "Untitled",
    value: live.byPropertyId[c.id]?.monthlyRentRoll ?? 0,
  }));
  const arBars = comparisonSource.map((c) => ({
    id: c.id,
    label: c.propertyName || "Untitled",
    value: live.byPropertyId[c.id]?.outstandingAr ?? 0,
  }));

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Properties</p>
          </div>
          <form action={teamLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        {mode !== "detail" && (
          <Link
            href="/ops"
            className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to operations
          </Link>
        )}

        {mode === "detail" && selected ? (
          <PropertyDetailView
            contract={selected}
            onBack={() => {
              setSelected(null);
              setMode("list");
            }}
          />
        ) : mode === "list" ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
                  Properties
                </h1>
                <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
                  Portfolio analytics for managed assets — open any property for
                  contract, operations, and roster detail.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/ops/properties/applications"
                  className="btn btn-outline gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  Pending applications
                  <span className="badge badge-neutral">
                    {pendingApplicationCount}
                  </span>
                </Link>
                <button
                  type="button"
                  className="btn btn-neutral gap-2"
                  onClick={() => {
                    setJustSaved(null);
                    setMode("acquire");
                  }}
                >
                  <FilePlus2 className="h-4 w-4" />
                  Acquire new management contract
                </button>
              </div>
            </div>

            {justSaved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Saved <strong>{justSaved.propertyName}</strong> to the shared team
                database — classmates will see it after refresh.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-6 py-16 text-center text-sm opacity-70">
                Loading shared properties…
              </div>
            ) : contracts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-6 py-16 text-center">
                <Building2 className="mx-auto h-8 w-8 text-[var(--harbor-mid)] opacity-70" />
                <p className="mt-3 font-medium text-[var(--harbor-ink)]">
                  No managed assets yet
                </p>
                <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                  Start with Acquire new management contract to capture a full
                  asset intake package.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/70">
                      Portfolio snapshot
                    </h2>
                    <p className="text-xs text-[var(--harbor-ink)]/50">
                      Live tenant, occupancy, rent roll, and A/R metrics use
                      current tenant assignments and linked receivables. Hover
                      “?” for definitions.
                    </p>
                  </div>
                  <p className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 px-4 py-3 text-sm text-[var(--harbor-ink)]/70">
                    {LIVE_TENANT_OCCUPANCY_HELPER} {VACANT_UNITS_HELPER} Monthly
                    rent roll sums linked current-tenant monthly rent.
                    Outstanding A/R sums open receivable balances for linked
                    tenants. Specific vacant suite numbers are not listed unless
                    a complete unit roster is connected.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                      label="Managed properties"
                      value={String(portfolio.totalProperties)}
                      emphasize
                    />
                    <SummaryCard
                      label="Total units"
                      value={
                        portfolio.totalUnits > 0
                          ? String(portfolio.totalUnits)
                          : "—"
                      }
                      hint="Sum of units/suites on each managed property."
                    />
                    <SummaryCard
                      label="Current tenants"
                      value={String(portfolio.currentTenants)}
                      hint="Same current-tenant predicate as the Tenant master list."
                    />
                    <SummaryCard
                      label="Occupied units"
                      value={String(portfolio.occupiedUnits)}
                      hint="Distinct current tenant property + unit assignments."
                    />
                    <SummaryCard
                      label="Vacant units"
                      value={String(portfolio.vacantUnits)}
                      hint={VACANT_UNITS_HELPER}
                    />
                    <SummaryCard
                      label="Live occupancy"
                      value={
                        portfolio.liveOccupancyPercent != null
                          ? `${portfolio.liveOccupancyPercent.toFixed(0)}%`
                          : "—"
                      }
                      hint="Occupied units ÷ total units."
                    />
                    <SummaryCard
                      label="Monthly rent roll"
                      value={formatMetricCurrency(
                        portfolio.monthlyRentRoll,
                        "$0"
                      )}
                      hint="Sum of monthly rent for uniquely linked current tenants."
                    />
                    <SummaryCard
                      label="Outstanding A/R"
                      value={formatMetricCurrency(
                        portfolio.outstandingAr,
                        "$0"
                      )}
                      hint="Open receivable balances for uniquely linked tenants."
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm">
                  <p className="mb-3 text-sm font-medium text-[var(--harbor-ink)]">
                    Filter & sort portfolio
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <input
                      type="search"
                      className="input input-bordered input-sm w-full bg-white"
                      placeholder="Search name or address"
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, search: e.target.value }))
                      }
                    />
                    <select
                      className="select select-bordered select-sm w-full bg-white"
                      value={filters.propertyType}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          propertyType: e.target.value as Filters["propertyType"],
                        }))
                      }
                    >
                      <option value="all">All property types</option>
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t} className="capitalize">
                          {t}
                        </option>
                      ))}
                    </select>
                    <SortSelect
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onChange={(key, dir) => {
                        setSortKey(key);
                        setSortDir(dir);
                      }}
                    />
                    <label className="flex items-center gap-2 rounded-lg border border-base-300 bg-white px-3 text-sm">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={filters.lowOccupancy}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            lowOccupancy: e.target.checked,
                          }))
                        }
                      />
                      Low occupancy (&lt; {LOW_OCCUPANCY_THRESHOLD}%)
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-base-300 bg-white px-3 text-sm">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={filters.hasAr}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            hasAr: e.target.checked,
                          }))
                        }
                      />
                      Has outstanding AR
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setFilters(defaultFilters);
                        setSortKey("name");
                        setSortDir("asc");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <PortfolioCompositionChart
                    contracts={filteredContracts.length > 0 ? filteredContracts : contracts}
                    live={live}
                    onSelectProperty={openProperty}
                  />
                  <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/70">
                      Portfolio insights
                    </h2>
                    <p className="mb-3 text-xs text-[var(--harbor-ink)]/50">
                      Occupancy, vacancy, rent roll, and A/R insights use live
                      tenant and receivable assignments.
                    </p>
                    <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {insights.map((insight) => (
                        <li key={insight.id}>
                          {insight.propertyId ? (
                            <button
                              type="button"
                              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 ${
                                insight.tone === "danger"
                                  ? "border-red-200 bg-red-50"
                                  : insight.tone === "warn"
                                    ? "border-amber-200 bg-amber-50"
                                    : "border-base-200 bg-base-100"
                              }`}
                              onClick={() => openProperty(insight.propertyId!)}
                            >
                              {insight.text}
                            </button>
                          ) : (
                            <div
                              className={`rounded-lg border px-3 py-2 text-sm ${
                                insight.tone === "danger"
                                  ? "border-red-200 bg-red-50"
                                  : insight.tone === "warn"
                                    ? "border-amber-200 bg-amber-50"
                                    : "border-base-200 bg-base-100"
                              }`}
                            >
                              {insight.text}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-base-100 px-2 py-2" title="Leases ending within 90 days">
                        <p className="opacity-55">≤90d</p>
                        <p className="text-lg font-semibold">{leaseRisk.within90}</p>
                      </div>
                      <div className="rounded-lg bg-base-100 px-2 py-2" title="Leases ending within 180 days">
                        <p className="opacity-55">≤180d</p>
                        <p className="text-lg font-semibold">{leaseRisk.within180}</p>
                      </div>
                      <div className="rounded-lg bg-base-100 px-2 py-2" title="Leases ending within 365 days">
                        <p className="opacity-55">≤365d</p>
                        <p className="text-lg font-semibold">{leaseRisk.within365}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-[var(--harbor-ink)]/65">
                      {extras.concentration[0] && (
                        <p>
                          Tenant concentration: {extras.concentration[0][0]} has{" "}
                          {extras.concentration[0][1]} master-list tenants.
                        </p>
                      )}
                      {extras.highestRent && getMonthlyRent(extras.highestRent) > 0 && (
                        <p>
                          Highest rent tenant: {extras.highestRent.name} ($
                          {getMonthlyRent(extras.highestRent).toLocaleString()}
                          /mo).
                        </p>
                      )}
                      {extras.largestBalance &&
                        getOutstandingBalance(extras.largestBalance) > 0 && (
                          <p>
                            Largest outstanding balance:{" "}
                            {extras.largestBalance.name} ($
                            {getOutstandingBalance(
                              extras.largestBalance
                            ).toLocaleString()}
                            ).
                          </p>
                        )}
                    </div>
                  </section>
                </div>

                <div className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/70">
                    Compare properties
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    <ComparisonBars
                      title="Live occupancy"
                      hint="Occupied units ÷ total units from current tenant assignments."
                      rows={occupancyBars}
                      formatValue={(n) =>
                        n > 0 ? `${n.toFixed(0)}%` : "—"
                      }
                    />
                    <ComparisonBars
                      title="Vacant units"
                      hint={VACANT_UNITS_HELPER}
                      rows={vacantBars}
                      formatValue={(n) => String(n)}
                    />
                    <ComparisonBars
                      title="Monthly rent roll"
                      hint="Sum of monthly rent for uniquely linked current tenants."
                      rows={rentBars}
                      formatValue={(n) => formatMetricCurrency(n, "$0")}
                    />
                    <ComparisonBars
                      title="Outstanding A/R"
                      hint="Open receivable balances for uniquely linked tenants."
                      rows={arBars}
                      formatValue={(n) => formatMetricCurrency(n, "$0")}
                      tone="danger"
                    />
                  </div>
                </div>

                {filteredContracts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-6 py-12 text-center text-sm opacity-70">
                    No properties match these filters. Clear filters to see the
                    full portfolio.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredContracts.map((c) => {
                      const liveProp = live.byPropertyId[c.id];
                      const currentTenants = liveProp?.currentTenants ?? 0;
                      const occupiedUnits = liveProp?.occupiedUnits ?? 0;
                      const vacantUnits = liveProp?.vacantUnits ?? 0;
                      const totalUnits = liveProp?.totalUnits ?? 0;
                      const liveOcc = liveProp?.liveOccupancyPercent ?? null;
                      const rent = liveProp?.monthlyRentRoll ?? 0;
                      const ar = liveProp?.outstandingAr ?? 0;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelected(c);
                            setMode("detail");
                          }}
                          className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]"
                        >
                          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                            {c.propertyName || "Untitled property"}
                          </h2>
                          <p className="mt-1 text-sm opacity-70">
                            {formatPropertyAddress(c) || "No address"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="badge badge-outline capitalize">
                              {c.propertyType}
                            </span>
                            <span className="badge badge-ghost">
                              {totalUnits > 0 ? totalUnits : "—"} total units
                            </span>
                            <span className="badge badge-ghost">
                              {currentTenants} current tenant
                              {currentTenants === 1 ? "" : "s"}
                            </span>
                            <span className="badge badge-ghost">
                              {occupiedUnits} occupied
                            </span>
                            <span className="badge badge-ghost">
                              {vacantUnits} vacant
                            </span>
                            <span className="badge badge-ghost">
                              Live occupancy{" "}
                              {formatLiveOccupancy(occupiedUnits, totalUnits)}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div title="Sum of monthly rent for uniquely linked current tenants">
                              <p className="opacity-55">Monthly rent roll</p>
                              <p className="font-semibold text-[var(--harbor-ink)]">
                                {formatMetricCurrency(rent, "$0")}
                              </p>
                            </div>
                            <div title="Open receivable balances for uniquely linked tenants">
                              <p className="opacity-55">Outstanding A/R</p>
                              <p
                                className={`font-semibold ${
                                  ar > 0
                                    ? "text-red-700"
                                    : "text-[var(--harbor-ink)]"
                                }`}
                              >
                                {formatMetricCurrency(ar, "$0")}
                              </p>
                            </div>
                          </div>
                          {liveOcc != null && (
                            <div className="mt-3">
                              <div className="mb-1 flex justify-between text-[10px] opacity-60">
                                <span>Live occupancy</span>
                                <span>{liveOcc.toFixed(0)}%</span>
                              </div>
                              <progress
                                className="progress progress-info w-full"
                                value={Math.min(100, Math.max(0, liveOcc))}
                                max={100}
                              />
                            </div>
                          )}
                          <p className="mt-3 text-sm font-medium text-[var(--harbor-mid)]">
                            Open full property details →
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <AcquireManagementContractForm
            onCancel={() => setMode("list")}
            onSaved={(draft) => {
              setJustSaved(draft);
              void refresh();
              setMode("list");
            }}
          />
        )}
      </main>
    </div>
  );
}
