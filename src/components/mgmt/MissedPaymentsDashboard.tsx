"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  balanceOf,
  daysLate,
  isOverdue,
  money as arMoney,
  seedRentalReceivables,
  type Receivable,
} from "@/lib/accounts-receivable";
import {
  money,
  seedMissedPayments,
  type MissedPayment,
} from "@/lib/management";

function riskBadge(risk: MissedPayment["risk"]) {
  if (risk === "foreclosure_risk") return "badge-error";
  if (risk === "elevated") return "badge-warning";
  return "badge-ghost";
}

function arRisk(days: number): MissedPayment["risk"] {
  if (days >= 60) return "foreclosure_risk";
  if (days >= 30) return "elevated";
  return "watch";
}

export function MissedPaymentsDashboard() {
  const {
    items,
    loading,
    error,
  } = useSharedCollection<MissedPayment>(
    COLLECTIONS.missedPayments,
    seedMissedPayments
  );
  const {
    items: rentalReceivables,
    loading: arLoading,
  } = useSharedCollection<Receivable>(
    COLLECTIONS.rentalReceivables,
    seedRentalReceivables
  );

  const overdueAr = useMemo(
    () =>
      rentalReceivables
        .filter((row) => isOverdue(row))
        .sort((a, b) => daysLate(b) - daysLate(a)),
    [rentalReceivables]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedArId, setSelectedArId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"case" | "ar">("case");

  const selected =
    items.find((i) => i.id === selectedId) ??
    (detailMode === "case" ? items[0] ?? null : null);
  const selectedAr =
    overdueAr.find((r) => r.id === selectedArId) ??
    (detailMode === "ar" ? overdueAr[0] ?? null : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm opacity-65">
          Escalation cases for chronic delinquency, plus open overdue balances
          from Accounts Receivable so collections and A/R stay connected.
        </p>
        <Link href="/ops/ar" className="btn btn-outline btn-sm">
          Open Accounts Receivable →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide opacity-55">
            Escalation cases
          </p>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {loading && (
            <p className="text-sm opacity-60">Loading delinquencies…</p>
          )}
          {items.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                setSelectedId(row.id);
                setSelectedArId(null);
                setDetailMode("case");
              }}
              className={`w-full rounded-xl border px-3 py-3 text-left ${
                detailMode === "case" && selected?.id === row.id
                  ? "border-[var(--harbor-mid)] bg-white shadow-sm"
                  : "border-[var(--harbor-deep)]/10 bg-white/80"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{row.tenantName}</p>
                  <p className="text-sm opacity-70">
                    {row.property} · {row.unit}
                  </p>
                </div>
                <span className={`badge badge-sm ${riskBadge(row.risk)}`}>
                  {row.risk.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {money(row.amountDue)} · {row.daysPastDue}d past due ·{" "}
                {row.lateCount12mo} lates / 12mo
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 shadow-sm">
          {!selected ? (
            <p className="text-sm opacity-60">Select a delinquent tenant.</p>
          ) : (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">{selected.tenantName}</h2>
              <p className="text-sm opacity-70">
                {selected.property} · {selected.unit}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="opacity-60">Amount due:</span>{" "}
                  {money(selected.amountDue)}
                </p>
                <p>
                  <span className="opacity-60">Days past due:</span>{" "}
                  {selected.daysPastDue}
                </p>
                <p>
                  <span className="opacity-60">Lates (12 mo):</span>{" "}
                  {selected.lateCount12mo}
                </p>
                <p>
                  <span className="opacity-60">Last payment:</span>{" "}
                  {selected.lastPaymentAt}
                </p>
              </div>
              <p className="text-sm">{selected.notes}</p>
              <div>
                <p className="mb-1 text-sm font-medium">
                  What to do
                  {selected.risk === "foreclosure_risk"
                    ? " (foreclosure / possession path)"
                    : ""}
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {(selected.foreclosureChecklist ?? []).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {selected.risk === "foreclosure_risk" ? (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-900">
                    Do not involve law enforcement for lockout until you have a
                    court judgment / writ. Coordinate through counsel and the
                    sheriff or constable process for your jurisdiction.
                  </p>
                ) : null}
              </div>
              <Link
                href="/ops/ar"
                className="link link-hover text-sm font-medium"
              >
                Review matching balances in Accounts Receivable →
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Open A/R overdue</h3>
            <p className="text-sm opacity-60">
              Live rental receivables past due — same balances shown on{" "}
              <Link href="/ops/ar" className="link link-hover">
                Accounts Receivable
              </Link>
              .
            </p>
          </div>
          <span className="badge badge-sm badge-warning">
            {overdueAr.length} overdue
          </span>
        </div>
        {arLoading ? (
          <p className="text-sm opacity-60">Loading A/R…</p>
        ) : overdueAr.length === 0 ? (
          <p className="text-sm opacity-60">No overdue rental receivables.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {overdueAr.map((row) => {
                const late = daysLate(row);
                const risk = arRisk(late);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setSelectedArId(row.id);
                      setSelectedId(null);
                      setDetailMode("ar");
                    }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left ${
                      detailMode === "ar" && selectedAr?.id === row.id
                        ? "border-[var(--harbor-mid)] bg-white shadow-sm"
                        : "border-[var(--harbor-deep)]/10 bg-white/80"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{row.customerName}</p>
                        <p className="text-sm opacity-70">
                          {row.property}
                          {row.unit ? ` · ${row.unit}` : ""}
                        </p>
                      </div>
                      <span className={`badge badge-sm ${riskBadge(risk)}`}>
                        {late}d late
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      {arMoney(balanceOf(row))} open · {row.receivableId} ·{" "}
                      {row.period}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-mist)]/40 p-3 text-sm">
              {!selectedAr ? (
                <p className="opacity-60">Select an overdue receivable.</p>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold">{selectedAr.customerName}</p>
                  <p className="opacity-70">
                    {selectedAr.property}
                    {selectedAr.unit ? ` · ${selectedAr.unit}` : ""}
                  </p>
                  <p>
                    Balance due:{" "}
                    <strong>{arMoney(balanceOf(selectedAr))}</strong>
                  </p>
                  <p>
                    Invoice {selectedAr.receivableId} · due {selectedAr.dueDate}{" "}
                    · {daysLate(selectedAr)} days past due
                  </p>
                  {selectedAr.notes ? (
                    <p className="opacity-80">{selectedAr.notes}</p>
                  ) : null}
                  <Link
                    href="/ops/ar"
                    className="btn btn-neutral btn-sm mt-2 inline-flex"
                  >
                    Collect in Accounts Receivable →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
