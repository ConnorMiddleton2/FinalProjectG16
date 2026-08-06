"use client";

import { FormEvent, useMemo, useState } from "react";
import { BudgetFillBar } from "@/components/mgmt/BudgetFillBar";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  emptyReceipt,
  money,
  netBudget,
  normalizeBudgetConfig,
  normalizeSmCode,
  seedBudgetConfig,
  SM_CODES,
  type SmBudgetConfig,
  type SmCode,
  type SmReceipt,
} from "@/lib/sales-marketing";

export function BudgetDashboard() {
  const {
    items: configs,
    loading: configLoading,
  } = useSharedCollection<SmBudgetConfig>(
    COLLECTIONS.smBudgetConfig,
    seedBudgetConfig
  );
  const {
    items: receipts,
    saveOne: saveReceipt,
    loading,
    error,
  } = useSharedCollection<SmReceipt>(COLLECTIONS.smReceipts);

  const config = normalizeBudgetConfig(configs[0]);
  const categories = config.categories;
  const [form, setForm] = useState(emptyReceipt);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const net = useMemo(() => netBudget(categories), [categories]);

  const approvedTotal = useMemo(
    () =>
      receipts
        .filter((r) => r.status === "approved")
        .reduce((s, r) => s + r.amount, 0),
    [receipts]
  );
  const pendingTotal = useMemo(
    () =>
      receipts
        .filter((r) => r.status === "pending")
        .reduce((s, r) => s + r.amount, 0),
    [receipts]
  );

  function amountsFor(code: SmCode) {
    const approved = receipts
      .filter(
        (r) => normalizeSmCode(r.code) === code && r.status === "approved"
      )
      .reduce((s, r) => s + r.amount, 0);
    const pending = receipts
      .filter(
        (r) => normalizeSmCode(r.code) === code && r.status === "pending"
      )
      .reduce((s, r) => s + r.amount, 0);
    return { approved, pending };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.vendor.trim() || form.amount <= 0) return;
    await saveReceipt({
      ...form,
      id: crypto.randomUUID(),
      code: normalizeSmCode(form.code),
      vendor: form.vendor.trim(),
      fileName: form.fileName.trim() || "receipt.pdf",
      submittedAt: new Date().toISOString(),
      status: "pending",
    });
    setForm(emptyReceipt());
    setShowForm(false);
    setMsg("Receipt submitted for Management approval.");
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-3 shadow-sm space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold leading-tight text-[var(--harbor-ink)]">
            {config.label}
          </h2>
          <p className="text-[11px] opacity-60">
            Budgets set by Management · code receipts SM001–SM005
          </p>
        </div>
        <div className="rounded-lg border border-[#8aa3b5]/45 bg-[#d5dee5] px-3 py-1 text-right">
          <p className="text-[9px] uppercase tracking-wide opacity-55">
            Net budgeted
          </p>
          <p className="text-lg font-semibold leading-tight text-[#2f4556]">
            {money(net)}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex flex-wrap justify-between gap-2 text-[11px] font-medium">
          <span>Overall</span>
          <span>
            {money(approvedTotal)} approved · {money(pendingTotal)} pending ·{" "}
            {money(net - approvedTotal)} left
          </span>
        </div>
        <BudgetFillBar
          budgeted={net}
          approved={approvedTotal}
          pending={pendingTotal}
        />
      </div>

      <div className="space-y-1">
        {categories.map((cat) => {
          const { approved, pending } = amountsFor(cat.code);
          return (
            <div
              key={cat.code}
              className="grid grid-cols-[4.25rem_1fr] items-center gap-2"
            >
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold leading-none text-[#2f4556]">
                  {cat.code}
                </p>
                <p className="truncate text-[9px] leading-tight opacity-55">
                  {cat.label}
                </p>
              </div>
              <BudgetFillBar
                budgeted={cat.budgeted}
                approved={approved}
                pending={pending}
                compact
              />
            </div>
          );
        })}
      </div>

      <div className="border-t border-base-200 pt-2 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Receipt coding</h3>
          <button
            type="button"
            className="btn btn-neutral btn-xs"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Hide" : "Submit receipt"}
          </button>
        </div>

        {error && <p className="text-xs text-red-700">{error}</p>}
        {msg && <p className="text-xs text-emerald-800">{msg}</p>}
        {(loading || configLoading) && (
          <p className="text-xs opacity-60">Loading…</p>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="grid gap-1.5 rounded-lg border border-base-300 bg-base-100 p-2 sm:grid-cols-4"
          >
            <select
              className="select select-bordered select-xs bg-white"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value as SmCode }))
              }
            >
              {SM_CODES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value} · {c.label.split("·")[1]?.trim() ?? c.label}
                </option>
              ))}
            </select>
            <input
              className="input input-bordered input-xs bg-white"
              placeholder="Vendor"
              value={form.vendor}
              onChange={(e) =>
                setForm((f) => ({ ...f, vendor: e.target.value }))
              }
              required
            />
            <input
              type="number"
              className="input input-bordered input-xs bg-white"
              placeholder="Amount"
              value={form.amount || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  amount: Number(e.target.value) || 0,
                }))
              }
              required
            />
            <button type="submit" className="btn btn-neutral btn-xs">
              Submit
            </button>
          </form>
        )}

        <div className="max-h-28 overflow-y-auto rounded-lg border border-base-300">
          <table className="table table-xs">
            <thead>
              <tr>
                <th>Code</th>
                <th>Vendor</th>
                <th>$</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-center opacity-55">
                    No receipts yet.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-semibold">
                      {normalizeSmCode(r.code)}
                    </td>
                    <td className="max-w-[10rem] truncate">{r.vendor}</td>
                    <td>{money(r.amount)}</td>
                    <td className="capitalize">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] opacity-50">
          Approvals happen in Management → Approve receipts &amp; invoices.
        </p>
      </div>
    </div>
  );
}
