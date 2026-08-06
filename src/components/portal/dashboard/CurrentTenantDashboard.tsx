"use client";

import Link from "next/link";
import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { DashboardQuickActions } from "@/components/portal/dashboard/DashboardQuickActions";
import { DashboardSections } from "@/components/portal/dashboard/DashboardSections";
import { DashboardSummaryCards } from "@/components/portal/dashboard/DashboardSummaryCards";
import { useTenantDashboard } from "@/hooks/useTenantDashboard";

export function CurrentTenantDashboard() {
  const { state, reload, loadDemoData } = useTenantDashboard();

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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm gap-1"
                onClick={() => void reload()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadDemoData}
              >
                Use demo data
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
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
          Nothing on your dashboard yet
        </h2>
        <p className="max-w-xl text-sm text-[var(--harbor-ink)]/65">
          {state.message}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/apply" className="btn btn-neutral btn-sm">
            Apply for a property
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadDemoData}
          >
            Preview with demo data
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1"
            onClick={() => void reload()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const { data, source } = state;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--harbor-ink)]/65">
          Welcome back,{" "}
          <span className="font-medium text-[var(--harbor-ink)]">
            {data.tenantName}
          </span>
        </p>
        <p
          className="rounded-full bg-[var(--harbor-mist)]/80 px-3 py-1 text-xs text-[var(--harbor-ink)]/70"
          role="status"
        >
          {source === "mock"
            ? "Showing demo data"
            : "Showing live account data"}
        </p>
      </div>

      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
        role="status"
        aria-live="polite"
      >
        Dashboard loaded successfully.
        {source === "mock"
          ? " Live lease data is unavailable, so isolated mock data is shown."
          : null}
      </div>

      <DashboardSummaryCards summary={data.summary} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <DashboardSections data={data} />
        <DashboardQuickActions />
      </div>
    </div>
  );
}
