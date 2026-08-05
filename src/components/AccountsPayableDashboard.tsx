"use client";

import { useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  money,
  seedApPayables,
  type ApPayable,
  type ApPayableStatus,
} from "@/lib/management";

const STATUSES: ApPayableStatus[] = [
  "queued",
  "in_progress",
  "paid",
  "on_hold",
];

export function AccountsPayableDashboard() {
  const {
    items,
    saveOne,
    loading,
    error,
  } = useSharedCollection<ApPayable>(COLLECTIONS.apPayables, seedApPayables);

  const [filter, setFilter] = useState<"open" | "all">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const rows = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
    if (filter === "open") {
      return sorted.filter((r) => r.status !== "paid");
    }
    return sorted;
  }, [items, filter]);

  const selected = items.find((r) => r.id === selectedId) ?? null;
  const openTotal = items
    .filter((r) => r.status !== "paid")
    .reduce((s, r) => s + r.amount, 0);

  async function setStatus(row: ApPayable, status: ApPayableStatus) {
    await saveOne({
      ...row,
      status,
      paidAt: status === "paid" ? new Date().toISOString() : row.paidAt,
    });
    setMsg(
      status === "paid"
        ? "Marked paid."
        : `Status updated to ${status.replaceAll("_", " ")}.`
    );
    setTimeout(() => setMsg(null), 2500);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm opacity-65">
          Invoices and receipts approved by Management land here for payment
          processing.
        </p>
        <select
          className="select select-bordered select-sm bg-white"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "open" | "all")}
        >
          <option value="open">Open (not paid)</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3 text-sm">
        Open payables: <strong>{money(openTotal)}</strong>
      </div>

      {loading && <p className="text-sm opacity-60">Loading AP queue…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Dept</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center opacity-60">
                    No payables yet. Approve expenses in Management first.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer ${
                      selectedId === row.id ? "bg-[var(--harbor-mist)]/50" : ""
                    }`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td>
                      <p className="font-medium">{row.vendor}</p>
                      <p className="font-mono text-[10px] opacity-55">
                        {row.code}
                      </p>
                    </td>
                    <td className="text-sm">{row.departmentLabel}</td>
                    <td>{money(row.amount)}</td>
                    <td>
                      <span className="badge badge-sm capitalize">
                        {row.status.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 shadow-sm">
          {!selected ? (
            <p className="text-sm opacity-60">Select a payable to manage.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{selected.vendor}</h2>
                <p className="text-sm opacity-65">
                  {selected.departmentLabel} · {selected.code}
                </p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs opacity-55">Amount</dt>
                  <dd className="font-semibold">{money(selected.amount)}</dd>
                </div>
                <div>
                  <dt className="text-xs opacity-55">Received from Mgmt</dt>
                  <dd>
                    {new Date(selected.receivedAt).toLocaleString()}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs opacity-55">Description</dt>
                  <dd className="whitespace-pre-wrap">
                    {selected.description || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs opacity-55">Attachment</dt>
                  <dd>{selected.fileName || "—"}</dd>
                </div>
              </dl>
              <label className="form-control">
                <span className="label-text text-xs mb-1">AP notes</span>
                <textarea
                  className="textarea textarea-bordered textarea-sm bg-white"
                  value={selected.notes}
                  onChange={(e) =>
                    void saveOne({ ...selected, notes: e.target.value })
                  }
                  rows={2}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn-xs capitalize ${
                      selected.status === s ? "btn-neutral" : "btn-outline"
                    }`}
                    onClick={() => void setStatus(selected, s)}
                  >
                    {s.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
