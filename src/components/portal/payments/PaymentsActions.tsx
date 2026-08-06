import Link from "next/link";
import {
  CreditCard,
  Download,
  History,
  PlusCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";

type Props = {
  onManageAutopay: () => void;
  onAddPaymentMethod: () => void;
  onDownloadLatestReceipt: () => void;
  canDownloadReceipt: boolean;
};

export function PaymentsActions({
  onManageAutopay,
  onAddPaymentMethod,
  onDownloadLatestReceipt,
  canDownloadReceipt,
}: Props) {
  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 shadow-sm"
      aria-labelledby="payments-actions-heading"
    >
      <h2
        id="payments-actions-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Actions
      </h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <li>
          <Link
            href="/portal/payments/make"
            className="btn btn-neutral btn-lg w-full justify-start gap-2 min-h-12"
          >
            <Wallet className="h-4 w-4" aria-hidden="true" />
            Pay rent / balance
          </Link>
        </li>
        <li>
          <button
            type="button"
            className="btn btn-outline w-full justify-start gap-2 border-[var(--harbor-deep)]/20"
            onClick={onManageAutopay}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Manage Autopay
          </button>
        </li>
        <li>
          <button
            type="button"
            className="btn btn-outline w-full justify-start gap-2 border-[var(--harbor-deep)]/20"
            onClick={onAddPaymentMethod}
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Add Payment Method
          </button>
        </li>
        <li>
          <button
            type="button"
            className="btn btn-outline w-full justify-start gap-2 border-[var(--harbor-deep)]/20"
            onClick={onDownloadLatestReceipt}
            disabled={!canDownloadReceipt}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download Receipt
          </button>
        </li>
        <li>
          <Link
            href="/portal/payments/history"
            className="btn btn-ghost w-full justify-start gap-2"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            View Full Payment History
          </Link>
        </li>
        <li className="pt-1">
          <p className="flex items-start gap-2 px-1 text-xs text-[var(--harbor-ink)]/55">
            <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Payments are display-only. This project has no live payment
            provider, and complete card or bank details are never stored in the
            browser.
          </p>
        </li>
      </ul>
    </section>
  );
}
