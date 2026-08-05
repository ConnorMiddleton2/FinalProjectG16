"use client";

import { useId } from "react";
import { Download, X } from "lucide-react";
import {
  buildHistoryReceiptText,
  formatHistoryCurrency,
  formatHistoryDate,
  historyStatusClass,
} from "@/lib/portal/payment-history-format";
import type { PaymentHistoryRecord } from "@/lib/portal/payment-history-types";

type Props = {
  record: PaymentHistoryRecord;
  onClose: () => void;
  onDownload: (record: PaymentHistoryRecord) => void;
};

export function PaymentReceiptModal({ record, onClose, onDownload }: Props) {
  const titleId = useId();

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
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--harbor-ink)]"
            >
              Payment receipt
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
              Demo receipt preview — not a bank document.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            aria-label="Close receipt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReceiptField
            label="Confirmation number"
            value={record.confirmationNumber}
          />
          <ReceiptField label="Date" value={formatHistoryDate(record.date)} />
          <ReceiptField label="Description" value={record.description} />
          <ReceiptField label="Property" value={record.propertyLabel} />
          <ReceiptField
            label="Amount"
            value={formatHistoryCurrency(record.amount)}
          />
          <ReceiptField label="Payment method" value={record.methodSummary} />
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-[var(--harbor-ink)]/50">
              Status
            </dt>
            <dd className="mt-1">
              <span className={`badge ${historyStatusClass(record.status)}`}>
                {record.status}
              </span>
            </dd>
          </div>
        </dl>

        <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-[var(--harbor-sand)]/50 p-3 text-xs text-[var(--harbor-ink)]/80 whitespace-pre-wrap">
          {buildHistoryReceiptText(record)}
        </pre>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-neutral btn-sm gap-1"
            onClick={() => onDownload(record)}
            disabled={!record.receiptAvailable}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download receipt
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--harbor-ink)]/50">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[var(--harbor-ink)]">
        {value}
      </dd>
    </div>
  );
}
