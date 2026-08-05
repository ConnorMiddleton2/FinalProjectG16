"use client";

import { FormEvent, useId, useState } from "react";
import Link from "next/link";
import { AlertCircle, LoaderCircle, RefreshCw, X } from "lucide-react";
import { PaymentsActions } from "@/components/portal/payments/PaymentsActions";
import { PaymentsOverviewSummary } from "@/components/portal/payments/PaymentsOverviewSummary";
import { PaymentsTransactionFilters } from "@/components/portal/payments/PaymentsTransactionFilters";
import { PaymentsTransactionList } from "@/components/portal/payments/PaymentsTransactionList";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import type {
  PaymentTransaction,
  SavedPaymentMethodSummary,
} from "@/lib/portal/payments-types";

export function CurrentTenantPaymentsPage() {
  const {
    state,
    filters,
    filteredTransactions,
    successMessage,
    reload,
    loadDemoData,
    updateFilters,
    resetFilters,
    showSuccess,
  } = useTenantPayments();

  const [autopayOpen, setAutopayOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [savedMethod, setSavedMethod] =
    useState<SavedPaymentMethodSummary | null>(null);

  if (state.status === "loading") {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          className="h-8 w-8 animate-spin text-[var(--harbor-mid)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--harbor-ink)]/70">
          Loading payments…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className="rounded-2xl border border-error/30 bg-error/5 p-6"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-error" aria-hidden="true" />
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                Payments unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
                {state.message}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm gap-1"
                onClick={() => void reload()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadDemoData}
              >
                Use demo data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
          No payment activity yet
        </h2>
        <p className="max-w-xl text-sm text-[var(--harbor-ink)]/65">
          {state.message}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            onClick={loadDemoData}
          >
            Preview with demo data
          </button>
          <Link href="/portal" className="btn btn-ghost btn-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const data = {
    ...state.data,
    autopay: {
      ...state.data.autopay,
      enabled: autopayEnabled || state.data.autopay.enabled,
      nextRunDate:
        autopayEnabled || state.data.autopay.enabled
          ? state.data.autopay.nextRunDate ?? "May 1, 2026"
          : null,
      methodLabel:
        autopayEnabled || state.data.autopay.enabled
          ? savedMethod
            ? `${savedMethod.brand} •••• ${savedMethod.last4}`
            : state.data.autopay.methodLabel ??
              (state.data.savedMethod
                ? `${state.data.savedMethod.brand} •••• ${state.data.savedMethod.last4}`
                : null)
          : null,
    },
    savedMethod: savedMethod ?? state.data.savedMethod,
  };

  const latestReceipt = data.transactions.find((t) => t.receiptAvailable);

  function handleDownloadReceipt(txn: PaymentTransaction) {
    const body = [
      "Harborline Property Management",
      "Payment receipt (demo — not a bank record)",
      "----------------------------------------",
      `Receipt ID: ${txn.id}`,
      `Description: ${txn.label}`,
      `Amount: ${txn.amount}`,
      `Date: ${txn.displayDate}`,
      `Status: ${txn.status}`,
      `Type: ${txn.type}`,
      `Method: ${txn.methodSummary}`,
      "",
      "No complete card or bank-account details are stored or printed.",
    ].join("\n");

    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `harborline-receipt-${txn.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    showSuccess(`Receipt downloaded for ${txn.label}.`);
  }

  return (
    <div className="space-y-6">
      {successMessage ? (
        <div
          className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
          role="status"
          aria-live="polite"
        >
          {successMessage}
        </div>
      ) : (
        <div
          className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
          role="status"
        >
          Payments loaded successfully. Display-only demo data — no live
          charges are processed.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <PaymentsOverviewSummary data={data} />
          <PaymentsTransactionFilters
            filters={filters}
            resultCount={filteredTransactions.length}
            onChange={updateFilters}
            onReset={resetFilters}
          />
          <PaymentsTransactionList
            transactions={filteredTransactions}
            onDownloadReceipt={handleDownloadReceipt}
          />
        </div>

        <PaymentsActions
          canDownloadReceipt={Boolean(latestReceipt)}
          onManageAutopay={() => setAutopayOpen(true)}
          onAddPaymentMethod={() => setMethodOpen(true)}
          onDownloadLatestReceipt={() => {
            if (latestReceipt) handleDownloadReceipt(latestReceipt);
          }}
        />
      </div>

      {autopayOpen ? (
        <AutopayDialog
          enabled={data.autopay.enabled}
          methodLabel={data.autopay.methodLabel}
          onClose={() => setAutopayOpen(false)}
          onSave={(enabled) => {
            setAutopayEnabled(enabled);
            setAutopayOpen(false);
            showSuccess(
              enabled
                ? "Autopay preference saved (demo only — no charges scheduled)."
                : "Autopay turned off (demo only)."
            );
          }}
        />
      ) : null}

      {methodOpen ? (
        <AddPaymentMethodDialog
          onClose={() => setMethodOpen(false)}
          onSave={(method) => {
            setSavedMethod(method);
            setMethodOpen(false);
            showSuccess(
              `Saved ${method.brand} •••• ${method.last4} summary (demo only — full details were not stored).`
            );
          }}
        />
      ) : null}
    </div>
  );
}

function AutopayDialog({
  enabled,
  methodLabel,
  onClose,
  onSave,
}: {
  enabled: boolean;
  methodLabel: string | null;
  onClose: () => void;
  onSave: (enabled: boolean) => void;
}) {
  const titleId = useId();
  const [nextEnabled, setNextEnabled] = useState(enabled);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--harbor-ink)]/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--harbor-ink)]">
            Manage Autopay
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
          Demo preference only. No payment provider is connected, so enabling
          autopay will not move money.
        </p>
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={nextEnabled}
            onChange={(e) => setNextEnabled(e.target.checked)}
          />
          <span className="text-sm text-[var(--harbor-ink)]">
            Enable autopay
            {methodLabel ? ` using ${methodLabel}` : ""}
          </span>
        </label>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            onClick={() => onSave(nextEnabled)}
          >
            Save preference
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPaymentMethodDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (method: SavedPaymentMethodSummary) => void;
}) {
  const titleId = useId();
  const [kind, setKind] = useState<"Card" | "Bank">("Card");
  const [brand, setBrand] = useState("Visa");
  const [last4, setLast4] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = last4.replace(/\D/g, "");
    if (digits.length !== 4) {
      setError("Enter exactly the last four digits only.");
      return;
    }
    setError(null);
    onSave({
      id: `pm-${crypto.randomUUID()}`,
      brand: kind === "Card" ? brand : "Bank",
      last4: digits,
      kind,
      isDefault: true,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--harbor-ink)]/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--harbor-ink)]">
            Add Payment Method
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-[var(--harbor-ink)]/65">
          For this class project we only store a masked summary (last four
          digits). Do not enter a full card or bank account number.
        </p>

        <fieldset className="space-y-2">
          <legend className="text-sm text-[var(--harbor-ink)]/70">Type</legend>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="method-kind"
                className="radio radio-sm"
                checked={kind === "Card"}
                onChange={() => setKind("Card")}
              />
              Card
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="method-kind"
                className="radio radio-sm"
                checked={kind === "Bank"}
                onChange={() => setKind("Bank")}
              />
              Bank
            </label>
          </div>
        </fieldset>

        {kind === "Card" ? (
          <label className="form-control w-full">
            <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
              Card brand
            </span>
            <select
              className="select select-bordered w-full"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            >
              <option>Visa</option>
              <option>Mastercard</option>
              <option>Amex</option>
              <option>Discover</option>
            </select>
          </label>
        ) : null}

        <label className="form-control w-full">
          <span className="mb-1 text-sm text-[var(--harbor-ink)]/70">
            Last four digits only
          </span>
          <input
            className="input input-bordered w-full"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="4242"
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "method-last4-error" : undefined}
          />
        </label>

        {error ? (
          <p id="method-last4-error" className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-neutral btn-sm">
            Save summary
          </button>
        </div>
      </form>
    </div>
  );
}
