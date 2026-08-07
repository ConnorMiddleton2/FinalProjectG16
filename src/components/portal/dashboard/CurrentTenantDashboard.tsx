"use client";

import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { DashboardQuickActions } from "@/components/portal/dashboard/DashboardQuickActions";
import { DashboardManagementContact } from "@/components/portal/dashboard/DashboardManagementContact";
import { DashboardSections } from "@/components/portal/dashboard/DashboardSections";
import { DashboardSummaryCards } from "@/components/portal/dashboard/DashboardSummaryCards";
import { useTenantDashboard } from "@/hooks/useTenantDashboard";

export function CurrentTenantDashboard() {
  const { state, reload } = useTenantDashboard();

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
          Loading your tenant dashboard…
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
                Dashboard unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
                {state.message}
              </p>
            </div>
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
    );
  }

  if (state.status === "empty") {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
          Lease approved — finishing your tenant home
        </h2>
        <p className="max-w-xl text-sm text-[var(--harbor-ink)]/65">
          {state.message} If Sales &amp; Marketing just approved you, refresh
          once — your building and unit should appear on this current-tenant
          dashboard (the applicant checklist is no longer shown after move-in).
        </p>
        <button
          type="button"
          className="btn btn-neutral btn-sm gap-1"
          onClick={() => void reload()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh dashboard
        </button>
      </div>
    );
  }

  const { data } = state;
  const propertyLabel = data.lease
    ? [data.lease.propertyName, data.lease.unit].filter(Boolean).join(" · ")
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--harbor-mid)]">
          Current tenant
        </p>
        <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
          Welcome back, {data.tenantName}
        </h1>
        {propertyLabel ? (
          <p className="text-base text-[var(--harbor-ink)]/80">
            You are a tenant at{" "}
            <span className="font-semibold text-[var(--harbor-ink)]">
              {propertyLabel}
            </span>
            {data.lease?.monthlyRent && data.lease.monthlyRent !== "—"
              ? ` · ${data.lease.monthlyRent}/mo`
              : ""}
            .
          </p>
        ) : (
          <p className="text-sm text-[var(--harbor-ink)]/65">
            Your lease assignment will appear here once linked.
          </p>
        )}
      </div>

      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
        role="status"
        aria-live="polite"
      >
        {propertyLabel
          ? `Lease active at ${propertyLabel}. Use payments, maintenance, and lease from the portal menu.`
          : "Dashboard loaded successfully."}
      </div>

      <DashboardSummaryCards summary={data.summary} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <DashboardSections data={data} />
        <DashboardQuickActions />
      </div>

      <DashboardManagementContact />
    </div>
  );
}
