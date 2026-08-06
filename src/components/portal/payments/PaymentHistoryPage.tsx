"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownAZ,
  Download,
  Eye,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { PaymentReceiptModal } from "@/components/portal/payments/PaymentReceiptModal";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import {
  buildHistoryReceiptText,
  formatHistoryCurrency,
  formatHistoryDate,
  historyStatusClass,
} from "@/lib/portal/payment-history-format";
import type {
  HistoryPaymentStatus,
  PaymentHistoryDateFilter,
  PaymentHistoryRecord,
  PaymentHistorySortKey,
  SortDirection,
} from "@/lib/portal/payment-history-types";
import { HISTORY_STATUS_OPTIONS } from "@/lib/portal/payment-history-types";

export function PaymentHistoryPage() {
  const {
    state,
    filters,
    filteredCount,
    pageRecords,
    totalPages,
    safePage,
    hasMore,
    successMessage,
    reload,
    loadDemoData,
    updateFilters,
    resetFilters,
    loadMore,
    showSuccess,
  } = usePaymentHistory();

  const [receiptRecord, setReceiptRecord] =
    useState<PaymentHistoryRecord | null>(null);

  function downloadReceipt(record: PaymentHistoryRecord) {
    if (!record.receiptAvailable) {
      showSuccess("No receipt is available for this transaction.");
      return;
    }
    const body = buildHistoryReceiptText(record);
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harborline-receipt-${record.confirmationNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(`Receipt downloaded for ${record.confirmationNumber}.`);
  }

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
        <p className="text-sm text-[var(--harbor-muted)]">
          Loading payment history…
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
                History unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-muted)]">
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
          No payment history yet
        </h2>
        <p className="max-w-xl text-sm text-[var(--harbor-muted)]">
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
          <Link href="/portal/payments" className="btn btn-ghost btn-sm">
            Back to payments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
          Payment history loaded. Display-only demo records with masked payment
          methods.
        </div>
      )}

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
        aria-labelledby="history-filters-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="history-filters-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Find transactions
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]" aria-live="polite">
            {filteredCount} match{filteredCount === 1 ? "" : "es"}
          </p>
        </div>

        <form
          className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="form-control w-full md:col-span-2 xl:col-span-2">
            <span className="mb-1 text-sm text-[var(--harbor-muted)]">
              Search
            </span>
            <input
              type="search"
              className="input input-bordered w-full"
              placeholder="Description, confirmation #, method, status"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
            />
          </label>

          <label className="form-control w-full">
            <span className="mb-1 text-sm text-[var(--harbor-muted)]">
              Status
            </span>
            <select
              className="select select-bordered w-full"
              value={filters.status}
              onChange={(e) =>
                updateFilters({
                  status: e.target.value as "all" | HistoryPaymentStatus,
                })
              }
            >
              <option value="all">All statuses</option>
              {HISTORY_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-full">
            <span className="mb-1 text-sm text-[var(--harbor-muted)]">
              Date range
            </span>
            <select
              className="select select-bordered w-full"
              value={filters.dateFilter}
              onChange={(e) =>
                updateFilters({
                  dateFilter: e.target.value as PaymentHistoryDateFilter,
                })
              }
            >
              <option value="all">All dates</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="ytd">Year to date</option>
              <option value="custom">Custom range</option>
            </select>
          </label>

          <label className="form-control w-full">
            <span className="mb-1 text-sm text-[var(--harbor-muted)]">
              Sort by
            </span>
            <select
              className="select select-bordered w-full"
              value={filters.sortKey}
              onChange={(e) =>
                updateFilters({
                  sortKey: e.target.value as PaymentHistorySortKey,
                })
              }
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
              <option value="description">Description</option>
            </select>
          </label>

          <label className="form-control w-full">
            <span className="mb-1 text-sm text-[var(--harbor-muted)]">
              Direction
            </span>
            <select
              className="select select-bordered w-full"
              value={filters.sortDirection}
              onChange={(e) =>
                updateFilters({
                  sortDirection: e.target.value as SortDirection,
                })
              }
            >
              <option value="desc">Newest / high first</option>
              <option value="asc">Oldest / low first</option>
            </select>
          </label>

          {filters.dateFilter === "custom" ? (
            <>
              <label className="form-control w-full">
                <span className="mb-1 text-sm text-[var(--harbor-muted)]">
                  From
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={filters.customFrom}
                  onChange={(e) =>
                    updateFilters({ customFrom: e.target.value })
                  }
                />
              </label>
              <label className="form-control w-full">
                <span className="mb-1 text-sm text-[var(--harbor-muted)]">
                  To
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={filters.customTo}
                  onChange={(e) => updateFilters({ customTo: e.target.value })}
                />
              </label>
            </>
          ) : null}

          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1"
              onClick={resetFilters}
            >
              <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
              Reset filters
            </button>
            <Link href="/portal/payments" className="btn btn-ghost btn-sm">
              Back to payments overview
            </Link>
          </div>
        </form>
      </section>

      {filteredCount === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 px-4 py-8 text-center text-sm text-[var(--harbor-muted)]">
          No transactions match your search and filters.
        </p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {pageRecords.map((record) => (
              <li
                key={record.id}
                className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--harbor-muted)]">
                      {formatHistoryDate(record.date)}
                    </p>
                    <p className="mt-0.5 font-medium text-[var(--harbor-ink)]">
                      {record.description}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--harbor-muted)]">
                      {record.propertyLabel} · {record.methodSummary}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--harbor-muted)]">
                      Confirmation {record.confirmationNumber}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-right font-semibold text-[var(--harbor-ink)]">
                    {formatHistoryCurrency(record.amount)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`badge badge-sm ${historyStatusClass(record.status)}`}
                  >
                    {record.status}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm min-h-11 gap-1 portal-focus"
                      onClick={() => setReceiptRecord(record)}
                      aria-label={`View receipt for ${record.confirmationNumber}`}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      View
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm min-h-11 gap-1 portal-focus"
                      onClick={() => downloadReceipt(record)}
                      disabled={!record.receiptAvailable}
                      aria-label={`Download receipt for ${record.confirmationNumber}`}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Download
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 shadow-sm md:block">
            <table className="table">
              <caption className="sr-only">
                Payment history results, page {safePage} of {totalPages}
              </caption>
              <thead>
                <tr className="text-[var(--harbor-muted)]">
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="text-right">
                    Amount
                  </th>
                  <th scope="col">Method</th>
                  <th scope="col">Status</th>
                  <th scope="col">Confirmation</th>
                  <th scope="col">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap">
                      {formatHistoryDate(record.date)}
                    </td>
                    <td>
                      <div className="font-medium text-[var(--harbor-ink)]">
                        {record.description}
                      </div>
                      <div className="text-xs text-[var(--harbor-muted)]">
                        {record.propertyLabel}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-right font-medium">
                      {formatHistoryCurrency(record.amount)}
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      {record.methodSummary}
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${historyStatusClass(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs sm:text-sm">
                      {record.confirmationNumber}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm min-h-11 gap-1 portal-focus"
                          onClick={() => setReceiptRecord(record)}
                          aria-label={`View receipt for ${record.confirmationNumber}`}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm min-h-11 gap-1 portal-focus"
                          onClick={() => downloadReceipt(record)}
                          disabled={!record.receiptAvailable}
                          aria-label={`Download receipt for ${record.confirmationNumber}`}
                        >
                          <Download
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--harbor-muted)]">
              Page {safePage} of {totalPages}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm min-h-11"
                disabled={safePage <= 1}
                onClick={() => updateFilters({ page: safePage - 1 })}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm min-h-11"
                disabled={safePage >= totalPages}
                onClick={() => updateFilters({ page: safePage + 1 })}
              >
                Next
              </button>
              {hasMore ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm min-h-11"
                  onClick={loadMore}
                >
                  Load more
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}

      {receiptRecord ? (
        <PaymentReceiptModal
          record={receiptRecord}
          onClose={() => setReceiptRecord(null)}
          onDownload={(record) => {
            downloadReceipt(record);
          }}
        />
      ) : null}
    </div>
  );
}
