"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, LogOut, PlusCircle, Users } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  emptyTenant,
  formatCurrency,
  formatLeaseDate,
  seedTenants,
  TENANT_CATEGORIES,
  type TenantCategory,
  type TenantRecord,
} from "@/lib/tenants";

type Filters = {
  search: string;
  category: TenantCategory | "all";
  property: string;
  pendingDue: "all" | "owed" | "clear";
  dateFrom: string;
  dateTo: string;
};

const defaultFilters: Filters = {
  search: "",
  category: "all",
  property: "",
  pendingDue: "all",
  dateFrom: "",
  dateTo: "",
};

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

export function TenantDashboard() {
  const {
    items: tenants,
    saveOne: saveTenant,
    loading,
    error,
  } = useSharedCollection<TenantRecord>(COLLECTIONS.tenants, seedTenants);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [form, setForm] = useState(emptyTenant());
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const properties = useMemo(() => {
    return Array.from(
      new Set(tenants.map((t) => t.propertyLeased).filter(Boolean))
    ).sort();
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (filters.category !== "all" && t.category !== filters.category) {
        return false;
      }
      if (filters.property && t.propertyLeased !== filters.property) {
        return false;
      }
      if (filters.pendingDue === "owed" && t.pendingDue <= 0) return false;
      if (filters.pendingDue === "clear" && t.pendingDue > 0) return false;
      if (filters.dateFrom && t.dateLeased < filters.dateFrom) return false;
      if (filters.dateTo && t.dateLeased > filters.dateTo) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = `${t.name} ${t.unit} ${t.propertyLeased}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tenants, filters]);

  const totalPendingDue = filteredTenants.reduce(
    (sum, t) => sum + t.pendingDue,
    0
  );

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.propertyLeased.trim()) {
      setSavedMsg("Tenant name and property are required.");
      return;
    }
    try {
      await saveTenant({
        ...form,
        id: crypto.randomUUID(),
        name: form.name.trim(),
        unit: form.unit.trim(),
        propertyLeased: form.propertyLeased.trim(),
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
              Shared ledger of leased tenants. Entries sync for the whole team.
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
            <span className="badge badge-outline gap-1 px-3 py-3">
              <Users className="h-3.5 w-3.5" />
              {filteredTenants.length} shown
            </span>
            <span className="badge badge-outline px-3 py-3">
              Pending due {formatCurrency(totalPendingDue)}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {savedMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {savedMsg}
          </div>
        )}
        {loading && (
          <p className="text-sm opacity-60">Loading shared tenants…</p>
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
              placeholder="Property leased"
              value={form.propertyLeased}
              onChange={(e) =>
                setForm((f) => ({ ...f, propertyLeased: e.target.value }))
              }
              required
            />
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
                  {c.label}
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
            <input
              type="date"
              className="input input-bordered input-sm w-full bg-white"
              value={form.dateLeased}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateLeased: e.target.value }))
              }
            />
            <input
              type="date"
              className="input input-bordered input-sm w-full bg-white"
              value={form.leaseEnd || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, leaseEnd: e.target.value }))
              }
            />
            <button type="submit" className="btn btn-neutral btn-sm">
              Save to shared database
            </button>
          </form>
        )}

        <section className="space-y-4">
          <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-[var(--harbor-ink)]">
              Filter ledger
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="search"
                className="input input-bordered input-sm w-full bg-white"
                placeholder="Search tenant, unit, property"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
              />

              <select
                className="select select-bordered select-sm w-full bg-white"
                value={filters.category}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    category: e.target.value as Filters["category"],
                  }))
                }
              >
                <option value="all">All categories</option>
                {TENANT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm w-full bg-white"
                value={filters.property}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, property: e.target.value }))
                }
              >
                <option value="">All properties leased</option>
                {properties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm w-full bg-white"
                value={filters.pendingDue}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    pendingDue: e.target.value as Filters["pendingDue"],
                  }))
                }
              >
                <option value="all">Any pending due</option>
                <option value="owed">Has balance due</option>
                <option value="clear">No balance due</option>
              </select>

              <input
                type="date"
                className="input input-bordered input-sm w-full bg-white"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                }
                aria-label="Lease date from"
              />
              <input
                type="date"
                className="input input-bordered input-sm w-full bg-white"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateTo: e.target.value }))
                }
                aria-label="Lease date to"
              />

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setFilters(defaultFilters)}
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm">
            <table className="table">
              <thead>
                <tr className="text-[var(--harbor-ink)]">
                  <th>Tenant</th>
                  <th>Category</th>
                  <th>Property leased</th>
                  <th>Sq ft</th>
                  <th>Monthly rent</th>
                  <th>Balance due</th>
                  <th>Lease term</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center opacity-60">
                      No tenants match these filters.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <p className="font-medium text-[var(--harbor-ink)]">
                          {t.name}
                        </p>
                        <p className="text-xs opacity-60">{t.unit}</p>
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
                      <td>{t.propertyLeased}</td>
                      <td className="opacity-80">
                        {t.sqft ? t.sqft.toLocaleString() : "—"}
                      </td>
                      <td>{formatCurrency(t.monthlyRent || 0)}</td>
                      <td
                        className={
                          t.pendingDue > 0
                            ? "font-medium text-red-700"
                            : "opacity-70"
                        }
                      >
                        {formatCurrency(t.pendingDue)}
                      </td>
                      <td className="text-xs">
                        <p>{formatLeaseDate(t.dateLeased)}</p>
                        {t.leaseEnd ? (
                          <p className="opacity-60">
                            → {formatLeaseDate(t.leaseEnd)}
                          </p>
                        ) : null}
                        <p className="opacity-50">{t.ageYears} yrs tenure</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
