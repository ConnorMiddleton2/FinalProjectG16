"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  emptyTenantInvoice,
  seedTenantInvoices,
  type TenantInvoice,
} from "@/lib/portal-records";
import { money } from "@/lib/management";
import { parseInvoiceAmount } from "@/lib/ar-revenue";

export function AccountsReceivableDashboard() {
  const {
    items: invoices,
    saveOne,
    loading,
    error,
  } = useSharedCollection<TenantInvoice>(
    COLLECTIONS.tenantInvoices,
    seedTenantInvoices
  );
  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );
  const [form, setForm] = useState(emptyTenantInvoice());
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const propertyOptions = useMemo(
    () =>
      [...properties]
        .map((p) => ({
          id: p.id,
          name: p.propertyName || "Untitled property",
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [properties]
  );

  const paidTotal = useMemo(
    () =>
      invoices
        .filter((i) => i.status === "Paid")
        .reduce((s, i) => s + parseInvoiceAmount(i.amount), 0),
    [invoices]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || parseInvoiceAmount(form.amount) <= 0) return;
    const prop = propertyOptions.find((p) => p.id === form.propertyId);
    const dueDate = form.dueDate || form.due;
    const now = new Date().toISOString().slice(0, 10);
    await saveOne({
      ...form,
      id: crypto.randomUUID(),
      label: form.label.trim(),
      propertyName: prop?.name || form.propertyName || "",
      due: form.due || dueDate,
      dueDate: dueDate || undefined,
      paidAt:
        form.status === "Paid" ? form.paidAt || dueDate || now : form.paidAt,
    });
    setForm(emptyTenantInvoice());
    setShowForm(false);
    setMsg("Invoice saved. Paid amounts feed Management budget revenue.");
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm opacity-65">
            Paid invoices are the source of truth for property revenue in
            Management budgets.
          </p>
        </div>
        <div className="rounded-lg border border-[#8aa3b5]/45 bg-[#d5dee5] px-3 py-1 text-right">
          <p className="text-[9px] uppercase tracking-wide opacity-55">
            Paid (all time)
          </p>
          <p className="text-lg font-semibold text-emerald-800">
            {money(paidTotal)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-neutral btn-sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Hide form" : "Add invoice"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}
      {loading && <p className="text-sm opacity-60">Loading…</p>}

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="grid gap-2 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 sm:grid-cols-3"
        >
          <select
            className="select select-bordered select-sm bg-white"
            value={form.propertyId || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                propertyId: e.target.value,
                propertyName:
                  propertyOptions.find((p) => p.id === e.target.value)?.name ||
                  "",
              }))
            }
          >
            <option value="">Property (optional)</option>
            {propertyOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className="input input-bordered input-sm bg-white"
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            required
          />
          <input
            className="input input-bordered input-sm bg-white"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <input
            type="date"
            className="input input-bordered input-sm bg-white"
            value={form.dueDate || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                dueDate: e.target.value,
                due: e.target.value,
              }))
            }
          />
          <select
            className="select select-bordered select-sm bg-white"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as TenantInvoice["status"],
              }))
            }
          >
            <option value="Paid">Paid</option>
            <option value="Due">Due</option>
            <option value="Overdue">Overdue</option>
          </select>
          <button type="submit" className="btn btn-neutral btn-sm">
            Save invoice
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 shadow-sm">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Property</th>
              <th>Label</th>
              <th>Amount</th>
              <th>Due / paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center opacity-55">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="max-w-[8rem] truncate text-xs">
                    {inv.propertyName || "—"}
                  </td>
                  <td className="max-w-[12rem] truncate">{inv.label}</td>
                  <td>{inv.amount}</td>
                  <td className="text-xs opacity-70">
                    {inv.paidAt || inv.dueDate || inv.due}
                  </td>
                  <td>
                    <select
                      className="select select-bordered select-xs bg-white"
                      value={inv.status}
                      onChange={(e) => {
                        const status = e.target
                          .value as TenantInvoice["status"];
                        const paidAt =
                          status === "Paid"
                            ? inv.paidAt ||
                              inv.dueDate ||
                              new Date().toISOString().slice(0, 10)
                            : inv.paidAt;
                        void saveOne({ ...inv, status, paidAt });
                      }}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Due">Due</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
