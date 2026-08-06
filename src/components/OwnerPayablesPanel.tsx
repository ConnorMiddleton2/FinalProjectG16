"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileText,
  Plus,
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
import {
  rentCollectedFromReceivables,
  seedRentalReceivables,
  type Receivable,
} from "@/lib/accounts-receivable";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  applyLiveRentToRemittance,
  balanceOf,
  computeNetDue,
  daysLate,
  emptyOwnerPayableForm,
  isOverdue,
  money,
  ownerPayableStatusLabel,
  ownerPaymentMethodLabel,
  ownerPaymentTypeLabel,
  OWNER_PAYMENT_METHODS,
  OWNER_PAYMENT_TYPES,
  parseNonNegativeAmount,
  parsePositiveAmount,
  normalizeOwnerPayable,
  resolveManagementFee,
  round2,
  seedOwnerPayables,
  statusOf,
  todayIso,
  type OwnerPayable,
  type OwnerPayableFormState,
  type OwnerPayableStatus,
  type OwnerPaymentMethod,
  type OwnerPaymentType,
} from "@/lib/owner-payables";
import { buildMissingOwnerRemittance } from "@/lib/demo-cycle";
import { monthPeriodLabel } from "@/lib/seed-dates";

const STATUS_BADGE: Record<OwnerPayableStatus, string> = {
  unpaid: "badge-warning",
  partially_paid: "badge-info",
  paid: "badge-success",
  on_hold: "badge-error",
};

type KnownOwner = { name: string; id: string; property?: string };

export function OwnerPayablesPanel() {
  const {
    items,
    saveOne,
    loading,
    error,
  } = useSharedCollection<OwnerPayable>(
    COLLECTIONS.ownerPayables,
    seedOwnerPayables
  );
  const {
    items: rentalReceivables,
    loading: arLoading,
  } = useSharedCollection<Receivable>(
    COLLECTIONS.rentalReceivables,
    seedRentalReceivables
  );
  const { items: managedProperties } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);

  const payables = useMemo(
    () => items.map((row) => normalizeOwnerPayable(row)),
    [items]
  );

  const arFingerprint = useMemo(
    () =>
      rentalReceivables
        .map((r) => `${r.id}:${r.amountReceived}:${r.period}:${r.property}`)
        .join("|"),
    [rentalReceivables]
  );
  const feeFingerprint = useMemo(
    () =>
      managedProperties
        .map(
          (p) =>
            `${p.id}:${p.propertyName}:${p.feeStructure}:${p.feePercent}:${p.feeFlatAmount}`
        )
        .join("|"),
    [managedProperties]
  );

  // Keep unpaid monthly remittances aligned with live A/R + contract fee %.
  useEffect(() => {
    if (loading || arLoading || items.length === 0) return;

    let cancelled = false;
    async function syncFromLiveAr() {
      for (const raw of items) {
        const row = normalizeOwnerPayable(raw);
        if (row.paymentType !== "monthly_distribution") continue;
        if (row.amountPaid > 0) continue;
        const next = applyLiveRentToRemittance(
          row,
          rentalReceivables,
          managedProperties
        );
        if (
          next.grossRentCollected === row.grossRentCollected &&
          next.managementFeePercent === row.managementFeePercent &&
          next.managementFeeAmount === row.managementFeeAmount &&
          next.amount === row.amount
        ) {
          continue;
        }
        if (cancelled) return;
        await saveOne(next);
      }
    }
    void syncFromLiveAr();
    return () => {
      cancelled = true;
    };
  }, [
    loading,
    arLoading,
    arFingerprint,
    feeFingerprint,
    items,
    rentalReceivables,
    managedProperties,
    saveOne,
  ]);

  // Create remittances for managed properties once rent has been collected.
  useEffect(() => {
    if (loading || arLoading) return;
    const period = monthPeriodLabel(0);
    let cancelled = false;
    async function ensureRemittances() {
      for (const property of managedProperties) {
        const draft = buildMissingOwnerRemittance({
          property,
          period,
          receivables: rentalReceivables,
          existing: payables,
        });
        if (!draft || cancelled) continue;
        await saveOne(draft);
      }
    }
    void ensureRemittances();
    return () => {
      cancelled = true;
    };
  }, [
    loading,
    arLoading,
    arFingerprint,
    feeFingerprint,
    managedProperties,
    rentalReceivables,
    payables,
    saveOne,
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState<OwnerPayableFormState>(emptyOwnerPayableForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const today = todayIso();

  const formFee = useMemo(
    () =>
      resolveManagementFee(
        form.property,
        parseNonNegativeAmount(form.grossRentCollected) ?? 0,
        managedProperties
      ),
    [form.property, form.grossRentCollected, managedProperties]
  );

  const totals = useMemo(() => {
    let billed = 0;
    let paid = 0;
    let outstanding = 0;
    let overdue = 0;
    let overdueCount = 0;
    let dueSoon = 0;
    let onHold = 0;
    let openCount = 0;
    let awaitingApproval = 0;
    let managementFeeIncome = 0;

    for (const row of payables) {
      const balance = balanceOf(row);
      billed += row.amount;
      paid += row.amountPaid;
      outstanding += balance;
      if (balance > 0) openCount += 1;
      if (row.onHold) onHold += balance;
      if (!row.statementApproved && balance > 0) {
        awaitingApproval += balance;
      }
      if (row.paymentType === "monthly_distribution") {
        managementFeeIncome += row.managementFeeAmount;
      }
      if (isOverdue(row, today)) {
        overdue += balance;
        overdueCount += 1;
      } else if (balance > 0 && !row.onHold && daysLate(row, today) >= -30) {
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
      onHold: round2(onHold),
      openCount,
      awaitingApproval: round2(awaitingApproval),
      managementFeeIncome: round2(managementFeeIncome),
    };
  }, [payables, today]);

  const sorted = useMemo(() => {
    return [...payables].sort((a, b) => {
      const aOpen = balanceOf(a) > 0 ? 0 : 1;
      const bOpen = balanceOf(b) > 0 ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      const aDue = a.dueDate || "9999-12-31";
      const bDue = b.dueDate || "9999-12-31";
      return aDue.localeCompare(bDue);
    });
  }, [payables]);

  const knownOwners = useMemo(() => {
    const map = new Map<string, KnownOwner>();
    for (const row of payables) {
      if (row.ownerName && !map.has(row.ownerName)) {
        map.set(row.ownerName, {
          name: row.ownerName,
          id: row.ownerId,
          property: row.property,
        });
      }
    }
    return map;
  }, [payables]);

  const knownProperties = useMemo(
    () =>
      Array.from(new Set(payables.map((p) => p.property).filter(Boolean))).sort(),
    [payables]
  );

  const viewing = payables.find((p) => p.id === viewingId) ?? null;

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

  function updateForm<K extends keyof OwnerPayableFormState>(
    key: K,
    value: OwnerPayableFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOwnerNameChange(name: string) {
    setForm((prev) => {
      const known = knownOwners.get(name);
      return {
        ...prev,
        ownerName: name,
        ownerId: known?.id ?? prev.ownerId,
        property: known?.property && !prev.property ? known.property : prev.property,
      };
    });
  }

  function openAddForm() {
    setForm(emptyOwnerPayableForm());
    setFormError(null);
    setShowAddForm(true);
  }

  // Prefill collected rent from live A/R when property + period are set.
  useEffect(() => {
    if (!showAddForm || form.paymentType !== "monthly_distribution") return;
    const property = form.property.trim();
    const period = form.period.trim();
    if (!property || !period) return;
    const collected = rentCollectedFromReceivables(
      rentalReceivables,
      property,
      period
    );
    const fee = resolveManagementFee(property, collected, managedProperties);
    setForm((prev) => ({
      ...prev,
      grossRentCollected: String(collected),
      managementFeePercent: String(fee.percent),
    }));
    // Only when property/period (or AR/contracts) change — not on every gross edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [
    showAddForm,
    form.property,
    form.period,
    form.paymentType,
    rentalReceivables,
    managedProperties,
  ]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const paymentId = form.paymentId.trim();
    const ownerName = form.ownerName.trim();
    const ownerId = form.ownerId.trim();
    const property = form.property.trim();
    const period = form.period.trim();

    if (!paymentId || !ownerName || !ownerId || !property || !period) {
      setFormError(
        "Payment ID, owner name, owner ID, property, and payment period are required."
      );
      return;
    }

    const grossRentCollected =
      parseNonNegativeAmount(form.grossRentCollected) ?? 0;
    const reimbursableExpenses =
      parseNonNegativeAmount(form.reimbursableExpenses) ?? 0;
    const reservesWithheld =
      parseNonNegativeAmount(form.reservesWithheld) ?? 0;
    const fee = resolveManagementFee(
      property,
      grossRentCollected,
      managedProperties
    );
    const managementFeeAmount = fee.amount;
    const amount =
      form.paymentType === "monthly_distribution"
        ? computeNetDue({
            grossRentCollected,
            managementFeeAmount,
            reimbursableExpenses,
            reservesWithheld,
          })
        : parsePositiveAmount(form.amount);

    if (amount === null || amount <= 0) {
      setFormError(
        form.paymentType === "monthly_distribution"
          ? `The rental income must exceed the ${fee.percent}% management fee, reimbursable expenses, and reserves withheld.`
          : "Amount owed must be a positive dollar amount."
      );
      return;
    }

    const amountPaid = parseNonNegativeAmount(form.amountPaid);
    if (amountPaid === null) {
      setFormError("Amount paid cannot be negative.");
      return;
    }
    if (amountPaid > amount) {
      setFormError(
        "Amount paid cannot be more than the net amount owed."
      );
      return;
    }

    const duplicate = payables.find(
      (row) =>
        row.paymentId.trim().toLowerCase() === paymentId.toLowerCase() ||
        (row.ownerId.trim().toLowerCase() === ownerId.toLowerCase() &&
          row.property.trim().toLowerCase() === property.toLowerCase() &&
          row.period.trim().toLowerCase() === period.toLowerCase() &&
          row.paymentType === form.paymentType)
    );
    if (duplicate) {
      setFormError(
        `A remittance for ${ownerName} · ${property} · ${period} is already on file (${duplicate.paymentId}).`
      );
      return;
    }

    if (form.dueDate && form.invoiceDate && form.dueDate < form.invoiceDate) {
      setFormError("Due date cannot be earlier than the statement date.");
      return;
    }

    const next: OwnerPayable = {
      id: crypto.randomUUID(),
      paymentId,
      ownerName,
      ownerId,
      property,
      period,
      paymentType: form.paymentType,
      grossRentCollected,
      managementFeePercent:
        form.paymentType === "monthly_distribution" ? fee.percent : 0,
      managementFeeAmount:
        form.paymentType === "monthly_distribution"
          ? managementFeeAmount
          : 0,
      reimbursableExpenses,
      reservesWithheld,
      amount,
      amountPaid: amountPaid ?? 0,
      onHold: form.onHold,
      statementApproved: form.statementApproved,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      paymentMethod: form.paymentMethod,
      paymentReference: form.paymentReference.trim(),
      fileName: form.fileName,
      notes: form.notes.trim(),
      createdAt: todayIso(),
    };

    try {
      await saveOne(next);
      setShowAddForm(false);
      setForm(emptyOwnerPayableForm());
      setSavedMsg(
        `Owner remittance ${paymentId} for ${ownerName} added to payable to owners.`
      );
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save the remittance."
      );
    }
  }

  async function applyPayment(row: OwnerPayable) {
    if (!row.statementApproved) {
      setFormError(
        "Owner statement must be approved before a payment can be recorded."
      );
      return;
    }
    if (row.onHold) {
      setFormError("This remittance is on hold and cannot be paid yet.");
      return;
    }

    const amount = parsePositiveAmount(paymentAmount);
    if (amount === null) {
      setFormError("Payment must be a positive dollar amount.");
      return;
    }
    const balance = balanceOf(row);
    if (amount > balance) {
      setFormError(
        `Payment cannot exceed the remaining balance of ${money(balance)}.`
      );
      return;
    }

    setFormError(null);
    await saveOne({
      ...row,
      amountPaid: round2(row.amountPaid + amount),
    });
    setPaymentAmount("");
    setSavedMsg(
      `Recorded a ${money(amount)} owner payment on ${row.paymentId}.`
    );
    setTimeout(() => setSavedMsg(null), 4000);
  }

  return (
    <>
      <div className="space-y-6">
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

        <section className={`${apCardClass} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--harbor-ink)]/55">
                Total payable to owners
              </p>
              <p className="font-display mt-1 text-5xl leading-none tracking-tight text-[var(--harbor-ink)] sm:text-6xl">
                {money(totals.outstanding)}
              </p>
              <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
                Unpaid owner remittances across {totals.openCount} open{" "}
                {totals.openCount === 1 ? "payment" : "payments"} ·{" "}
                {money(totals.billed)} owed to date · {money(totals.paid)} paid
                to date
              </p>
              <p className="mt-1 text-xs text-[var(--harbor-ink)]/50">
                Monthly distributions equal rental income collected (from A/R),
                less Harborline&apos;s contract management fee, reimbursable
                property expenses, and reserves withheld.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddForm}
              className="btn gap-2 border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)] hover:bg-[var(--harbor-deep)]"
            >
              <Plus className="h-4 w-4" />
              Add owner payment
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-red-900/70">
                Past due
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-red-800">
                {money(totals.overdue)}
              </p>
              <p className="text-xs text-red-900/70">
                {totals.overdueCount}{" "}
                {totals.overdueCount === 1 ? "remittance" : "remittances"} past
                the due date
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
                Scheduled owner distributions
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-900/70">
                On hold
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800">
                {money(totals.onHold)}
              </p>
              <p className="text-xs text-amber-900/70">
                Held out of the remittance run
              </p>
            </div>
            <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-ink)]/60">
                Awaiting statement approval
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--harbor-ink)]">
                {money(totals.awaitingApproval)}
              </p>
              <p className="text-xs text-[var(--harbor-ink)]/60">
                Control: do not pay until approved
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-900/70">
                Management fee income
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-800">
                {money(totals.managementFeeIncome)}
              </p>
              <p className="text-xs text-emerald-900/70">
                Harborline&apos;s 10% of rental income
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-4 py-3 text-sm opacity-70">
            Loading shared owner payables…
          </div>
        ) : null}

        <section className={`overflow-x-auto ${apCardClass}`}>
          <table className="table">
            <thead>
              <tr>
                <th className="text-right">Net owed</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
                <th>Due date</th>
                <th>Payment ID</th>
                <th>Statement</th>
                <th>Owner</th>
                <th>Owner ID</th>
                <th>Property</th>
                <th>Period</th>
                <th>Type</th>
                <th>Approved</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center opacity-60">
                    No owner remittances on file yet. Use “Add owner payment” to
                    enter one.
                  </td>
                </tr>
              ) : (
                sorted.map((row) => {
                  const status = statusOf(row);
                  const balance = balanceOf(row);
                  const overdue = isOverdue(row, today);
                  const late = daysLate(row, today);
                  return (
                    <tr
                      key={row.id}
                      className={
                        overdue
                          ? "bg-red-50/60"
                          : row.onHold
                            ? "bg-amber-50/60"
                            : undefined
                      }
                    >
                      <td className="text-right font-semibold tabular-nums">
                        {money(row.amount)}
                      </td>
                      <td className="text-right tabular-nums opacity-70">
                        {money(row.amountPaid)}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {money(balance)}
                      </td>
                      <td>
                        <span
                          className={`badge whitespace-nowrap ${STATUS_BADGE[status]}`}
                        >
                          {ownerPayableStatusLabel(status)}
                        </span>
                        {overdue ? (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
                            <TriangleAlert className="h-3 w-3" />
                            {late} {late === 1 ? "day" : "days"} late
                          </p>
                        ) : null}
                      </td>
                      <td className="text-sm whitespace-nowrap">
                        {row.dueDate || "—"}
                      </td>
                      <td className="text-sm">
                        <p className="font-medium">{row.paymentId}</p>
                        <p className="text-xs opacity-55">
                          Statement {row.invoiceDate || "—"}
                        </p>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setViewingId(row.id);
                            setPaymentAmount("");
                            setFormError(null);
                          }}
                          className="btn btn-xs btn-outline gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </td>
                      <td className="text-sm">{row.ownerName}</td>
                      <td className="text-sm tabular-nums opacity-70">
                        {row.ownerId}
                      </td>
                      <td className="text-sm">{row.property}</td>
                      <td className="text-sm whitespace-nowrap">{row.period}</td>
                      <td>
                        <span className="badge badge-ghost badge-sm whitespace-nowrap">
                          {ownerPaymentTypeLabel(row.paymentType)}
                        </span>
                      </td>
                      <td className="text-sm">
                        {row.statementApproved ? (
                          <span className="badge badge-success badge-sm">
                            Yes
                          </span>
                        ) : (
                          <span className="badge badge-warning badge-sm">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sorted.length > 0 ? (
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
                  <td
                    colSpan={10}
                    className="text-xs uppercase tracking-wide opacity-60"
                  >
                    {sorted.length} owner remittances on file
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </section>
      </div>

      {showAddForm ? (
        <ModalShell
          title="Add payment payable to owners"
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
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Payment ID <span className="text-red-600">*</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.paymentId}
                  onChange={(e) => updateForm("paymentId", e.target.value)}
                  placeholder="OWN-2026-08-RB"
                  required
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Payment type <span className="text-red-600">*</span>
                </span>
                <select
                  className="select select-bordered w-full"
                  value={form.paymentType}
                  onChange={(e) =>
                    updateForm(
                      "paymentType",
                      e.target.value as OwnerPaymentType
                    )
                  }
                >
                  {OWNER_PAYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Payment period <span className="text-red-600">*</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.period}
                  onChange={(e) => updateForm("period", e.target.value)}
                  placeholder="Aug 2026"
                  required
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Owner name <span className="text-red-600">*</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.ownerName}
                  onChange={(e) => handleOwnerNameChange(e.target.value)}
                  list="ap-owner-names"
                  placeholder="Riverbend Holdings LLC"
                  required
                />
                <datalist id="ap-owner-names">
                  {Array.from(knownOwners.keys()).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Owner ID <span className="text-red-600">*</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.ownerId}
                  onChange={(e) => updateForm("ownerId", e.target.value)}
                  placeholder="OWN-1001"
                  required
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Property <span className="text-red-600">*</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.property}
                  onChange={(e) => updateForm("property", e.target.value)}
                  list="ap-owner-properties"
                  placeholder="Riverbend Commerce Center"
                  required
                />
                <datalist id="ap-owner-properties">
                  {knownProperties.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white/80 p-4">
              <p className="text-sm font-semibold text-[var(--harbor-ink)]">
                Owner remittance waterfall
              </p>
              <p className="mt-1 text-xs opacity-60">
                Harborline earns {formFee.percent}% of rental income
                {formFee.source === "contract"
                  ? " (from the signed management contract)"
                  : " (portfolio default — no matching contract found)"}
                . Collected rent prefills from Accounts Receivable for the
                property and period. The owner receives the remaining amount
                after reimbursable property expenses and reserves withheld.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">
                    Total rental income collected
                  </span>
                  <CurrencyInput
                    value={form.grossRentCollected}
                    onChange={(v) => updateForm("grossRentCollected", v)}
                    placeholder="0.00"
                    allowZero
                  />
                </label>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                  <span className="mb-1 text-sm opacity-70">
                    Harborline management fee ({formFee.percent}%)
                  </span>
                  <p className="text-xl font-semibold tabular-nums text-emerald-800">
                    {money(formFee.amount)}
                  </p>
                  <span className="text-xs opacity-55">
                    Calculated from the management contract; rate cannot be
                    edited here.
                  </span>
                </div>
                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">
                    Reimbursable property expenses
                  </span>
                  <CurrencyInput
                    value={form.reimbursableExpenses}
                    onChange={(v) => updateForm("reimbursableExpenses", v)}
                    placeholder="0.00"
                    allowZero
                  />
                </label>
                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">
                    Reserves withheld
                  </span>
                  <CurrencyInput
                    value={form.reservesWithheld}
                    onChange={(v) => updateForm("reservesWithheld", v)}
                    placeholder="0.00"
                    allowZero
                  />
                </label>
                <div className="rounded-lg border border-[var(--harbor-mid)]/25 bg-[var(--harbor-mist)]/50 px-4 py-3">
                  <span className="mb-1 text-sm opacity-70">
                    Net amount due to owner
                  </span>
                  <p className="text-xl font-semibold tabular-nums">
                    {money(
                      computeNetDue({
                        grossRentCollected:
                          parseNonNegativeAmount(form.grossRentCollected) ?? 0,
                        managementFeeAmount: formFee.amount,
                        reimbursableExpenses:
                          parseNonNegativeAmount(form.reimbursableExpenses) ?? 0,
                        reservesWithheld:
                          parseNonNegativeAmount(form.reservesWithheld) ?? 0,
                      })
                    )}
                  </p>
                  <span className="text-xs opacity-55">
                    Rental income − {formFee.percent}% fee − expenses −
                    reserves.
                  </span>
                </div>
                {form.paymentType !== "monthly_distribution" ? (
                  <label className="form-control w-full">
                    <span className="mb-1 text-sm opacity-70">
                      Manual amount owed <span className="text-red-600">*</span>
                    </span>
                    <CurrencyInput
                      value={form.amount}
                      onChange={(v) => updateForm("amount", v)}
                      placeholder="0.00"
                      required
                    />
                  </label>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Amount already paid
                </span>
                <CurrencyInput
                  value={form.amountPaid}
                  onChange={(v) => updateForm("amountPaid", v)}
                  placeholder="0.00"
                  allowZero
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Statement date</span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={form.invoiceDate}
                  onChange={(e) => updateForm("invoiceDate", e.target.value)}
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Due / scheduled date
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={form.dueDate}
                  onChange={(e) => updateForm("dueDate", e.target.value)}
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Payment method</span>
                <select
                  className="select select-bordered w-full"
                  value={form.paymentMethod}
                  onChange={(e) =>
                    updateForm(
                      "paymentMethod",
                      e.target.value as OwnerPaymentMethod
                    )
                  }
                >
                  <option value="">Not selected</option>
                  {OWNER_PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Reference / check number
                </span>
                <input
                  className="input input-bordered w-full"
                  value={form.paymentReference}
                  onChange={(e) =>
                    updateForm("paymentReference", e.target.value)
                  }
                  placeholder="ACH-882144 or CHK-4419"
                />
              </label>

              <label className="form-control w-full sm:col-span-2 lg:col-span-1">
                <span className="mb-1 flex items-center gap-2 text-sm opacity-70">
                  <Upload className="h-4 w-4" />
                  Attach owner statement PDF
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
                    : "File name only for now; PDF storage can be enabled later."}
                </span>
              </label>

              <label className="form-control w-full sm:col-span-2 lg:col-span-3">
                <span className="mb-1 text-sm opacity-70">Notes</span>
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full"
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Period notes, banking changes, inspection holds, etc."
                />
              </label>

              <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.statementApproved}
                  onChange={(e) =>
                    updateForm("statementApproved", e.target.checked)
                  }
                />
                Owner statement approved (required before recording payment)
              </label>

              <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.onHold}
                  onChange={(e) => updateForm("onHold", e.target.checked)}
                />
                Hold this remittance out of the owner payment run
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
                Add to payable to owners
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {viewing ? (
        <ModalShell
          title={`${viewing.paymentId} · ${viewing.ownerName}`}
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
                    Owner statement / remittance advice placeholder. File name is
                    saved with the record; PDF rendering can be enabled later.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide opacity-55">
                  Balance due to owner
                </p>
                <p className="font-display text-3xl leading-none text-[var(--harbor-ink)]">
                  {money(balanceOf(viewing))}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`badge badge-sm whitespace-nowrap ${STATUS_BADGE[statusOf(viewing)]}`}
                  >
                    {ownerPayableStatusLabel(statusOf(viewing))}
                  </span>
                  {isOverdue(viewing, today) ? (
                    <span className="flex items-center gap-1 font-medium text-red-700">
                      <TriangleAlert className="h-3 w-3" />
                      {daysLate(viewing, today)} days past due
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide opacity-55">
                  Owner remittance waterfall
                </p>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between gap-3">
                    <dt className="opacity-60">Total rental income</dt>
                    <dd className="tabular-nums">
                      {money(viewing.grossRentCollected)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="opacity-60">
                      Harborline management fee ({viewing.managementFeePercent}%)
                    </dt>
                    <dd className="tabular-nums text-red-700">
                      −{money(viewing.managementFeeAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="opacity-60">Reimbursable expenses</dt>
                    <dd className="tabular-nums text-red-700">
                      −{money(viewing.reimbursableExpenses)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="opacity-60">Reserves withheld</dt>
                    <dd className="tabular-nums text-red-700">
                      −{money(viewing.reservesWithheld)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-base-300 pt-2 font-semibold">
                    <dt>Net amount due to owner</dt>
                    <dd className="tabular-nums text-[var(--harbor-ink)]">
                      {money(viewing.amount)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs opacity-55">
                  Harborline&apos;s income is the {viewing.managementFeePercent}%
                  management fee from the signed contract (or portfolio
                  default). Expenses and reserves reduce the owner distribution
                  but are not additional Harborline income. Unpaid monthly
                  remittances refresh automatically when A/R collections change.
                </p>
                {viewing.paymentType === "monthly_distribution" &&
                viewing.amountPaid === 0 ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-xs mt-3"
                    onClick={async () => {
                      const next = applyLiveRentToRemittance(
                        viewing,
                        rentalReceivables,
                        managedProperties
                      );
                      await saveOne(next);
                      setSavedMsg(
                        "Remittance refreshed from A/R collections and management contract."
                      );
                      setTimeout(() => setSavedMsg(null), 3500);
                    }}
                  >
                    Refresh from A/R collections
                  </button>
                ) : null}
              </div>

              <dl className="divide-y divide-base-300 rounded-xl border border-[var(--harbor-deep)]/15 bg-white text-sm">
                <DetailRow label="Payment ID" value={viewing.paymentId} />
                <DetailRow label="Owner name" value={viewing.ownerName} />
                <DetailRow label="Owner ID" value={viewing.ownerId} />
                <DetailRow label="Property" value={viewing.property} />
                <DetailRow label="Period" value={viewing.period} />
                <DetailRow
                  label="Payment type"
                  value={ownerPaymentTypeLabel(viewing.paymentType)}
                />
                <DetailRow
                  label="Paid to date"
                  value={money(viewing.amountPaid)}
                />
                <DetailRow
                  label="Statement date"
                  value={viewing.invoiceDate || "—"}
                />
                <DetailRow label="Due date" value={viewing.dueDate || "—"} />
                <DetailRow
                  label="Payment method"
                  value={ownerPaymentMethodLabel(viewing.paymentMethod)}
                />
                <DetailRow
                  label="Reference"
                  value={viewing.paymentReference || "—"}
                />
                <DetailRow
                  label="Statement approved"
                  value={viewing.statementApproved ? "Yes" : "No"}
                />
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
                  <p className="text-sm font-semibold">Record an owner payment</p>
                  {formError ? (
                    <p className="mt-2 text-xs text-red-700">{formError}</p>
                  ) : null}
                  {!viewing.statementApproved ? (
                    <p className="mt-2 text-xs text-amber-800">
                      Statement is not approved yet — payment recording is blocked.
                    </p>
                  ) : null}
                  {viewing.onHold ? (
                    <p className="mt-2 text-xs text-amber-800">
                      Remittance is on hold — release the hold before paying.
                    </p>
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
    </>
  );
}
