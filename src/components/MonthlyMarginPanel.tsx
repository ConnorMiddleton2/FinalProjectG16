"use client";

import { useMemo } from "react";
import { Scale } from "lucide-react";
import { COLLECTIONS, useSharedCollection } from "@/hooks/useSharedCollection";
import { apCardClass } from "@/components/ApSharedUi";
import { seedPayableInvoices, type PayableInvoice } from "@/lib/accounts-payable";
import { seedOwnerPayables, type OwnerPayable } from "@/lib/owner-payables";
import {
  seedMiscReceivables,
  seedRentalReceivables,
  type Receivable,
} from "@/lib/accounts-receivable";
import {
  buildMonthlyMargins,
  currentMonthKey,
  monthlyMarginMoney,
  recentMonthKeys,
  type MonthlyMarginRow,
} from "@/lib/monthly-margin";

const STRIP_MONTHS = 6;

/**
 * Net A/R minus A/P by month, shown at the top of both the A/R and A/P
 * dashboards so managers see the same margin figures from either page.
 */
export function MonthlyMarginPanel() {
  const rental = useSharedCollection<Receivable>(
    COLLECTIONS.rentalReceivables,
    seedRentalReceivables
  );
  const misc = useSharedCollection<Receivable>(
    COLLECTIONS.miscellaneousReceivables,
    seedMiscReceivables
  );
  const expenses = useSharedCollection<PayableInvoice>(
    COLLECTIONS.payableInvoices,
    seedPayableInvoices
  );
  const owners = useSharedCollection<OwnerPayable>(
    COLLECTIONS.ownerPayables,
    seedOwnerPayables
  );

  const loading =
    rental.loading || misc.loading || expenses.loading || owners.loading;
  const error = rental.error ?? misc.error ?? expenses.error ?? owners.error;

  const months = useMemo(() => {
    const monthKeys = recentMonthKeys(currentMonthKey(), STRIP_MONTHS);
    return buildMonthlyMargins({
      rentalReceivables: rental.items,
      miscellaneousReceivables: misc.items,
      operatingExpenses: expenses.items,
      ownerPayables: owners.items,
      monthKeys,
    });
  }, [rental.items, misc.items, expenses.items, owners.items]);

  const current = months[months.length - 1];
  const peak = Math.max(
    1,
    ...months.map((m) => Math.max(m.totalReceivableBilled, m.totalPayableOwed))
  );

  return (
    <section className={`${apCardClass} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/60">
            <Scale className="h-4 w-4" />
            Monthly net margin (A/R − A/P)
          </div>
          <p className="mt-2 max-w-2xl text-sm text-[var(--harbor-ink)]/60">
            Amounts <strong>billed and owed</strong> in each month, grouped by
            invoice / owner-statement date — not by cash collected or paid.
            Accounts payable includes both operating-expense vendor invoices and
            net rental distributions owed to property owners.
          </p>
        </div>
        {current ? (
          <span className="rounded-full border border-[var(--harbor-deep)]/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/60">
            Current month: {current.monthLabel}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          Could not load margin data: {error}
        </div>
      ) : null}

      {loading || !current ? (
        <p className="mt-6 text-sm text-[var(--harbor-ink)]/50">
          Loading monthly margin…
        </p>
      ) : (
        <>
          <CurrentMonthBox row={current} />
          <MonthStrip months={months} peak={peak} currentKey={current.monthKey} />
        </>
      )}
    </section>
  );
}

function CurrentMonthBox({ row }: { row: MonthlyMarginRow }) {
  const positive = row.netMargin >= 0;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div
        className={`rounded-2xl border p-5 ${
          positive
            ? "border-success/30 bg-success/10"
            : "border-error/30 bg-error/10"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/60">
          {row.monthLabel} net margin (Total A/R − Total A/P)
        </p>
        <p
          className={`mt-1 font-display text-4xl tabular-nums sm:text-5xl ${
            positive ? "text-success" : "text-error"
          }`}
        >
          {monthlyMarginMoney(row.netMargin)}
        </p>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
          {positive
            ? "Billed more to customers than owed to vendors and owners this month."
            : "Owed more to vendors and owners than billed to customers this month."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TotalCard
          label={`Total A/R billed in ${row.monthLabel}`}
          value={row.totalReceivableBilled}
          lines={[
            { label: "Rental income receivable", value: row.rentalBilled },
            { label: "Miscellaneous receivable", value: row.miscBilled },
          ]}
        />
        <TotalCard
          label={`Total A/P owed in ${row.monthLabel}`}
          value={row.totalPayableOwed}
          lines={[
            { label: "Operating expenses", value: row.operatingExpensesOwed },
            { label: "Payable to owners", value: row.ownerPaymentsOwed },
          ]}
        />
      </div>
    </div>
  );
}

function TotalCard({
  label,
  value,
  lines,
}: {
  label: string;
  value: number;
  lines: { label: string; value: number }[];
}) {
  return (
    <div className="rounded-2xl border border-[var(--harbor-deep)]/12 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/55">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl tabular-nums text-[var(--harbor-ink)]">
        {monthlyMarginMoney(value)}
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between gap-3">
            <dt className="text-[var(--harbor-ink)]/55">{line.label}</dt>
            <dd className="tabular-nums text-[var(--harbor-ink)]/80">
              {monthlyMarginMoney(line.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MonthStrip({
  months,
  peak,
  currentKey,
}: {
  months: MonthlyMarginRow[];
  peak: number;
  currentKey: string;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--harbor-ink)]">
          Last {months.length} months — billed A/R vs. owed A/P by month
        </p>
        <div className="flex items-center gap-4 text-xs text-[var(--harbor-ink)]/60">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--harbor-mid)]" />
            A/R billed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--harbor-deep)]/45" />
            A/P owed
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {months.map((row) => {
          const isCurrent = row.monthKey === currentKey;
          const arHeight = Math.round((row.totalReceivableBilled / peak) * 100);
          const apHeight = Math.round((row.totalPayableOwed / peak) * 100);
          const positive = row.netMargin >= 0;

          return (
            <div
              key={row.monthKey}
              className={`rounded-xl border p-3 ${
                isCurrent
                  ? "border-[var(--harbor-ink)]/40 bg-white"
                  : "border-[var(--harbor-deep)]/12 bg-white/70"
              }`}
            >
              <p className="text-xs font-semibold text-[var(--harbor-ink)]">
                {row.shortLabel}
                {isCurrent ? (
                  <span className="ml-1 font-normal text-[var(--harbor-ink)]/50">
                    (current)
                  </span>
                ) : null}
              </p>

              <div className="mt-2 flex h-16 items-end gap-1.5" aria-hidden="true">
                <div
                  className="w-1/2 rounded-t bg-[var(--harbor-mid)]"
                  style={{ height: `${Math.max(arHeight, 2)}%` }}
                />
                <div
                  className="w-1/2 rounded-t bg-[var(--harbor-deep)]/45"
                  style={{ height: `${Math.max(apHeight, 2)}%` }}
                />
              </div>

              <dl className="mt-2 space-y-0.5 text-[11px] leading-tight">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--harbor-ink)]/55">A/R billed</dt>
                  <dd className="tabular-nums">
                    {monthlyMarginMoney(row.totalReceivableBilled)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--harbor-ink)]/55">A/P owed</dt>
                  <dd className="tabular-nums">
                    {monthlyMarginMoney(row.totalPayableOwed)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-[var(--harbor-deep)]/10 pt-1 font-semibold">
                  <dt className="text-[var(--harbor-ink)]/70">Net margin</dt>
                  <dd
                    className={`tabular-nums ${
                      positive ? "text-success" : "text-error"
                    }`}
                  >
                    {monthlyMarginMoney(row.netMargin)}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
