"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Percent,
  Scale,
  UserRound,
} from "lucide-react";
import { apCardClass } from "@/components/ApSharedUi";
import { COLLECTIONS, useSharedCollection } from "@/hooks/useSharedCollection";
import {
  money,
  seedMiscReceivables,
  seedRentalReceivables,
  type Receivable,
} from "@/lib/accounts-receivable";
import { buildArDashboardMetrics } from "@/lib/ar-dashboard";

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof CircleDollarSign;
  tone?: "default" | "warn" | "good";
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-300/60 bg-amber-50/70"
      : tone === "good"
        ? "border-emerald-300/50 bg-emerald-50/60"
        : "border-[var(--harbor-deep)]/10 bg-white/90";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/50">
          {label}
        </p>
        <Icon className="h-4 w-4 shrink-0 text-[var(--harbor-ink)]/40" />
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-[var(--harbor-ink)] sm:text-2xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--harbor-ink)]/50">{hint}</p>
      ) : null}
    </div>
  );
}

const AGING_COLORS: Record<string, string> = {
  current: "bg-emerald-600/80",
  days_31_60: "bg-amber-500/85",
  days_61_90: "bg-orange-500/85",
  days_90_plus: "bg-rose-600/80",
};

export function ArOverviewPanel() {
  const [needsAttentionOpen, setNeedsAttentionOpen] = useState(false);
  const rental = useSharedCollection<Receivable>(
    COLLECTIONS.rentalReceivables,
    seedRentalReceivables
  );
  const misc = useSharedCollection<Receivable>(
    COLLECTIONS.miscellaneousReceivables,
    seedMiscReceivables
  );

  const loading = rental.loading || misc.loading;
  const error = rental.error ?? misc.error;

  const metrics = useMemo(
    () =>
      buildArDashboardMetrics([...rental.items, ...misc.items]),
    [rental.items, misc.items]
  );

  const agingPeak = Math.max(1, ...metrics.aging.map((b) => b.amount));

  const attentionCount =
    metrics.topDelinquent.length +
    metrics.lowCollectionProperties.length +
    metrics.disputedCharges.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Accounts Receivable
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Track rent and other charges, collections, and delinquencies
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--harbor-deep)]/15 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/65 shadow-sm">
          <CalendarDays className="h-3.5 w-3.5" />
          Current period: {metrics.periodLabel}
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          Could not load receivables: {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--harbor-ink)]/50">
          Loading A/R overview…
        </p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Rent Billed This Month"
              value={money(metrics.rentBilledThisMonth)}
              icon={CircleDollarSign}
              hint={metrics.periodLabel}
            />
            <KpiCard
              label="Rent Collected This Month"
              value={money(metrics.rentCollectedThisMonth)}
              icon={CircleDollarSign}
              tone="good"
              hint={metrics.periodLabel}
            />
            <KpiCard
              label="Collection Rate"
              value={`${metrics.collectionRate.toFixed(1)}%`}
              icon={Percent}
              tone={
                metrics.collectionRate >= 90
                  ? "good"
                  : metrics.collectionRate < 75
                    ? "warn"
                    : "default"
              }
              hint="Collected ÷ billed this month"
            />
            <KpiCard
              label="Outstanding A/R"
              value={money(metrics.outstandingAr)}
              icon={Scale}
              hint="Open balances"
            />
            <KpiCard
              label="Delinquent A/R (30+ days)"
              value={money(metrics.delinquentAr30)}
              icon={AlertTriangle}
              tone={metrics.delinquentAr30 > 0 ? "warn" : "default"}
              hint="Past due 30 days or more"
            />
            <KpiCard
              label="Average Days Delinquent"
              value={
                metrics.averageDaysDelinquent > 0
                  ? `${metrics.averageDaysDelinquent} days`
                  : "—"
              }
              icon={Clock3}
              hint="Balance-weighted"
            />
          </section>

          <section className={`${apCardClass} p-6`}>
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              Aging Summary
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/55">
              Open A/R by days past due
            </p>

            <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-[var(--harbor-deep)]/8">
              {metrics.aging.map((bucket) =>
                bucket.amount > 0 ? (
                  <div
                    key={bucket.id}
                    className={`${AGING_COLORS[bucket.id] ?? "bg-slate-400"} h-full`}
                    style={{ width: `${bucket.percent}%` }}
                    title={`${bucket.label}: ${money(bucket.amount)}`}
                  />
                ) : null
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.aging.map((bucket) => (
                <div
                  key={bucket.id}
                  className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${AGING_COLORS[bucket.id]}`}
                    />
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/55">
                      {bucket.label}
                    </p>
                  </div>
                  <p className="mt-2 text-lg font-semibold tabular-nums">
                    {money(bucket.amount)}
                  </p>
                  <p className="text-xs text-[var(--harbor-ink)]/50">
                    {bucket.percent.toFixed(1)}% of outstanding
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--harbor-deep)]/8">
                    <div
                      className={`h-full rounded-full ${AGING_COLORS[bucket.id]}`}
                      style={{
                        width: `${Math.min(100, (bucket.amount / agingPeak) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={apCardClass}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-white/60"
              aria-expanded={needsAttentionOpen}
              onClick={() => setNeedsAttentionOpen((open) => !open)}
            >
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                  Needs Attention
                </h2>
                <p className="mt-0.5 text-sm text-[var(--harbor-ink)]/55">
                  {needsAttentionOpen
                    ? "Delinquent accounts, soft collection properties, and disputed charges"
                    : attentionCount > 0
                      ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} · click to expand`
                      : "Nothing flagged · click to expand"}
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-[var(--harbor-ink)]/45 transition ${
                  needsAttentionOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {needsAttentionOpen ? (
              <div className="border-t border-[var(--harbor-deep)]/10 px-6 pb-6 pt-5">
                <div className="grid gap-5 lg:grid-cols-3">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/55">
                  <UserRound className="h-3.5 w-3.5" />
                  Top delinquent tenants
                </p>
                {metrics.topDelinquent.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--harbor-deep)]/20 px-3 py-6 text-sm text-[var(--harbor-ink)]/50">
                    No overdue balances right now.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {metrics.topDelinquent.map((row) => (
                      <li
                        key={row.key}
                        className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{row.customerName}</p>
                            <p className="truncate text-xs text-[var(--harbor-ink)]/50">
                              {row.property}
                              {row.unit && row.unit !== "—"
                                ? ` · Unit ${row.unit}`
                                : ""}
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold tabular-nums">
                            {money(row.balance)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-amber-800/80">
                          {row.daysDelinquent} days delinquent ·{" "}
                          {row.invoiceCount} open charge
                          {row.invoiceCount === 1 ? "" : "s"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/55">
                  <Building2 className="h-3.5 w-3.5" />
                  Low collection rates
                </p>
                {metrics.lowCollectionProperties.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--harbor-deep)]/20 px-3 py-6 text-sm text-[var(--harbor-ink)]/50">
                    No properties below 85% this month.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {metrics.lowCollectionProperties.map((row) => (
                      <li
                        key={row.property}
                        className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-medium">{row.property}</p>
                          <p className="shrink-0 font-semibold tabular-nums text-amber-800">
                            {row.collectionRate.toFixed(0)}%
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-[var(--harbor-ink)]/50">
                          Collected {money(row.collected)} of{" "}
                          {money(row.billed)} · Outstanding{" "}
                          {money(row.outstanding)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/55">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Disputed charges
                </p>
                {metrics.disputedCharges.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--harbor-deep)]/20 px-3 py-6 text-sm text-[var(--harbor-ink)]/50">
                    No disputed charges waiting for review.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {metrics.disputedCharges.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-xl border border-rose-200/70 bg-rose-50/50 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {row.customerName}
                            </p>
                            <p className="truncate text-xs text-[var(--harbor-ink)]/50">
                              {row.receivableId} · {row.property}
                              {row.unit && row.unit !== "—"
                                ? ` · ${row.unit}`
                                : ""}
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold tabular-nums">
                            {money(row.balance || row.amount)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-rose-800/80">
                          Due {row.dueDate} ·{" "}
                          {row.kind === "rental" ? "Rental" : "Miscellaneous"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
