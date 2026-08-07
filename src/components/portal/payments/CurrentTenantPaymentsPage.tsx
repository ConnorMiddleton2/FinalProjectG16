"use client";

import Link from "next/link";
import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { PaymentBillPanel } from "@/components/portal/payments/PaymentBillPanel";
import { PaymentsTransactionFilters } from "@/components/portal/payments/PaymentsTransactionFilters";
import { PaymentsTransactionList } from "@/components/portal/payments/PaymentsTransactionList";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import type { PaymentTransaction } from "@/lib/portal/payments-types";

export function CurrentTenantPaymentsPage() {
  const {
    state,
    filters,
    filteredTransactions,
    successMessage,
    reload,
    updateFilters,
    resetFilters,
    showSuccess,
  } = useTenantPayments();

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
        <p className="text-sm text-[var(--harbor-muted)]">Loading payments…</p>
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
              <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                {state.message}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-neutral btn-sm gap-1"
              onClick={() => void reload()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
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
        <p className="max-w-xl text-sm text-[var(--harbor-muted)]">
          {state.message}
        </p>
        <Link href="/portal" className="btn btn-ghost btn-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const data = state.data;

  function handleDownloadReceipt(txn: PaymentTransaction) {
    const body = [
      "CPMC Property Management Company",
      "Payment receipt",
      "----------------------------------------",
      `Receipt ID: ${txn.id}`,
      `Description: ${txn.label}`,
      `Amount: ${txn.amount}`,
      `Date: ${txn.displayDate}`,
      `Status: ${txn.status}`,
      `Type: ${txn.type}`,
      `Method: ${txn.methodSummary}`,
      "",
      "Only masked payment details are stored.",
    ].join("\n");

    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cpmc-receipt-${txn.id}.txt`;
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
      ) : null}

      <PaymentBillPanel
        data={data}
        onSuccess={showSuccess}
        onPaid={() => void reload()}
      />

      <section className="space-y-3" aria-labelledby="payment-history-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2
            id="payment-history-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Payment history
          </h2>
          <Link
            href="/portal/payments/history"
            className="text-sm font-medium text-[var(--harbor-mid)] hover:underline"
          >
            View full history
          </Link>
        </div>
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
      </section>
    </div>
  );
}
