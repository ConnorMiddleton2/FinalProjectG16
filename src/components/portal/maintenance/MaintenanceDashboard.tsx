"use client";

import Link from "next/link";
import {
  AlertCircle,
  LoaderCircle,
  PlusCircle,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import {
  formatMaintenanceDate,
  maintenancePriorityClass,
  maintenanceRequestStatusClass,
} from "@/lib/portal/maintenance-format";
import type {
  MaintenanceCategory,
  MaintenanceDateFilter,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceRequestStatus,
} from "@/lib/portal/maintenance-types";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
} from "@/lib/portal/maintenance-types";

export function MaintenanceDashboard() {
  const {
    state,
    filters,
    filtered,
    grouped,
    counts,
    reload,
    updateFilters,
    resetFilters,
  } = useMaintenanceRequests();

  if (state.status === "loading") {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          className="h-8 w-8 animate-spin text-[var(--harbor-mid)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--harbor-ink)]/70">
          Loading maintenance requests…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className="rounded-2xl border border-error/30 bg-error/5 p-6"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-error" aria-hidden="true" />
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                Maintenance unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
                {state.message}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm gap-1"
                onClick={() => void reload()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <Wrench className="mt-0.5 h-5 w-5 text-[var(--harbor-mid)]" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              No maintenance requests yet
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--harbor-ink)]/65">
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/portal/maintenance/new"
            className="btn btn-neutral btn-sm gap-1"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            New work order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
        role="status"
      >
        Maintenance requests loaded.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--harbor-ink)]/65" aria-live="polite">
          {filtered.length} request{filtered.length === 1 ? "" : "s"} shown
        </p>
        <Link
          href="/portal/maintenance/new"
          className="btn btn-neutral gap-2"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          New work order
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MAINTENANCE_STATUSES.map((status) => (
          <li
            key={status}
            className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm"
          >
            <p className="text-sm text-[var(--harbor-ink)]/60">{status}</p>
            <p className="mt-1 font-display text-3xl text-[var(--harbor-ink)]">
              {counts[status]}
            </p>
          </li>
        ))}
      </ul>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="maintenance-filters-heading"
      >
        <h2
          id="maintenance-filters-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          Filters
        </h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="form-control w-full">
            <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
              Status
            </span>
            <select
              className="select select-bordered w-full"
              value={filters.status}
              onChange={(e) =>
                updateFilters({
                  status: e.target.value as "all" | MaintenanceRequestStatus,
                })
              }
            >
              <option value="all">All statuses</option>
              {MAINTENANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-full">
            <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
              Priority
            </span>
            <select
              className="select select-bordered w-full"
              value={filters.priority}
              onChange={(e) =>
                updateFilters({
                  priority: e.target.value as "all" | MaintenancePriority,
                })
              }
            >
              <option value="all">All priorities</option>
              {MAINTENANCE_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-full">
            <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
              Category
            </span>
            <select
              className="select select-bordered w-full"
              value={filters.category}
              onChange={(e) =>
                updateFilters({
                  category: e.target.value as "all" | MaintenanceCategory,
                })
              }
            >
              <option value="all">All categories</option>
              {MAINTENANCE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-full">
            <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
              Date submitted
            </span>
            <select
              className="select select-bordered w-full"
              value={filters.dateFilter}
              onChange={(e) =>
                updateFilters({
                  dateFilter: e.target.value as MaintenanceDateFilter,
                })
              }
            >
              <option value="all">All dates</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="ytd">Year to date</option>
              <option value="custom">Custom range</option>
            </select>
          </label>

          {filters.dateFilter === "custom" ? (
            <>
              <label className="form-control w-full">
                <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
                  From
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={filters.customFrom}
                  onChange={(e) =>
                    updateFilters({ customFrom: e.target.value })
                  }
                />
              </label>
              <label className="form-control w-full">
                <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
                  To
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={filters.customTo}
                  onChange={(e) => updateFilters({ customTo: e.target.value })}
                />
              </label>
            </>
          ) : null}

          <div className="flex items-end md:col-span-2 xl:col-span-4">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>
        </form>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 px-4 py-8 text-center text-sm text-[var(--harbor-ink)]/60">
          No requests match these filters.
        </p>
      ) : (
        <div className="space-y-6">
          {MAINTENANCE_STATUSES.map((status) => {
            const requests = grouped[status];
            if (
              filters.status !== "all" &&
              filters.status !== status
            ) {
              return null;
            }
            if (requests.length === 0 && filters.status === "all") {
              return (
                <section
                  key={status}
                  className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/20 bg-white/50 p-4"
                  aria-labelledby={`maint-section-${status}`}
                >
                  <h2
                    id={`maint-section-${status}`}
                    className="text-lg font-semibold text-[var(--harbor-ink)]"
                  >
                    {status}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--harbor-ink)]/55">
                    No {status.toLowerCase()} requests.
                  </p>
                </section>
              );
            }
            if (requests.length === 0) return null;

            return (
              <section
                key={status}
                className="space-y-3"
                aria-labelledby={`maint-section-${status}`}
              >
                <div className="flex items-center gap-2">
                  <h2
                    id={`maint-section-${status}`}
                    className="text-lg font-semibold text-[var(--harbor-ink)]"
                  >
                    {status}
                  </h2>
                  <span
                    className={`badge badge-sm ${maintenanceRequestStatusClass(status)}`}
                  >
                    {requests.length}
                  </span>
                </div>
                <ul className="space-y-3">
                  {requests.map((request) => (
                    <li key={request.id}>
                      <MaintenanceRequestCard request={request} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MaintenanceRequestCard({ request }: { request: MaintenanceRequest }) {
  return (
    <article className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-ink)]/50">
            {request.requestNumber}
          </p>
          <h3 className="text-base font-semibold text-[var(--harbor-ink)]">
            {request.title}
          </h3>
          <p className="text-sm text-[var(--harbor-ink)]/60">{request.location}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`badge ${maintenanceRequestStatusClass(request.status)}`}
          >
            {request.status}
          </span>
          <span className={`badge ${maintenancePriorityClass(request.priority)}`}>
            {request.priority}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Category" value={request.category} />
        <Meta
          label="Submitted"
          value={formatMaintenanceDate(request.submittedOn)}
        />
        <Meta
          label="Scheduled"
          value={formatMaintenanceDate(request.scheduledOn)}
        />
        <Meta
          label="Technician"
          value={request.technicianName ?? "Not assigned"}
        />
        <Meta
          label="Last update"
          value={formatMaintenanceDate(request.lastUpdate)}
        />
        <Meta label="Priority" value={request.priority} />
      </dl>

      <div className="mt-4">
        <Link
          href={`/portal/maintenance/${request.id}`}
          className="btn btn-outline btn-sm border-[var(--harbor-deep)]/20"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--harbor-sand)]/40 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-[var(--harbor-ink)]/50">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-[var(--harbor-ink)]">
        {value}
      </dd>
    </div>
  );
}
