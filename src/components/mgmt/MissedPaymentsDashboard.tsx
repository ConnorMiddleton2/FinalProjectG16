"use client";

import { useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
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

export function MissedPaymentsDashboard() {
  const {
    items,
    loading,
    error,
  } = useSharedCollection<MissedPayment>(
    COLLECTIONS.missedPayments,
    seedMissedPayments
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? items[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-2">
        {error && <p className="text-sm text-red-700">{error}</p>}
        {loading && <p className="text-sm opacity-60">Loading delinquencies…</p>}
        {items.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setSelectedId(row.id)}
            className={`w-full rounded-xl border px-3 py-3 text-left ${
              selected?.id === row.id
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
          </div>
        )}
      </div>
    </div>
  );
}
