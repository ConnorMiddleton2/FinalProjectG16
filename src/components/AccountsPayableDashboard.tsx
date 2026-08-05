"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  FileText,
  LogOut,
  Plus,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  balanceOf,
  daysLate,
  emptyPayableForm,
  isOverdue,
  money,
  parsePaidAmount,
  parsePositiveAmount,
  payableCategoryLabel,
  payableStatusLabel,
  PAYABLE_CATEGORIES,
  round2,
  seedPayableInvoices,
  statusOf,
  todayIso,
  type PayableCategory,
  type PayableFormState,
  type PayableInvoice,
  type PayableStatus,
} from "@/lib/accounts-payable";

const STATUS_BADGE: Record<PayableStatus, string> = {
  unpaid: "badge-warning",
  partially_paid: "badge-info",
  paid: "badge-success",
  disputed: "badge-error",
};

const cardClass =
  "rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm";

export function AccountsPayableDashboard() {
  const {
    items: invoices,
    saveOne,
    loading,
    error,
  } = useSharedCollection<PayableInvoice>(
    COLLECTIONS.payableInvoices,
    seedPayableInvoices
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<PayableFormState>(emptyPayableForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const today = todayIso();

  const totals = useMemo(() => {
    let billed = 0;
    let paid = 0;
    let outstanding = 0;
    let overdue = 0;
    let overdueCount = 0;
    let dueSoon = 0;
    let disputed = 0;
    let openCount = 0;

    for (const inv of invoices) {
      const balance = balanceOf(inv);
      billed += inv.amount;
      paid += inv.amountPaid;
      outstanding += balance;
      if (balance > 0) openCount += 1;
      if (inv.disputed) disputed += balance;
      if (isOverdue(inv, today)) {
        overdue += balance;
        overdueCount += 1;
      } else if (balance > 0 && daysLate(inv, today) >= -30) {
        dueSoon += balance;
      }
    }

    return {
      billed: round2(billed),
      paid: round2(paid),
      outstanding: round2(outstanding),
      overdue: round2(overdue),
      overdueCount,
      dueSoon: round2(dueSoon),
      disputed: round2(disputed),
      openCount,
    };
  }, [invoices, today]);

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const aOpen = balanceOf(a) > 0 ? 0 : 1;
      const bOpen = balanceOf(b) > 0 ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      const aDue = a.dueDate || "9999-12-31";
      const bDue = b.dueDate || "9999-12-31";
      return aDue.localeCompare(bDue);
    });
  }, [invoices]);

  const knownProperties = useMemo(
    () =>
      Array.from(
        new Set(invoices.map((i) => i.property).filter(Boolean))
      ).sort(),
    [invoices]
  );

  const knownVendors = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invoices) {
      if (inv.vendorName && !map.has(inv.vendorName)) {
        map.set(inv.vendorName, inv.vendorId);
      }
    }
    return map;
  }, [invoices]);

  const viewing = invoices.find((i) => i.id === viewingId) ?? null;

  useEffect(() => {
    if (!viewing && !showAddForm) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setViewingId(null);
      setShowAddForm(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewing, showAddForm]);

  function updateForm<K extends keyof PayableFormState>(
    key: K,
    value: PayableFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleVendorNameChange(name: string) {
    setForm((prev) => {
      const knownId = knownVendors.get(name);
      return {
        ...prev,
        vendorName: name,
        vendorId: knownId ?? prev.vendorId,
      };
    });
  }

  function openAddForm() {
    setForm(emptyPayableForm());
    setFormError(null);
    setShowAddForm(true);
  }

  async function handleAddInvoice(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const invoiceNumber = form.invoiceNumber.trim();
    const vendorName = form.vendorName.trim();
    const vendorId = form.vendorId.trim();

    if (!invoiceNumber || !vendorName || !vendorId) {
      setFormError("Invoice ID, vendor name, and vendor ID are all required.");
      return;
    }

    const amount = parsePositiveAmount(form.amount);
    if (amount === null) {
      setFormError("Total owed must be a positive dollar amount.");
      return;
    }

    const amountPaid = parsePaidAmount(form.amountPaid);
    if (amountPaid === null) {
      setFormError("Amount paid cannot be negative.");
      return;
    }
    if (amountPaid > amount) {
      setFormError("Amount paid cannot be more than the total owed.");
      return;
    }

    const duplicate = invoices.find(
      (inv) =>
        inv.vendorName.trim().toLowerCase() === vendorName.toLowerCase() &&
        inv.invoiceNumber.trim().toLowerCase() === invoiceNumber.toLowerCase()
    );
    if (duplicate) {
      setFormError(
        `${vendorName} already has invoice ${invoiceNumber} on file. Duplicate invoices cannot be entered twice.`
      );
      return;
    }

    if (
      form.dueDate &&
      form.invoiceDate &&
      form.dueDate < form.invoiceDate
    ) {
      setFormError("Due date cannot be earlier than the invoice date.");
      return;
    }

    const next: PayableInvoice = {
      id: crypto.randomUUID(),
      invoiceNumber,
      vendorName,
      vendorId,
      category: form.category,
      property: form.property.trim(),
      amount,
      amountPaid,
      disputed: form.disputed,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      fileName: form.fileName,
      notes: form.notes.trim(),
      createdAt: todayIso(),
    };

    try {
      await saveOne(next);
      setShowAddForm(false);
      setForm(emptyPayableForm());
      setSavedMsg(
        `Invoice ${invoiceNumber} from ${vendorName} added to accounts payable.`
      );
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save the invoice."
      );
    }
  }

  async function applyPayment(invoice: PayableInvoice) {
    const amount = parsePositiveAmount(paymentAmount);
    if (amount === null) {
      setFormError("Payment must be a positive dollar amount.");
      return;
    }
    const balance = balanceOf(invoice);
    if (amount > balance) {
      setFormError(
        `Payment cannot exceed the remaining balance of ${money(balance)}.`
      );
      return;
    }

    setFormError(null);
    await saveOne({
      ...invoice,
      amountPaid: round2(invoice.amountPaid + amount),
    });
    setPaymentAmount("");
    setSavedMsg(
      `Recorded a ${money(amount)} payment on invoice ${invoice.invoiceNumber}.`
    );
    setTimeout(() => setSavedMsg(null), 4000);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Accounts payable</p>
          </div>
          <form action={teamLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <Link
          href="/ops"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to operations
        </Link>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {savedMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {savedMsg}
          </div>
        )}

        <section className={`${cardClass} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--harbor-ink)]/55">
                Total accounts payable
              </p>
              <p className="font-display mt-1 text-5xl leading-none tracking-tight text-[var(--harbor-ink)] sm:text-6xl">
                {money(totals.outstanding)}
              </p>
              <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
                Unpaid balance owed to vendors across {totals.openCount} open{" "}
                {totals.openCount === 1 ? "invoice" : "invoices"} ·{" "}
                {money(totals.billed)} billed to date · {money(totals.paid)}{" "}
                paid to date
              </p>
            </div>

            <button
              type="button"
              onClick={openAddForm}
              className="btn gap-2 border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)] hover:bg-[var(--harbor-deep)]"
            >
              <Plus className="h-4 w-4" />
              Add invoice
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-red-900/70">
                Past due
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-red-800">
                {money(totals.overdue)}
              </p>
              <p className="text-xs text-red-900/70">
                {totals.overdueCount}{" "}
                {totals.overdueCount === 1 ? "invoice" : "invoices"} past the
                due date
              </p>
            </div>
            <div className="rounded-xl border border-[var(--harbor-mid)]/25 bg-[var(--harbor-mist)]/50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-ink)]/60">
                Due in next 30 days
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--harbor-ink)]">
                {money(totals.dueSoon)}
              </p>
              <p className="text-xs text-[var(--harbor-ink)]/60">
                Cash needed for upcoming vendor payments
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-900/70">
                Disputed / on hold
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800">
                {money(totals.disputed)}
              </p>
              <p className="text-xs text-amber-900/70">
                Held out of the payment run until resolved
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-4 py-3 text-sm opacity-70">
            Loading shared accounts payable data…
          </div>
        ) : null}

        <section className={`overflow-x-auto ${cardClass}`}>
          <table className="table">
            <thead>
              <tr>
                <th className="text-right">Total owed</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance due</th>
                <th>Status</th>
                <th>Due date</th>
                <th>Invoice ID</th>
                <th>Invoice</th>
                <th>Vendor name</th>
                <th>Vendor ID</th>
                <th>Category</th>
                <th>Property</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center opacity-60">
                    No payables on file yet. Use “Add invoice” to enter one.
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((inv) => {
                  const status = statusOf(inv);
                  const balance = balanceOf(inv);
                  const overdue = isOverdue(inv, today);
                  const late = daysLate(inv, today);
                  return (
                    <tr
                      key={inv.id}
                      className={
                        overdue
                          ? "bg-red-50/60"
                          : inv.disputed
                            ? "bg-amber-50/60"
                            : undefined
                      }
                    >
                      <td className="text-right font-semibold tabular-nums">
                        {money(inv.amount)}
                      </td>
                      <td className="text-right tabular-nums opacity-70">
                        {money(inv.amountPaid)}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {money(balance)}
                      </td>
                      <td>
                        <span
                          className={`badge whitespace-nowrap ${STATUS_BADGE[status]}`}
                        >
                          {payableStatusLabel(status)}
                        </span>
                        {overdue ? (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
                            <TriangleAlert className="h-3 w-3" />
                            {late} {late === 1 ? "day" : "days"} late
                          </p>
                        ) : null}
                      </td>
                      <td className="text-sm whitespace-nowrap">
                        {inv.dueDate || "—"}
                      </td>
                      <td className="text-sm">
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs opacity-55">
                          Invoiced {inv.invoiceDate || "—"}
                        </p>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setViewingId(inv.id);
                            setPaymentAmount("");
                            setFormError(null);
                          }}
                          className="btn btn-xs btn-outline gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </td>
                      <td className="text-sm">{inv.vendorName}</td>
                      <td className="text-sm tabular-nums opacity-70">
                        {inv.vendorId}
                      </td>
                      <td>
                        <span className="badge badge-ghost badge-sm whitespace-nowrap">
                          {payableCategoryLabel(inv.category)}
                        </span>
                      </td>
                      <td className="text-sm">{inv.property || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedInvoices.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-[var(--harbor-deep)]/20 text-[var(--harbor-ink)]">
                  <td className="text-right font-semibold tabular-nums">
                    {money(totals.billed)}
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {money(totals.paid)}
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {money(totals.outstanding)}
                  </td>
                  <td colSpan={8} className="text-xs uppercase tracking-wide opacity-60">
                    {sortedInvoices.length} invoices on file
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </section>
      </main>

      {showAddForm ? (
        <ModalShell
          title="Add invoice to accounts payable"
          onClose={() => setShowAddForm(false)}
        >
          <form onSubmit={handleAddInvoice} className="space-y-4">
            {formError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {formError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Total owed <span className="text-red-600">*</span>
                </span>
                <CurrencyInput
                  value={form.amount}
                  onChange={(v) => updateForm("amount", v)}
                  placeholder="0.00"
                  required
                />
                <span className="mt-1 text-xs opacity-55">
                  Positive amounts only.
                </span>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Amount already paid
                </span>
                <CurrencyInput
                  value={form.amountPaid}
                  onChange={(v) => updateForm("amountPaid", v)}
                  placeholder="0.00"
                />
                <span className="mt-1 text-xs opacity-55">
                  Leave blank if nothing has been paid yet.
                </span>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Invoice ID <span className="text-red-600">*</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.invoiceNumber}
                  onChange={(e) => updateForm("invoiceNumber", e.target.value)}
                  placeholder="OXF-4412"
                  required
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Invoice category <span className="text-red-600">*</span>
                </span>
                <select
                  className="select select-bordered w-full"
                  value={form.category}
                  onChange={(e) =>
                    updateForm("category", e.target.value as PayableCategory)
                  }
                >
                  {PAYABLE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Vendor name <span className="text-red-600">*</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.vendorName}
                  onChange={(e) => handleVendorNameChange(e.target.value)}
                  list="ap-vendor-names"
                  placeholder="Oxford HVAC Pros"
                  required
                />
                <datalist id="ap-vendor-names">
                  {Array.from(knownVendors.keys()).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Vendor ID <span className="text-red-600">*</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.vendorId}
                  onChange={(e) => updateForm("vendorId", e.target.value)}
                  placeholder="V-1001"
                  required
                />
                <span className="mt-1 text-xs opacity-55">
                  Fills in automatically for vendors already on file.
                </span>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Property</span>
                <input
                  className="input input-bordered w-full"
                  value={form.property}
                  onChange={(e) => updateForm("property", e.target.value)}
                  list="ap-properties"
                  placeholder="Riverbend Commerce Center"
                />
                <datalist id="ap-properties">
                  {knownProperties.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Invoice date</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.invoiceDate}
                    onChange={(e) => updateForm("invoiceDate", e.target.value)}
                  />
                </label>
                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Due date</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.dueDate}
                    onChange={(e) => updateForm("dueDate", e.target.value)}
                  />
                </label>
              </div>

              <label className="form-control w-full sm:col-span-2">
                <span className="mb-1 flex items-center gap-2 text-sm opacity-70">
                  <Upload className="h-4 w-4" />
                  Attach invoice PDF
                </span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="file-input file-input-bordered w-full"
                  onChange={(e) =>
                    updateForm("fileName", e.target.files?.[0]?.name ?? "")
                  }
                />
                <span className="mt-1 text-xs opacity-55">
                  {form.fileName
                    ? `Attached: ${form.fileName}`
                    : "The file name is saved with the invoice record; document storage is not enabled in this build."}
                </span>
              </label>

              <label className="form-control w-full sm:col-span-2">
                <span className="mb-1 text-sm opacity-70">Notes</span>
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full"
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="What was billed, and which work or property it relates to."
                />
              </label>

              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.disputed}
                  onChange={(e) => updateForm("disputed", e.target.checked)}
                />
                Flag this invoice as disputed and hold it out of the payment run
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-base-300 pt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-neutral gap-2">
                <Plus className="h-4 w-4" />
                Add to accounts payable
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {viewing ? (
        <ModalShell
          title={`Invoice ${viewing.invoiceNumber} · ${viewing.vendorName}`}
          onClose={() => setViewingId(null)}
          wide
        >
          <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--harbor-deep)]/15 bg-[#f4f6f8]">
              <div className="flex items-center gap-2 border-b border-[var(--harbor-deep)]/15 bg-[var(--harbor-ink)]/90 px-3 py-2 text-xs text-[var(--harbor-sand)]">
                <FileText className="h-4 w-4" />
                <span className="truncate">
                  {viewing.fileName || "no-file-attached.pdf"}
                </span>
              </div>
              <div className="flex min-h-[460px] flex-1 p-5">
                <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--harbor-deep)]/25 bg-white px-6 py-10 text-center">
                  <FileText className="h-10 w-10 text-[var(--harbor-deep)]/40" />
                  <p className="text-lg font-semibold text-[var(--harbor-ink)]/70">
                    Invoice PDF here
                  </p>
                  <p className="max-w-xs text-xs text-[var(--harbor-ink)]/50">
                    Document preview placeholder. The attached file name is
                    recorded with the invoice; stored PDF rendering is not
                    enabled in this build.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide opacity-55">
                  Balance due
                </p>
                <p className="font-display text-3xl leading-none text-[var(--harbor-ink)]">
                  {money(balanceOf(viewing))}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`badge badge-sm whitespace-nowrap ${STATUS_BADGE[statusOf(viewing)]}`}
                  >
                    {payableStatusLabel(statusOf(viewing))}
                  </span>
                  {isOverdue(viewing, today) ? (
                    <span className="flex items-center gap-1 font-medium text-red-700">
                      <TriangleAlert className="h-3 w-3" />
                      {daysLate(viewing, today)} days past due
                    </span>
                  ) : null}
                </p>
              </div>

              <dl className="divide-y divide-base-300 rounded-xl border border-[var(--harbor-deep)]/15 bg-white text-sm">
                <DetailRow label="Invoice ID" value={viewing.invoiceNumber} />
                <DetailRow label="Vendor name" value={viewing.vendorName} />
                <DetailRow label="Vendor ID" value={viewing.vendorId} />
                <DetailRow
                  label="Invoice category"
                  value={payableCategoryLabel(viewing.category)}
                />
                <DetailRow label="Property" value={viewing.property || "—"} />
                <DetailRow
                  label="Total owed"
                  value={money(viewing.amount)}
                  emphasize
                />
                <DetailRow
                  label="Paid to date"
                  value={money(viewing.amountPaid)}
                />
                <DetailRow
                  label="Invoice date"
                  value={viewing.invoiceDate || "—"}
                />
                <DetailRow label="Due date" value={viewing.dueDate || "—"} />
                <DetailRow
                  label="Attachment"
                  value={viewing.fileName || "None attached"}
                />
                <DetailRow label="Entered" value={viewing.createdAt || "—"} />
              </dl>

              {viewing.notes ? (
                <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide opacity-55">
                    Notes
                  </p>
                  <p className="mt-1 text-sm opacity-80">{viewing.notes}</p>
                </div>
              ) : null}

              {balanceOf(viewing) > 0 ? (
                <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-4">
                  <p className="text-sm font-semibold">Record a payment</p>
                  {formError ? (
                    <p className="mt-2 text-xs text-red-700">{formError}</p>
                  ) : null}
                  <div className="mt-2 flex items-end gap-2">
                    <CurrencyInput
                      value={paymentAmount}
                      onChange={setPaymentAmount}
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      className="btn btn-neutral btn-sm whitespace-nowrap"
                      onClick={() => void applyPayment(viewing)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function DetailRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2">
      <dt className="opacity-55">{label}</dt>
      <dd
        className={`text-right ${
          emphasize ? "font-semibold tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function CurrencyInput({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex h-12 w-full items-center rounded-lg border border-base-300 bg-white transition focus-within:border-[var(--harbor-mid)] focus-within:ring-2 focus-within:ring-[var(--harbor-mid)]/25">
      <span className="pl-3 pr-1 text-base font-medium opacity-60">$</span>
      <input
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        className="h-full w-full flex-1 rounded-r-lg bg-transparent pr-3 text-base tabular-nums outline-none"
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value.replace(/-/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "e" || e.key === "E") {
            e.preventDefault();
          }
        }}
      />
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--harbor-ink)]/55 p-4 sm:p-8">
      <div
        className={`w-full ${
          wide ? "max-w-5xl" : "max-w-3xl"
        } rounded-2xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-sand)] shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--harbor-deep)]/15 px-6 py-4">
          <h2 className="font-display text-2xl leading-tight text-[var(--harbor-ink)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
