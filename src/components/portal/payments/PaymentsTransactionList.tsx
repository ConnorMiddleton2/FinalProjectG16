import { Download } from "lucide-react";
import type { PaymentTransaction } from "@/lib/portal/payments-types";
import { paymentStatusClass } from "@/lib/portal/dashboard-status";

type Props = {
  transactions: PaymentTransaction[];
  onDownloadReceipt: (txn: PaymentTransaction) => void;
};

export function PaymentsTransactionList({
  transactions,
  onDownloadReceipt,
}: Props) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 px-4 py-8 text-center text-sm text-[var(--harbor-muted)]">
        No transactions match these filters.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3 md:hidden">
        {transactions.map((txn) => (
          <li
            key={txn.id}
            className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-[var(--harbor-muted)]">
                  {txn.displayDate}
                </p>
                <p className="mt-0.5 font-medium text-[var(--harbor-ink)]">
                  {txn.label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--harbor-muted)]">
                  {txn.type} · {txn.methodSummary}
                </p>
              </div>
              <p className="whitespace-nowrap text-right font-semibold text-[var(--harbor-ink)]">
                {txn.amount}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className={`badge badge-sm ${paymentStatusClass(txn.status)}`}>
                {txn.status}
              </span>
              {txn.receiptAvailable ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm min-h-11 gap-1 portal-focus"
                  onClick={() => onDownloadReceipt(txn)}
                  aria-label={`Download receipt for ${txn.label}`}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Receipt
                </button>
              ) : (
                <span className="text-xs text-[var(--harbor-muted)]">
                  No receipt
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 shadow-sm md:block">
        <table className="table">
          <caption className="sr-only">Filtered payment transactions</caption>
          <thead>
            <tr className="text-[var(--harbor-muted)]">
              <th scope="col">Date</th>
              <th scope="col">Description</th>
              <th scope="col">Type</th>
              <th scope="col">Method</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">
                Amount
              </th>
              <th scope="col">
                <span className="sr-only">Receipt</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id}>
                <td className="whitespace-nowrap">{txn.displayDate}</td>
                <td>{txn.label}</td>
                <td>{txn.type}</td>
                <td className="whitespace-nowrap text-sm">{txn.methodSummary}</td>
                <td>
                  <span className={`badge badge-sm ${paymentStatusClass(txn.status)}`}>
                    {txn.status}
                  </span>
                </td>
                <td className="text-right font-medium">{txn.amount}</td>
                <td>
                  {txn.receiptAvailable ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm min-h-11 gap-1 portal-focus"
                      onClick={() => onDownloadReceipt(txn)}
                      aria-label={`Download receipt for ${txn.label}`}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Receipt
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--harbor-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
