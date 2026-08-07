"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileText,
  LoaderCircle,
  Plus,
  Sparkles,
  TriangleAlert,
  Upload,
} from "lucide-react";
import {
  CurrencyInput,
  DetailRow,
  ModalShell,
  apCardClass,
} from "@/components/ApSharedUi";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import { generateManagementFeesAction } from "@/app/ops/ar/actions";
import {
  balanceOf,
  chargeTypeLabel,
  daysLate,
  emptyReceivableForm,
  isOverdue,
  money,
  MISC_CHARGE_TYPES,
  parsePositiveAmount,
  parseReceivedAmount,
  receivableStatusLabel,
  RENTAL_CHARGE_TYPES,
  round2,
  seedMiscReceivables,
  seedRentalReceivables,
  statusOf,
  todayIso,
  type MiscChargeType,
  type Receivable,
  type ReceivableFormState,
  type ReceivableKind,
  type ReceivableStatus,
  type RentalChargeType,
} from "@/lib/accounts-receivable";
import {
  seedTenants,
  type TenantRecord,
} from "@/lib/tenants";

const STATUS_BADGE: Record<ReceivableStatus, string> = {
  unpaid: "badge-warning",
  partially_paid: "badge-info",
  paid: "badge-success",
  disputed: "badge-error",
};

type Props = { kind: ReceivableKind };

export function ReceivablesPanel({ kind }: Props) {
  const isRental = kind === "rental";
  const collection = isRental
    ? COLLECTIONS.rentalReceivables
    : COLLECTIONS.miscellaneousReceivables;
  const seed = isRental ? seedRentalReceivables : seedMiscReceivables;
  const categories = isRental ? RENTAL_CHARGE_TYPES : MISC_CHARGE_TYPES;

  const {
    items: receivables,
    saveOne,
    loading,
    error,
    refresh,
  } = useSharedCollection<Receivable>(collection, seed);
  const { items: tenants } = useSharedCollection<TenantRecord>(
    COLLECTIONS.tenants,
    seedTenants
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [form, setForm] = useState<ReceivableFormState>(() =>
    emptyReceivableForm(kind)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [receiptAmount, setReceiptAmount] = useState("");
  const [generatingFees, setGeneratingFees] = useState(false);
  const today = todayIso();

  async function handleGenerateManagementFees() {
    setGeneratingFees(true);
    setFormError(null);
    try {
      const result = await generateManagementFeesAction({ monthsAgo: 0 });
      setSavedMsg(
        `Generated management fees for ${result.period}: ${result.count} propert${result.count === 1 ? "y" : "ies"} · ${money(result.totalFee)}. Created AR (Miscellaneous) and AP (Operating expenses). ${result.created} new, ${result.updated} updated, ${result.skipped} skipped.`
      );
      setTimeout(() => setSavedMsg(null), 8000);
      await refresh();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Could not generate management fees."
      );
    } finally {
      setGeneratingFees(false);
    }
  }

  function matchesFilters(row: Receivable) {
    if (
      propertyFilter !== "all" &&
      (row.property || "").toLowerCase() !== propertyFilter.toLowerCase()
    ) {
      return false;
    }
    const status = statusOf(row);
    if (statusFilter === "open") {
      if (status !== "unpaid" && status !== "partially_paid") return false;
    } else if (statusFilter !== "all" && status !== statusFilter) {
      return false;
    }
    const balance = balanceOf(row);
    if (dueFilter === "overdue" && !isOverdue(row, today)) return false;
    if (dueFilter === "current" && !(balance > 0 && !isOverdue(row, today)))
      return false;
    if (dueFilter === "open" && balance <= 0) return false;
    const q = searchFilter.trim().toLowerCase();
    if (q) {
      const hay = `${row.customerName} ${row.property} ${row.unit} ${row.receivableId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  const totals = useMemo(() => {
    let invoiced = 0;
    let received = 0;
    let outstanding = 0;
    let overdue = 0;
    let overdueCount = 0;
    let dueSoon = 0;
    let disputed = 0;
    let openCount = 0;

    for (const row of receivables) {
      if (!matchesFilters(row)) continue;
      const balance = balanceOf(row);
      invoiced += row.amount;
      received += row.amountReceived;
      outstanding += balance;
      if (balance > 0) openCount += 1;
      if (row.disputed) disputed += balance;
      if (isOverdue(row, today)) {
        overdue += balance;
        overdueCount += 1;
      } else if (balance > 0 && daysLate(row, today) >= -30) {
        dueSoon += balance;
      }
    }

    return {
      invoiced: round2(invoiced),
      received: round2(received),
      outstanding: round2(outstanding),
      overdue: round2(overdue),
      overdueCount,
      dueSoon: round2(dueSoon),
      disputed: round2(disputed),
      openCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matchesFilters uses filter state
  }, [
    receivables,
    today,
    propertyFilter,
    statusFilter,
    dueFilter,
    searchFilter,
  ]);

  const knownProperties = useMemo(() => {
    const set = new Set(
      receivables.map((r) => r.property).filter(Boolean) as string[]
    );
    for (const t of tenants) {
      if (t.propertyLeased) set.add(t.propertyLeased);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [receivables, tenants]);

  const sorted = useMemo(
    () =>
      [...receivables]
        .filter((row) => matchesFilters(row))
        .sort((a, b) => {
          const aOpen = balanceOf(a) > 0 ? 0 : 1;
          const bOpen = balanceOf(b) > 0 ? 0 : 1;
          if (aOpen !== bOpen) return aOpen - bOpen;
          return (a.dueDate || "9999-12-31").localeCompare(
            b.dueDate || "9999-12-31"
          );
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [receivables, propertyFilter, statusFilter, dueFilter, searchFilter, today]
  );

  const knownCustomers = useMemo(() => {
    const customers = new Map<
      string,
      { id: string; property: string; unit: string }
    >();
    for (const row of receivables) {
      if (!customers.has(row.customerName)) {
        customers.set(row.customerName, {
          id: row.customerId,
          property: row.property,
          unit: row.unit,
        });
      }
    }
    for (const tenant of tenants) {
      if (!customers.has(tenant.name)) {
        customers.set(tenant.name, {
          id: tenant.id,
          property: tenant.propertyLeased,
          unit: tenant.unit,
        });
      }
    }
    return customers;
  }, [receivables, tenants]);

  const viewing = receivables.find((row) => row.id === viewingId) ?? null;

  useEffect(() => {
    if (!viewing && !showAddForm) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setViewingId(null);
      setShowAddForm(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewing, showAddForm]);

  function updateForm<K extends keyof ReceivableFormState>(
    key: K,
    value: ReceivableFormState[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function openAddForm() {
    setForm(emptyReceivableForm(kind));
    setFormError(null);
    setShowAddForm(true);
  }

  function handleCustomerChange(name: string) {
    const customer = knownCustomers.get(name);
    setForm((previous) => ({
      ...previous,
      customerName: name,
      customerId: customer?.id ?? previous.customerId,
      property: customer?.property ?? previous.property,
      unit: customer?.unit ?? previous.unit,
    }));
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const receivableId = form.receivableId.trim();
    const customerName = form.customerName.trim();
    const customerId = form.customerId.trim();
    const property = form.property.trim();

    if (!receivableId || !customerName || !customerId || !property) {
      setFormError(
        "Receivable ID, customer or tenant name, customer ID, and property are required."
      );
      return;
    }

    const amount = parsePositiveAmount(form.amount);
    const amountReceived = parseReceivedAmount(form.amountReceived);
    if (amount === null) {
      setFormError("Amount billed must be a positive dollar amount.");
      return;
    }
    if (amountReceived === null || amountReceived > amount) {
      setFormError(
        "Amount received cannot be negative or exceed the amount billed."
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

    const duplicate = receivables.find(
      (row) =>
        row.receivableId.toLowerCase() === receivableId.toLowerCase() ||
        (isRental &&
          row.customerId.toLowerCase() === customerId.toLowerCase() &&
          row.property.toLowerCase() === property.toLowerCase() &&
          row.unit.toLowerCase() === form.unit.trim().toLowerCase() &&
          row.period.toLowerCase() === form.period.trim().toLowerCase() &&
          row.category === form.category)
    );
    if (duplicate) {
      setFormError(
        `A matching receivable is already on file (${duplicate.receivableId}).`
      );
      return;
    }

    const next: Receivable = {
      id: crypto.randomUUID(),
      receivableId,
      kind,
      customerName,
      customerId,
      property,
      unit: form.unit.trim(),
      period: form.period.trim(),
      category: form.category,
      amount,
      amountReceived,
      disputed: form.disputed,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      paymentMethod: form.paymentMethod.trim(),
      paymentReference: form.paymentReference.trim(),
      fileName: form.fileName,
      description: form.description.trim(),
      notes: form.notes.trim(),
      createdAt: todayIso(),
    };

    try {
      await saveOne(next);
      if (amountReceived > 0) {
        const { creditPropertyBankFromAr } = await import(
          "@/app/ops/banks/ledger-bridge-actions"
        );
        const bank = await creditPropertyBankFromAr({
          propertyName: property,
          tenantName: customerName,
          unit: next.unit,
          amount: amountReceived,
          method: next.paymentMethod || "AR opening receipt",
          relatedId: next.id,
        });
        if (bank && "error" in bank) {
          setSavedMsg(
            `${receivableId} saved, but bank credit failed: ${bank.error}`
          );
          setTimeout(() => setSavedMsg(null), 5000);
          setShowAddForm(false);
          setForm(emptyReceivableForm(kind));
          return;
        }
      }
      setShowAddForm(false);
      setForm(emptyReceivableForm(kind));
      setSavedMsg(
        amountReceived > 0
          ? `${receivableId} for ${customerName} added — ${money(amountReceived)} credited to ${property} bank.`
          : `${receivableId} for ${customerName} added to accounts receivable.`
      );
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the receivable."
      );
    }
  }

  async function applyReceipt(row: Receivable) {
    const amount = parsePositiveAmount(receiptAmount);
    if (amount === null) {
      setFormError("Receipt must be a positive dollar amount.");
      return;
    }
    const balance = balanceOf(row);
    if (amount > balance) {
      setFormError(
        `Receipt cannot exceed the remaining balance of ${money(balance)}.`
      );
      return;
    }
    if (!row.property.trim()) {
      setFormError(
        "This receivable has no property. Assign a property so the payment credits the correct bank account."
      );
      return;
    }

    setFormError(null);
    try {
      const { creditPropertyBankFromAr } = await import(
        "@/app/ops/banks/ledger-bridge-actions"
      );
      const bank = await creditPropertyBankFromAr({
        propertyName: row.property,
        tenantName: row.customerName,
        unit: row.unit,
        amount,
        method: row.paymentMethod || "AR receipt",
        relatedId: row.id,
      });
      if (bank && "error" in bank) {
        setFormError(bank.error ?? "Could not post to the property bank.");
        return;
      }

      await saveOne({
        ...row,
        amountReceived: round2(row.amountReceived + amount),
      });
      setReceiptAmount("");
      setSavedMsg(
        `Recorded ${money(amount)} on ${row.receivableId} — credited ${row.property} operating bank.`
      );
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Could not apply receipt to bank account."
      );
    }
  }

  const title = isRental ? "Rental income receivable" : "Miscellaneous receivable";
  const singular = isRental ? "rental charge" : "miscellaneous charge";

  return (
    <>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}
        {savedMsg ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {savedMsg}
          </div>
        ) : null}
        {formError && !showAddForm && !viewingId ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {formError}
          </div>
        ) : null}

        <section className={`${apCardClass} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--harbor-ink)]/55">
                Total {title}
              </p>
              <p className="font-display mt-1 text-5xl leading-none tracking-tight text-[var(--harbor-ink)] sm:text-6xl">
                {money(totals.outstanding)}
              </p>
              <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
                Uncollected balance across {totals.openCount} open{" "}
                {totals.openCount === 1 ? "receivable" : "receivables"} ·{" "}
                {money(totals.invoiced)} billed · {money(totals.received)}{" "}
                collected
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isRental ? (
                <button
                  type="button"
                  disabled={generatingFees}
                  onClick={() => void handleGenerateManagementFees()}
                  className="btn gap-2 border border-[var(--harbor-deep)]/20 bg-white text-[var(--harbor-ink)] hover:bg-[var(--harbor-sand)]/60"
                >
                  {generatingFees ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate management fee (that will create the AR and AP)
                </button>
              ) : null}
              <button
                type="button"
                onClick={openAddForm}
                className="btn gap-2 border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)] hover:bg-[var(--harbor-deep)]"
              >
                <Plus className="h-4 w-4" />
                Add {singular}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Past due"
              amount={totals.overdue}
              detail={`${totals.overdueCount} ${
                totals.overdueCount === 1 ? "receivable" : "receivables"
              } past the due date`}
              tone="red"
            />
            <SummaryTile
              label="Due in next 30 days"
              amount={totals.dueSoon}
              detail="Expected near-term collections"
              tone="blue"
            />
            <SummaryTile
              label="Disputed / collection hold"
              amount={totals.disputed}
              detail="Resolve before normal collection activity"
              tone="amber"
            />
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-4 py-3 text-sm opacity-70">
            Loading shared receivables…
          </div>
        ) : null}

        <div className="space-y-3">
          <div
            className={`${apCardClass} grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4`}
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--harbor-ink)]/65">
                Property
              </span>
              <select
                className="select select-bordered w-full bg-white"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
              >
                <option value="all">All properties</option>
                {knownProperties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--harbor-ink)]/65">
                Payment status
              </span>
              <select
                className="select select-bordered w-full bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="open">Open (unpaid / partial)</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially paid</option>
                <option value="paid">Paid</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--harbor-ink)]/65">
                Due status
              </span>
              <select
                className="select select-bordered w-full bg-white"
                value={dueFilter}
                onChange={(e) => setDueFilter(e.target.value)}
              >
                <option value="all">Any due date</option>
                <option value="open">Has balance</option>
                <option value="overdue">Overdue</option>
                <option value="current">Current (not overdue)</option>
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--harbor-ink)]/65">
                Search
              </span>
              <input
                className="input input-bordered w-full bg-white"
                placeholder="Customer, unit, ID…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>

          <section className={`overflow-x-auto ${apCardClass}`}>
            <table className="table w-full table-fixed text-sm">
            <thead>
              <tr>
                <th className="w-[7%] text-right">Billed</th>
                <th className="w-[7%] text-right">Received</th>
                <th className="w-[7%] text-right">Balance</th>
                <th className="w-[8%]">Status</th>
                <th className="w-[7%]">Due date</th>
                <th className="w-[9%]">Receivable ID</th>
                <th className="w-[6%]">Invoice</th>
                <th className="w-[11%]">{isRental ? "Tenant" : "Customer"}</th>
                <th className="w-[6%]">ID</th>
                <th className="w-[14%]">Property / unit</th>
                <th className="w-[8%]">Period</th>
                <th className="w-[10%]">Category</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center opacity-60">
                    No receivables on file yet.
                  </td>
                </tr>
              ) : (
                sorted.map((row) => {
                  const status = statusOf(row);
                  const overdue = isOverdue(row, today);
                  const late = daysLate(row, today);
                  return (
                    <tr
                      key={row.id}
                      className={
                        overdue
                          ? "bg-red-50/60"
                          : row.disputed
                            ? "bg-amber-50/60"
                            : undefined
                      }
                    >
                      <td className="text-right font-semibold tabular-nums">
                        {money(row.amount)}
                      </td>
                      <td className="text-right tabular-nums opacity-70">
                        {money(row.amountReceived)}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {money(balanceOf(row))}
                      </td>
                      <td>
                        <span
                          className={`badge whitespace-nowrap ${STATUS_BADGE[status]}`}
                        >
                          {receivableStatusLabel(status)}
                        </span>
                        {overdue ? (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
                            <TriangleAlert className="h-3 w-3" />
                            {late} {late === 1 ? "day" : "days"} late
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        {row.dueDate || "—"}
                      </td>
                      <td className="min-w-0 text-sm">
                        <p className="truncate font-medium">{row.receivableId}</p>
                        <p className="truncate text-xs opacity-55">
                          Invoiced {row.invoiceDate || "—"}
                        </p>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setViewingId(row.id);
                            setReceiptAmount("");
                            setFormError(null);
                          }}
                          className="btn btn-xs btn-outline gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </td>
                      <td className="min-w-0 truncate text-sm" title={row.customerName}>
                        {row.customerName}
                      </td>
                      <td className="min-w-0 truncate text-sm opacity-70" title={row.customerId}>
                        {row.customerId}
                      </td>
                      <td
                        className="min-w-0 truncate text-sm"
                        title={`${row.property}${row.unit ? ` · ${row.unit}` : ""}`}
                      >
                        {row.property}
                        {row.unit ? ` · ${row.unit}` : ""}
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        {row.period || "—"}
                      </td>
                      <td>
                        <span className="badge badge-ghost badge-sm whitespace-nowrap">
                          {chargeTypeLabel(row.category)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sorted.length ? (
              <tfoot>
                <tr className="border-t-2 border-[var(--harbor-deep)]/20 text-[var(--harbor-ink)]">
                  <td className="text-right font-semibold tabular-nums">
                    {money(totals.invoiced)}
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {money(totals.received)}
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {money(totals.outstanding)}
                  </td>
                  <td colSpan={9} className="text-xs uppercase tracking-wide opacity-60">
                    {sorted.length} receivables on file
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </section>
        </div>
      </div>

      {showAddForm ? (
        <ModalShell
          title={`Add ${title.toLowerCase()}`}
          onClose={() => setShowAddForm(false)}
          wide
        >
          <form onSubmit={handleAdd} className="space-y-4">
            {formError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {formError}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                label="Receivable ID"
                required
                value={form.receivableId}
                onChange={(value) => updateForm("receivableId", value)}
                placeholder={isRental ? "RENT-2026-08-001" : "MISC-2026-001"}
              />
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Category <span className="text-red-600">*</span>
                </span>
                <select
                  className="select select-bordered w-full"
                  value={form.category}
                  onChange={(event) =>
                    updateForm(
                      "category",
                      event.target.value as RentalChargeType | MiscChargeType
                    )
                  }
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Billing period"
                value={form.period}
                onChange={(value) => updateForm("period", value)}
                placeholder="Aug 2026"
              />
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  {isRental ? "Tenant" : "Customer"} name{" "}
                  <span className="text-red-600">*</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.customerName}
                  onChange={(event) => handleCustomerChange(event.target.value)}
                  list={`ar-${kind}-customers`}
                  required
                />
                <datalist id={`ar-${kind}-customers`}>
                  {Array.from(knownCustomers.keys()).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <TextField
                label={`${isRental ? "Tenant" : "Customer"} ID`}
                required
                value={form.customerId}
                onChange={(value) => updateForm("customerId", value)}
                placeholder="T-1001"
              />
              <TextField
                label="Property"
                required
                value={form.property}
                onChange={(value) => updateForm("property", value)}
              />
              <TextField
                label="Unit / suite"
                value={form.unit}
                onChange={(value) => updateForm("unit", value)}
              />
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Amount billed <span className="text-red-600">*</span>
                </span>
                <CurrencyInput
                  value={form.amount}
                  onChange={(value) => updateForm("amount", value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Amount already received
                </span>
                <CurrencyInput
                  value={form.amountReceived}
                  onChange={(value) => updateForm("amountReceived", value)}
                  placeholder="0.00"
                  allowZero
                />
              </label>
              <DateField
                label="Invoice date"
                value={form.invoiceDate}
                onChange={(value) => updateForm("invoiceDate", value)}
              />
              <DateField
                label="Due date"
                value={form.dueDate}
                onChange={(value) => updateForm("dueDate", value)}
              />
              <TextField
                label="Payment method"
                value={form.paymentMethod}
                onChange={(value) => updateForm("paymentMethod", value)}
                placeholder="ACH, check, wire…"
              />
              <TextField
                label="Payment reference"
                value={form.paymentReference}
                onChange={(value) => updateForm("paymentReference", value)}
                placeholder="ACH-1234"
              />
              <label className="form-control w-full sm:col-span-2">
                <span className="mb-1 flex items-center gap-2 text-sm opacity-70">
                  <Upload className="h-4 w-4" />
                  Attach invoice PDF
                </span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="file-input file-input-bordered w-full"
                  onChange={(event) =>
                    updateForm(
                      "fileName",
                      event.target.files?.[0]?.name ?? ""
                    )
                  }
                />
                <span className="mt-1 text-xs opacity-55">
                  File name only for now; document storage can be enabled later.
                </span>
              </label>
              <label className="form-control w-full sm:col-span-2 lg:col-span-3">
                <span className="mb-1 text-sm opacity-70">Description</span>
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full"
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                />
              </label>
              <label className="form-control w-full sm:col-span-2 lg:col-span-3">
                <span className="mb-1 text-sm opacity-70">Notes</span>
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full"
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.disputed}
                  onChange={(event) =>
                    updateForm("disputed", event.target.checked)
                  }
                />
                Flag as disputed and place normal collection activity on hold
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
                Add to accounts receivable
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {viewing ? (
        <ModalShell
          title={`${viewing.receivableId} · ${viewing.customerName}`}
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
                    Invoice preview placeholder. The attached file name and all
                    billing details are saved with this receivable.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide opacity-55">
                  Balance receivable
                </p>
                <p className="font-display text-3xl leading-none text-[var(--harbor-ink)]">
                  {money(balanceOf(viewing))}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`badge badge-sm whitespace-nowrap ${
                      STATUS_BADGE[statusOf(viewing)]
                    }`}
                  >
                    {receivableStatusLabel(statusOf(viewing))}
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
                <DetailRow
                  label="Receivable ID"
                  value={viewing.receivableId}
                />
                <DetailRow
                  label={isRental ? "Tenant" : "Customer"}
                  value={viewing.customerName}
                />
                <DetailRow label="Customer ID" value={viewing.customerId} />
                <DetailRow label="Property" value={viewing.property} />
                <DetailRow label="Unit / suite" value={viewing.unit || "—"} />
                <DetailRow label="Period" value={viewing.period || "—"} />
                <DetailRow
                  label="Category"
                  value={chargeTypeLabel(viewing.category)}
                />
                <DetailRow
                  label="Amount billed"
                  value={money(viewing.amount)}
                  emphasize
                />
                <DetailRow
                  label="Received to date"
                  value={money(viewing.amountReceived)}
                />
                <DetailRow
                  label="Invoice date"
                  value={viewing.invoiceDate || "—"}
                />
                <DetailRow label="Due date" value={viewing.dueDate || "—"} />
                <DetailRow
                  label="Payment method"
                  value={viewing.paymentMethod || "—"}
                />
                <DetailRow
                  label="Payment reference"
                  value={viewing.paymentReference || "—"}
                />
                <DetailRow
                  label="Attachment"
                  value={viewing.fileName || "None attached"}
                />
              </dl>
              {viewing.description || viewing.notes ? (
                <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide opacity-55">
                    Description / notes
                  </p>
                  <p className="mt-1 text-sm opacity-80">
                    {[viewing.description, viewing.notes]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ) : null}
              {balanceOf(viewing) > 0 ? (
                <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-4">
                  <p className="text-sm font-semibold">Record a receipt</p>
                  {formError ? (
                    <p className="mt-2 text-xs text-red-700">{formError}</p>
                  ) : null}
                  <div className="mt-2 flex items-end gap-2">
                    <CurrencyInput
                      value={receiptAmount}
                      onChange={setReceiptAmount}
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      className="btn btn-neutral btn-sm whitespace-nowrap"
                      onClick={() => void applyReceipt(viewing)}
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
    </>
  );
}

function SummaryTile({
  label,
  amount,
  detail,
  tone,
}: {
  label: string;
  amount: number;
  detail: string;
  tone: "red" | "blue" | "amber";
}) {
  const classes =
    tone === "red"
      ? "border-red-200 bg-red-50/70 text-red-800"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/70 text-amber-800"
        : "border-[var(--harbor-mid)]/25 bg-[var(--harbor-mist)]/50 text-[var(--harbor-ink)]";
  return (
    <div className={`rounded-xl border px-4 py-3 ${classes}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{money(amount)}</p>
      <p className="text-xs opacity-70">{detail}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="form-control w-full">
      <span className="mb-1 text-sm opacity-70">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      <input
        className="input input-bordered w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="form-control w-full">
      <span className="mb-1 text-sm opacity-70">{label}</span>
      <input
        type="date"
        className="input input-bordered w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
