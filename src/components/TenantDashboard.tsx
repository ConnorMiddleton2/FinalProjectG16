"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  LogOut,
  PlusCircle,
  Users,
} from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import { useCollectionsCatchUpSync } from "@/hooks/useEnsureManagementAlerts";
import {
  CURRENT_RENT_DUE_HELPER,
  buildTenantCollectionsSnapshot,
  COLLECTIONS_FILTERS,
  matchesCollectionsFilter,
  portfolioCollectionsInsights,
  type CollectionsAccountState,
  type CollectionsFilter,
  type CollectionsNotice,
  type ManagementAlert,
  type TenantCollectionsSnapshot,
} from "@/lib/collections";
import {
  tenantCurrentRentDue,
  tenantRentOverdue,
  type RentalReceivable,
} from "@/lib/rental-receivables";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  ManagedPropertyLink,
  resolveUniqueManagedPropertyId,
} from "@/components/ManagedPropertyLink";
import {
  emptyTenant,
  formatCurrency,
  formatLeaseDate,
  formatOptionalLeaseDate,
  formatOptionalRent,
  getLeaseEnd,
  getLeaseStart,
  getMonthlyRent,
  getOutstandingBalance,
  getPaymentStatus,
  isCurrentTenant,
  isExpiringOccupant,
  isFormerOrExpired,
  isLatePayingCurrent,
  isLeaseExpiringWithinDays,
  leaseStatusOverviewLabel,
  matchesOccupancyFilter,
  MISSING_FIELD_LABEL,
  OCCUPANCY_FILTERS,
  PAYMENT_STATUSES,
  paymentStatusLabel,
  TENANT_CATEGORIES,
  tenantCategoryLabel,
  type OccupancyFilter,
  type PaymentStatus,
  type TenantCategory,
  type TenantRecord,
} from "@/lib/tenants";

type Filters = {
  search: string;
  category: TenantCategory | "all";
  property: string;
  paymentStatus: PaymentStatus | "all";
  occupancy: OccupancyFilter;
  collections: CollectionsFilter;
  /** Current rent due open balance > 0. */
  hasCurrentRentDue: boolean;
};

type SortKey =
  | "name"
  | "property"
  | "monthlyRent"
  | "currentRentDue"
  | "rentOverdue"
  | "daysOverdue";

type SortDir = "asc" | "desc";

const defaultFilters: Filters = {
  search: "",
  category: "all",
  property: "",
  paymentStatus: "all",
  occupancy: "all",
  collections: "all",
  hasCurrentRentDue: false,
};

function stickyCellBg(
  rowTone: "redDark" | "redLight" | "amber" | "neutral"
): string {
  switch (rowTone) {
    case "redDark":
      return "bg-red-200";
    case "redLight":
      return "bg-red-50";
    case "amber":
      return "bg-amber-50";
    default:
      return "bg-white";
  }
}

/**
 * Tenant master-list row tone priority:
 * 1. 90+ days overdue + management review → dark red
 * 2. 1–89 days qualifying overdue → light red
 * 3. Non-overdue warnings (payment plan, lease expiring, etc.) → yellow
 * 4. Otherwise → neutral
 *
 * Based on collections Days overdue / Rent overdue only — never Current rent due alone,
 * disputed amounts, former status, or lease category.
 */
function tenantRowTone(input: {
  daysOverdue: number;
  rentOverdue: number;
  managementReviewRequired: boolean;
  paymentPlan: boolean;
  leaseExpiringSoon: boolean;
  collectionsWarning: boolean;
}): "redDark" | "redLight" | "amber" | "neutral" {
  const overdueDays = input.daysOverdue > 0 ? input.daysOverdue : 0;
  const hasQualifyingOverdue = overdueDays >= 1 && input.rentOverdue > 0;

  if (hasQualifyingOverdue && overdueDays >= 90) {
    return "redDark";
  }
  if (hasQualifyingOverdue && overdueDays < 90) {
    return "redLight";
  }
  if (
    input.paymentPlan ||
    input.leaseExpiringSoon ||
    input.collectionsWarning
  ) {
    return "amber";
  }
  return "neutral";
}

function categoryBadgeClass(category: TenantCategory): string {
  switch (category) {
    case "active":
      return "badge-success";
    case "pending":
      return "badge-warning";
    case "past_due":
      return "badge-error";
    case "vacating":
      return "badge-ghost";
    default:
      return "badge-outline";
  }
}

function paymentBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case "current":
      return "badge-success";
    case "late":
      return "badge-error";
    case "partial":
      return "badge-warning";
    default:
      return "badge-outline";
  }
}

function SummaryCard({
  label,
  value,
  tone = "default",
  onActivate,
  active = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "warn";
  onActivate?: () => void;
  active?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : "border-[var(--harbor-deep)]/10 bg-white/90";
  const activeClass = active
    ? "ring-2 ring-[var(--harbor-mid)] ring-offset-2"
    : "";
  const interactiveClass = onActivate
    ? "w-full cursor-pointer text-left transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
    : "";
  const body = (
    <>
      <p className="text-xs uppercase tracking-wide opacity-55">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--harbor-ink)]">
        {value}
      </p>
    </>
  );
  if (onActivate) {
    return (
      <button
        type="button"
        onClick={onActivate}
        aria-pressed={active}
        aria-label={`Filter tenant table by ${label}`}
        className={`rounded-2xl border px-4 py-3 shadow-sm ${toneClass} ${activeClass} ${interactiveClass}`}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${toneClass}`}>
      {body}
    </div>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1 py-0.5 text-left text-xs font-semibold uppercase tracking-wide transition ${
        active
          ? "bg-[var(--harbor-mid)]/15 text-[var(--harbor-ink)]"
          : "text-[var(--harbor-ink)]/75 hover:bg-base-200"
      }`}
      onClick={onClick}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      title={
        active
          ? `Sorted ${dir === "asc" ? "ascending" : "descending"} — click to reverse`
          : `Sort by ${label}`
      }
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5 shrink-0 text-[var(--harbor-mid)]" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 shrink-0 text-[var(--harbor-mid)]" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
      )}
    </button>
  );
}

export function TenantDashboard() {
  const {
    items: tenants,
    saveOne: saveTenant,
    loading,
    error,
  } = useSharedCollection<TenantRecord>(COLLECTIONS.tenants);
  const { items: managedProperties } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const { items: receivables, loading: arLoading } =
    useSharedCollection<RentalReceivable>(COLLECTIONS.rentalReceivables);
  const {
    items: notices,
    saveOne: saveNotice,
    refresh: refreshNotices,
    loading: noticesLoading,
  } = useSharedCollection<CollectionsNotice>(COLLECTIONS.collectionsNotices);
  const { items: accountStates, loading: accountStatesLoading } =
    useSharedCollection<CollectionsAccountState>(
      COLLECTIONS.collectionsAccountState
    );
  const {
    items: alerts,
    saveOne: saveAlert,
    refresh: refreshAlerts,
    loading: alertsLoading,
  } = useSharedCollection<ManagementAlert>(COLLECTIONS.managementAlerts);

  useCollectionsCatchUpSync({
    tenants,
    receivables,
    notices,
    accountStates,
    alerts,
    saveNotice,
    saveAlert,
    refreshNotices,
    refreshAlerts,
    ready:
      !loading &&
      !arLoading &&
      !alertsLoading &&
      !noticesLoading &&
      !accountStatesLoading,
  });

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [form, setForm] = useState(emptyTenant());
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const tenantTableRef = useRef<HTMLDivElement>(null);

  function applyKpiFilter(patch: Partial<Filters>) {
    setFilters({ ...defaultFilters, ...patch });
    window.requestAnimationFrame(() => {
      tenantTableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function clearAllFilters() {
    setFilters(defaultFilters);
    setSortKey("name");
    setSortDir("asc");
  }

  const collectionsByTenant = useMemo(() => {
    const map = new Map<string, TenantCollectionsSnapshot>();
    for (const t of tenants) {
      map.set(
        t.id.toLowerCase(),
        buildTenantCollectionsSnapshot(
          t,
          receivables,
          notices,
          accountStates,
          alerts
        )
      );
    }
    return map;
  }, [tenants, receivables, notices, accountStates, alerts]);

  const collectionsInsights = useMemo(
    () =>
      portfolioCollectionsInsights(
        Array.from(collectionsByTenant.values()),
        notices
      ),
    [collectionsByTenant, notices]
  );

  const properties = useMemo(() => {
    const fromTenants = tenants.map((t) => t.propertyLeased).filter(Boolean);
    const fromManaged = managedProperties
      .map((p) => p.propertyName)
      .filter(Boolean);
    return Array.from(new Set([...fromManaged, ...fromTenants])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [tenants, managedProperties]);

  const currentRentDueByTenant = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const t of tenants) {
      map.set(t.id.toLowerCase(), tenantCurrentRentDue(t.id, receivables));
    }
    return map;
  }, [tenants, receivables]);

  const rentOverdueByTenant = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tenants) {
      map.set(t.id.toLowerCase(), tenantRentOverdue(t.id, receivables));
    }
    return map;
  }, [tenants, receivables]);

  const summaries = useMemo(() => {
    const total = tenants.length;
    const current = tenants.filter((t) => isCurrentTenant(t)).length;
    const former = tenants.filter((t) => isFormerOrExpired(t)).length;
    const expiring = tenants.filter((t) => isExpiringOccupant(t, 90)).length;
    let tenantsWithCurrentRentDue = 0;
    let totalCurrentRentDue = 0;
    for (const t of tenants) {
      const due = currentRentDueByTenant.get(t.id.toLowerCase());
      if (due != null && due > 0) {
        tenantsWithCurrentRentDue += 1;
        totalCurrentRentDue += due;
      }
    }
    return {
      total,
      current,
      former,
      expiring,
      tenantsWithCurrentRentDue,
      totalCurrentRentDue,
    };
  }, [tenants, currentRentDueByTenant]);

  const filteredTenants = useMemo(() => {
    const rows = tenants.filter((t) => {
      if (!matchesOccupancyFilter(t, filters.occupancy)) return false;
      if (filters.category !== "all" && t.category !== filters.category) {
        return false;
      }
      if (filters.property && t.propertyLeased !== filters.property) {
        return false;
      }
      if (
        filters.paymentStatus !== "all" &&
        getPaymentStatus(t) !== filters.paymentStatus
      ) {
        return false;
      }
      const currentRentDue =
        currentRentDueByTenant.get(t.id.toLowerCase()) ?? null;
      if (
        filters.hasCurrentRentDue &&
        !(currentRentDue != null && currentRentDue > 0)
      ) {
        return false;
      }
      const snap = collectionsByTenant.get(t.id.toLowerCase());
      if (filters.collections !== "all") {
        if (!snap || !matchesCollectionsFilter(snap, filters.collections)) {
          return false;
        }
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!t.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "property":
          return a.propertyLeased.localeCompare(b.propertyLeased) * dir;
        case "monthlyRent":
          return (getMonthlyRent(a) - getMonthlyRent(b)) * dir;
        case "currentRentDue": {
          const ae = currentRentDueByTenant.get(a.id.toLowerCase());
          const be = currentRentDueByTenant.get(b.id.toLowerCase());
          const av = ae == null ? -1 : ae;
          const bv = be == null ? -1 : be;
          return (av - bv) * dir;
        }
        case "rentOverdue": {
          const ae = rentOverdueByTenant.get(a.id.toLowerCase()) ?? 0;
          const be = rentOverdueByTenant.get(b.id.toLowerCase()) ?? 0;
          return (ae - be) * dir;
        }
        case "daysOverdue": {
          const ae =
            collectionsByTenant.get(a.id.toLowerCase())?.daysOverdue ?? 0;
          const be =
            collectionsByTenant.get(b.id.toLowerCase())?.daysOverdue ?? 0;
          return (ae - be) * dir;
        }
        default:
          return 0;
      }
    });

    return rows;
  }, [
    tenants,
    filters,
    sortKey,
    sortDir,
    collectionsByTenant,
    currentRentDueByTenant,
    rentOverdueByTenant,
  ]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.search.trim()) {
      chips.push({ key: "search", label: `Name: “${filters.search.trim()}”` });
    }
    if (filters.property) {
      chips.push({ key: "property", label: `Property: ${filters.property}` });
    }
    if (filters.occupancy !== "all") {
      const label =
        OCCUPANCY_FILTERS.find((o) => o.value === filters.occupancy)?.label ??
        filters.occupancy;
      chips.push({ key: "occupancy", label: `Occupancy: ${label}` });
    }
    if (filters.paymentStatus !== "all") {
      chips.push({
        key: "payment",
        label: `Payment: ${paymentStatusLabel(filters.paymentStatus)}`,
      });
    }
    if (filters.category !== "all") {
      chips.push({
        key: "lease",
        label: `Lease category: ${tenantCategoryLabel(filters.category)}`,
      });
    }
    if (filters.hasCurrentRentDue) {
      chips.push({
        key: "currentRentDue",
        label: "Current rent due > $0",
      });
    }
    if (filters.collections !== "all") {
      const label =
        COLLECTIONS_FILTERS.find((o) => o.value === filters.collections)
          ?.label ?? filters.collections;
      chips.push({ key: "collections", label: `Collections: ${label}` });
    }
    return chips;
  }, [filters]);

  const filtersActive = activeFilterChips.length > 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "property" ? "asc" : "desc");
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.propertyLeased.trim()) {
      setSavedMsg("Tenant name and property are required.");
      return;
    }
    try {
      const paymentStatus =
        form.paymentStatus ??
        (form.pendingDue > 0
          ? form.category === "past_due"
            ? "late"
            : "partial"
          : "current");
      await saveTenant({
        ...form,
        id: crypto.randomUUID(),
        name: form.name.trim(),
        unit: form.unit.trim(),
        propertyLeased: form.propertyLeased.trim(),
        leaseEnd: form.leaseEnd || "",
        monthlyRent: Number(form.monthlyRent) || 0,
        paymentStatus,
      });
      setForm(emptyTenant());
      setShowForm(false);
      setSavedMsg("Tenant saved to the shared team database.");
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err) {
      setSavedMsg(
        err instanceof Error ? err.message : "Could not save tenant."
      );
    }
  }

  async function updateCategory(id: string, category: TenantCategory) {
    const current = tenants.find((t) => t.id === id);
    if (!current) return;
    await saveTenant({ ...current, category });
  }

  async function updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
    const current = tenants.find((t) => t.id === id);
    if (!current) return;
    await saveTenant({ ...current, paymentStatus });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Tenant</p>
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

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <Link
          href="/ops"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to operations
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
              Tenant master list
            </h1>
            <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
              Search, filter, and sort the shared management ledger of leased
              tenants.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              className="btn btn-neutral btn-sm gap-1"
              onClick={() => setShowForm((v) => !v)}
            >
              <PlusCircle className="h-4 w-4" />
              {showForm ? "Hide form" : "Add tenant"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SummaryCard
            label="Total tenant records"
            value={String(summaries.total)}
            onActivate={() => applyKpiFilter({})}
          />
          <SummaryCard
            label="Current tenants"
            value={String(summaries.current)}
            active={
              filters.occupancy === "current" &&
              filters.paymentStatus === "all" &&
              filters.collections === "all" &&
              !filters.hasCurrentRentDue
            }
            onActivate={() => applyKpiFilter({ occupancy: "current" })}
          />
          <SummaryCard
            label="Former or expired"
            value={String(summaries.former)}
            active={
              filters.occupancy === "former" &&
              filters.paymentStatus === "all" &&
              filters.collections === "all" &&
              !filters.hasCurrentRentDue
            }
            onActivate={() => applyKpiFilter({ occupancy: "former" })}
          />
          <SummaryCard
            label="Leases expiring within 90 days"
            value={String(summaries.expiring)}
            tone={summaries.expiring > 0 ? "warn" : "default"}
            active={
              filters.occupancy === "expiring90" &&
              filters.paymentStatus === "all" &&
              filters.collections === "all" &&
              !filters.hasCurrentRentDue
            }
            onActivate={() => applyKpiFilter({ occupancy: "expiring90" })}
          />
          <SummaryCard
            label="Tenants with current rent due"
            value={String(summaries.tenantsWithCurrentRentDue)}
            tone={
              summaries.tenantsWithCurrentRentDue > 0 ? "danger" : "default"
            }
            active={
              filters.hasCurrentRentDue &&
              filters.occupancy === "all" &&
              filters.paymentStatus === "all" &&
              filters.collections === "all"
            }
            onActivate={() => applyKpiFilter({ hasCurrentRentDue: true })}
          />
          <SummaryCard
            label="Total current rent due"
            value={formatCurrency(summaries.totalCurrentRentDue)}
            tone={summaries.totalCurrentRentDue > 0 ? "danger" : "default"}
            active={
              filters.hasCurrentRentDue &&
              filters.occupancy === "all" &&
              filters.paymentStatus === "all" &&
              filters.collections === "all"
            }
            onActivate={() => applyKpiFilter({ hasCurrentRentDue: true })}
          />
        </div>

        <p className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 px-4 py-3 text-sm text-[var(--harbor-ink)]/70">
          {CURRENT_RENT_DUE_HELPER}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SummaryCard
            label="Tenants with overdue rent"
            value={String(collectionsInsights.tenantsOverdue)}
            tone={collectionsInsights.tenantsOverdue > 0 ? "danger" : "default"}
            active={filters.collections === "any_overdue"}
            onActivate={() => applyKpiFilter({ collections: "any_overdue" })}
          />
          <SummaryCard
            label="Total overdue rent"
            value={formatCurrency(collectionsInsights.totalOverdueRent)}
            tone={
              collectionsInsights.totalOverdueRent > 0 ? "danger" : "default"
            }
            active={filters.collections === "any_overdue"}
            onActivate={() => applyKpiFilter({ collections: "any_overdue" })}
          />
          <SummaryCard
            label="Notices due this week"
            value={String(collectionsInsights.noticesDueThisWeek)}
            tone={
              collectionsInsights.noticesDueThisWeek > 0 ? "warn" : "default"
            }
            active={filters.collections === "notices_due"}
            onActivate={() => applyKpiFilter({ collections: "notices_due" })}
          />
          <SummaryCard
            label="30+ days overdue"
            value={String(collectionsInsights.tenants30)}
            tone={collectionsInsights.tenants30 > 0 ? "warn" : "default"}
            active={filters.collections === "days_30"}
            onActivate={() => applyKpiFilter({ collections: "days_30" })}
          />
          <SummaryCard
            label="60+ days overdue"
            value={String(collectionsInsights.tenants60)}
            tone={collectionsInsights.tenants60 > 0 ? "warn" : "default"}
            active={filters.collections === "days_60"}
            onActivate={() => applyKpiFilter({ collections: "days_60" })}
          />
          <SummaryCard
            label="90+ days overdue"
            value={String(collectionsInsights.tenants90)}
            tone={collectionsInsights.tenants90 > 0 ? "danger" : "default"}
            active={filters.collections === "days_90"}
            onActivate={() => applyKpiFilter({ collections: "days_90" })}
          />
          <SummaryCard
            label="Management review required"
            value={String(collectionsInsights.evictionReviewsRequired)}
            tone={
              collectionsInsights.evictionReviewsRequired > 0
                ? "danger"
                : "default"
            }
            active={filters.collections === "review_required"}
            onActivate={() =>
              applyKpiFilter({ collections: "review_required" })
            }
          />
        </div>

        {filtersActive && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--harbor-mid)]/40 bg-[var(--harbor-mid)]/10 px-4 py-3"
            role="status"
            aria-live="polite"
          >
            <span className="text-sm font-semibold text-[var(--harbor-ink)]">
              Active filter
              {activeFilterChips.length > 1 ? "s" : ""}:
            </span>
            {activeFilterChips.map((chip) => (
              <span
                key={chip.key}
                className="badge badge-outline border-[var(--harbor-mid)] bg-white text-[var(--harbor-ink)]"
              >
                {chip.label}
              </span>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-xs ml-auto"
              onClick={clearAllFilters}
            >
              Clear filter
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <p className="font-semibold">Could not load shared tenants</p>
            <p className="mt-1 opacity-90">{error}</p>
            <p className="mt-2 text-xs opacity-70">
              Check your connection and Supabase env, then refresh the page.
            </p>
          </div>
        )}
        {savedMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {savedMsg}
          </div>
        )}
        {loading && (
          <div className="rounded-xl border border-dashed border-[var(--harbor-deep)]/20 bg-white/70 px-4 py-8 text-center text-sm text-[var(--harbor-ink)]/65">
            <span className="loading loading-spinner loading-sm mr-2" />
            Loading shared tenant ledger…
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="grid gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
          >
            <input
              className="input input-bordered input-sm w-full bg-white"
              placeholder="Tenant name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="input input-bordered input-sm w-full bg-white"
              placeholder="Unit / suite"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            />
            <input
              className="input input-bordered input-sm w-full bg-white"
              placeholder="Property / building"
              list="managed-property-names"
              value={form.propertyLeased}
              onChange={(e) =>
                setForm((f) => ({ ...f, propertyLeased: e.target.value }))
              }
              required
            />
            <datalist id="managed-property-names">
              {properties.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <select
              className="select select-bordered select-sm w-full bg-white"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as TenantCategory,
                }))
              }
            >
              {TENANT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  Lease status: {c.label}
                </option>
              ))}
            </select>
            <select
              className="select select-bordered select-sm w-full bg-white"
              value={form.paymentStatus ?? "current"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  paymentStatus: e.target.value as PaymentStatus,
                }))
              }
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  Payment: {s.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="input input-bordered input-sm w-full bg-white"
              placeholder="Monthly rent"
              value={form.monthlyRent || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  monthlyRent: Number(e.target.value) || 0,
                }))
              }
            />
            <input
              type="number"
              className="input input-bordered input-sm w-full bg-white"
              placeholder="Sq ft"
              value={form.sqft || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sqft: Number(e.target.value) || 0,
                }))
              }
            />
            <input
              type="number"
              className="input input-bordered input-sm w-full bg-white"
              placeholder="Balance due"
              value={form.pendingDue || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pendingDue: Number(e.target.value) || 0,
                }))
              }
            />
            <input
              type="number"
              className="input input-bordered input-sm w-full bg-white"
              placeholder="Age (years)"
              value={form.ageYears || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  ageYears: Number(e.target.value) || 0,
                }))
              }
            />
            <label className="form-control w-full">
              <span className="label-text text-xs opacity-60">Lease start</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full bg-white"
                value={form.dateLeased}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dateLeased: e.target.value }))
                }
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text text-xs opacity-60">Lease end</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full bg-white"
                value={form.leaseEnd || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, leaseEnd: e.target.value }))
                }
              />
            </label>
            <button type="submit" className="btn btn-neutral btn-sm">
              Save to shared database
            </button>
          </form>
        )}

        <section className="space-y-4">
          <div
            className={`rounded-2xl border p-4 shadow-sm ${
              filtersActive
                ? "border-[var(--harbor-mid)]/40 bg-[var(--harbor-mid)]/5"
                : "border-[var(--harbor-deep)]/10 bg-white/90"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--harbor-ink)]">
                Filter ledger
                {filtersActive && (
                  <span className="badge badge-info badge-sm ml-2">
                    {activeFilterChips.length} active
                  </span>
                )}
              </p>
              <p className="text-sm text-[var(--harbor-ink)]/70">
                Showing{" "}
                <span className="font-semibold text-[var(--harbor-ink)]">
                  {filteredTenants.length}
                </span>{" "}
                of {tenants.length} tenants
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                type="search"
                className={`input input-bordered input-sm w-full bg-white ${
                  filters.search ? "border-[var(--harbor-mid)]" : ""
                }`}
                placeholder="Search by tenant name"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
              />

              <select
                className={`select select-bordered select-sm w-full bg-white ${
                  filters.property ? "border-[var(--harbor-mid)]" : ""
                }`}
                value={filters.property}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, property: e.target.value }))
                }
              >
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                className={`select select-bordered select-sm w-full bg-white ${
                  filters.occupancy !== "all" ? "border-[var(--harbor-mid)]" : ""
                }`}
                value={filters.occupancy}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    occupancy: e.target.value as OccupancyFilter,
                  }))
                }
                aria-label="Occupancy / lease timeline filter"
              >
                {OCCUPANCY_FILTERS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                className={`select select-bordered select-sm w-full bg-white ${
                  filters.paymentStatus !== "all"
                    ? "border-[var(--harbor-mid)]"
                    : ""
                }`}
                value={filters.paymentStatus}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    paymentStatus: e.target.value as Filters["paymentStatus"],
                  }))
                }
              >
                <option value="all">All payment statuses</option>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <select
                className={`select select-bordered select-sm w-full bg-white ${
                  filters.category !== "all" ? "border-[var(--harbor-mid)]" : ""
                }`}
                value={filters.category}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    category: e.target.value as Filters["category"],
                  }))
                }
              >
                <option value="all">All lease categories</option>
                {TENANT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                className={`select select-bordered select-sm w-full bg-white ${
                  filters.collections !== "all"
                    ? "border-[var(--harbor-mid)]"
                    : ""
                }`}
                value={filters.collections}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    collections: e.target.value as CollectionsFilter,
                  }))
                }
                aria-label="Collections status filter"
              >
                {COLLECTIONS_FILTERS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!filtersActive && sortKey === "name" && sortDir === "asc"}
                onClick={clearAllFilters}
              >
                Clear all filters
              </button>
            </div>

            {filtersActive && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFilterChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="badge badge-outline border-[var(--harbor-mid)]/50 bg-white text-[var(--harbor-ink)]"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div
            ref={tenantTableRef}
            className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-base-200 px-3 py-2 text-xs text-[var(--harbor-ink)]/75">
              <span className="font-semibold text-[var(--harbor-ink)]">
                Row colors:
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200"
                  aria-hidden
                />
                Dark red: 90+ days overdue; management review required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm border border-red-200 bg-red-50"
                  aria-hidden
                />
                Light red: Rent overdue, under 90 days
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm border border-base-300 bg-white"
                  aria-hidden
                />
                Neutral: No current warning
              </span>
            </div>
            <div className="overflow-x-auto scroll-smooth [scrollbar-gutter:stable]">
              <table className="table table-sm">
                <thead>
                  <tr className="text-[var(--harbor-ink)]">
                    <th className="sticky left-0 z-30 min-w-[10rem] max-w-[10rem] border-b border-base-200 bg-base-200">
                      <SortButton
                        label="Tenant"
                        active={sortKey === "name"}
                        dir={sortDir}
                        onClick={() => toggleSort("name")}
                      />
                    </th>
                    <th className="sticky left-[10rem] z-30 min-w-[10rem] max-w-[10rem] border-b border-r border-base-300 bg-base-200 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.12)]">
                      <SortButton
                        label="Property"
                        active={sortKey === "property"}
                        dir={sortDir}
                        onClick={() => toggleSort("property")}
                      />
                    </th>
                    <th className="min-w-[5rem] whitespace-nowrap bg-base-200">
                      Unit
                    </th>
                    <th className="min-w-[7rem] whitespace-nowrap bg-base-200">
                      Category
                    </th>
                    <th className="min-w-[5rem] whitespace-nowrap bg-base-200">
                      Sq ft
                    </th>
                    <th className="min-w-[6.5rem] whitespace-nowrap bg-base-200">
                      Lease status
                    </th>
                    <th className="min-w-[6.5rem] whitespace-nowrap bg-base-200">
                      Lease end
                    </th>
                    <th className="min-w-[6.5rem] whitespace-nowrap bg-base-200">
                      <SortButton
                        label="Monthly rent"
                        active={sortKey === "monthlyRent"}
                        dir={sortDir}
                        onClick={() => toggleSort("monthlyRent")}
                      />
                    </th>
                    <th className="min-w-[7.5rem] whitespace-nowrap bg-base-200">
                      <SortButton
                        label="Current rent due"
                        active={sortKey === "currentRentDue"}
                        dir={sortDir}
                        onClick={() => toggleSort("currentRentDue")}
                      />
                    </th>
                    <th className="min-w-[7rem] whitespace-nowrap bg-base-200">
                      <SortButton
                        label="Rent overdue"
                        active={sortKey === "rentOverdue"}
                        dir={sortDir}
                        onClick={() => toggleSort("rentOverdue")}
                      />
                    </th>
                    <th className="min-w-[5.5rem] whitespace-nowrap bg-base-200">
                      <SortButton
                        label="Days overdue"
                        active={sortKey === "daysOverdue"}
                        dir={sortDir}
                        onClick={() => toggleSort("daysOverdue")}
                      />
                    </th>
                    <th className="min-w-[6.5rem] whitespace-nowrap bg-base-200">
                      Collections
                    </th>
                    <th className="min-w-[7.5rem] whitespace-nowrap bg-base-200">
                      Management review
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && tenants.length === 0 && !error ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center">
                        <p className="font-medium text-[var(--harbor-ink)]">
                          No tenants in the shared ledger yet
                        </p>
                        <p className="mt-1 text-sm opacity-60">
                          Add a tenant to begin the management overview.
                        </p>
                      </td>
                    </tr>
                  ) : !loading && filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center">
                        <p className="font-medium text-[var(--harbor-ink)]">
                          No tenants match these filters
                        </p>
                        <p className="mt-1 text-sm opacity-60">
                          Clear filters or broaden your search to see more
                          records.
                        </p>
                        {filtersActive && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm mt-3"
                            onClick={clearAllFilters}
                          >
                            Clear all filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => {
                      const rent = getMonthlyRent(t);
                      const currentRentDue =
                        currentRentDueByTenant.get(t.id.toLowerCase()) ?? null;
                      const rentOverdue =
                        rentOverdueByTenant.get(t.id.toLowerCase()) ?? 0;
                      const expiring = isLeaseExpiringWithinDays(t, 90);
                      const snap =
                        collectionsByTenant.get(t.id.toLowerCase()) ?? null;
                      const propertyId = resolveUniqueManagedPropertyId(
                        managedProperties,
                        t.propertyLeased
                      );
                      const leaseLabel = leaseStatusOverviewLabel(t);
                      const daysOverdue = snap?.daysOverdue ?? 0;
                      const managementReviewRequired =
                        !!snap &&
                        (snap.managementReviewRequired || daysOverdue >= 90);
                      const paymentPlan =
                        snap?.stage === "payment_plan" ||
                        !!snap?.accountState?.paymentPlanApproved;
                      // Non-overdue collections warnings only (overdue uses red priority).
                      const collectionsWarning =
                        !!snap &&
                        daysOverdue < 1 &&
                        (snap.stage === "paused" ||
                          snap.noticesCurrentlyDue === true);
                      const toneKey = tenantRowTone({
                        daysOverdue,
                        rentOverdue,
                        managementReviewRequired,
                        paymentPlan,
                        leaseExpiringSoon: expiring,
                        collectionsWarning,
                      });
                      const rowBg = stickyCellBg(toneKey);
                      const stickyTenant = `sticky left-0 z-20 min-w-[10rem] max-w-[10rem] ${rowBg}`;
                      const stickyProperty = `sticky left-[10rem] z-20 min-w-[10rem] max-w-[10rem] border-r border-base-300 ${rowBg} shadow-[4px_0_6px_-2px_rgba(0,0,0,0.12)]`;
                      const collectionsBadge = !snap
                        ? "Current"
                        : snap.stage === "days_90_review"
                          ? "90+ review"
                          : snap.stage === "days_60"
                            ? "60+ OD"
                            : snap.stage === "days_30"
                              ? "30+ OD"
                              : snap.stage === "overdue"
                                ? "Overdue"
                                : snap.stage === "paused"
                                  ? "Paused"
                                  : snap.stage === "disputed"
                                    ? "Disputed"
                                    : snap.stage === "payment_plan"
                                      ? "Payment plan"
                                      : "Current";
                      const reviewRequired = managementReviewRequired;
                      const reviewStatusLabel = !reviewRequired
                        ? "Not required"
                        : snap.openAlert?.reviewStatus === "closed"
                          ? "Closed"
                          : snap.openAlert?.reviewStatus === "reviewed"
                            ? "Reviewed"
                            : "Open";

                      return (
                        <tr key={t.id} className={`hover ${rowBg}`}>
                          <td className={stickyTenant}>
                            <Link
                              href={`/ops/tenant/${encodeURIComponent(t.id)}`}
                              className="block truncate font-medium text-[var(--harbor-mid)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
                              title={`Open profile for ${t.name}`}
                              aria-label={`Open tenant profile for ${t.name}`}
                            >
                              {t.name}
                            </Link>
                          </td>
                          <td className={stickyProperty}>
                            <ManagedPropertyLink
                              propertyName={t.propertyLeased}
                              propertyId={propertyId}
                              className="block truncate"
                            />
                          </td>
                          <td className="whitespace-nowrap text-sm">
                            {t.unit || MISSING_FIELD_LABEL}
                          </td>
                          <td>
                            <select
                              className={`select select-bordered select-xs ${categoryBadgeClass(t.category)}`}
                              value={t.category}
                              onChange={(e) =>
                                void updateCategory(
                                  t.id,
                                  e.target.value as TenantCategory
                                )
                              }
                              aria-label={`Category for ${t.name}`}
                            >
                              {TENANT_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="whitespace-nowrap text-sm opacity-80">
                            {t.sqft ? t.sqft.toLocaleString() : "—"}
                          </td>
                          <td>
                            <span
                              className={`badge badge-sm whitespace-nowrap ${
                                leaseLabel === "Past due"
                                  ? "badge-error"
                                  : leaseLabel === "Expiring" ||
                                      leaseLabel === "Pending"
                                    ? "badge-warning"
                                    : leaseLabel === "Former"
                                      ? "badge-ghost"
                                      : "badge-outline"
                              }`}
                            >
                              {leaseLabel}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-xs">
                            {formatOptionalLeaseDate(t.leaseEnd || "")}
                          </td>
                          <td
                            className={`whitespace-nowrap text-sm ${
                              rent <= 0 ? "italic opacity-55" : ""
                            }`}
                          >
                            {formatOptionalRent(rent)}
                          </td>
                          <td
                            className={
                              currentRentDue != null && currentRentDue > 0
                                ? "whitespace-nowrap font-medium text-[var(--harbor-ink)]"
                                : "whitespace-nowrap opacity-70"
                            }
                            title="Open balance on most recent base-rent obligation due on or before today"
                          >
                            {currentRentDue == null ? (
                              <span className="opacity-55">—</span>
                            ) : (
                              formatCurrency(currentRentDue)
                            )}
                          </td>
                          <td
                            className={
                              rentOverdue > 0
                                ? "whitespace-nowrap font-medium text-red-800"
                                : "whitespace-nowrap opacity-70"
                            }
                            title="Sum of qualifying overdue base-rent balances"
                          >
                            {rentOverdue > 0 ? (
                              formatCurrency(rentOverdue)
                            ) : (
                              <span className="opacity-55">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-sm">
                            {snap && snap.daysOverdue > 0 ? (
                              <span
                                className={
                                  snap.daysOverdue >= 90
                                    ? "font-semibold text-red-800"
                                    : snap.daysOverdue >= 30
                                      ? "font-medium text-amber-900"
                                      : ""
                                }
                              >
                                {snap.daysOverdue}
                              </span>
                            ) : (
                              <span className="opacity-55">—</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge badge-sm whitespace-nowrap ${
                                collectionsBadge === "90+ review"
                                  ? "badge-error"
                                  : collectionsBadge === "60+ OD" ||
                                      collectionsBadge === "30+ OD" ||
                                      collectionsBadge === "Overdue"
                                    ? "badge-warning"
                                    : collectionsBadge === "Paused" ||
                                        collectionsBadge === "Disputed" ||
                                        collectionsBadge === "Payment plan"
                                      ? "badge-ghost"
                                      : "badge-outline"
                              }`}
                            >
                              {collectionsBadge}
                            </span>
                          </td>
                          <td className="min-w-[7.5rem] align-top text-sm">
                            {reviewRequired ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="badge badge-error badge-sm whitespace-nowrap">
                                  {reviewStatusLabel}
                                </span>
                                <Link
                                  href={`/ops/tenant/${encodeURIComponent(t.id)}#collections-and-notices`}
                                  className="text-xs font-medium text-[var(--harbor-mid)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
                                  aria-label={`View management review for ${t.name}`}
                                >
                                  View
                                </Link>
                              </div>
                            ) : (
                              <span className="opacity-45">Not required</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
