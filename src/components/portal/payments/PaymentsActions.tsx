import Link from "next/link";
import { Download, History, Wallet } from "lucide-react";
import {
  COMPANY_MANAGEMENT_EMAIL,
  COMPANY_MANAGEMENT_PHONE,
  COMPANY_SHORT,
} from "@/lib/brand";

type Props = {
  achEnrolled: boolean;
  amountDue: string;
  onDownloadLatestReceipt: () => void;
  canDownloadReceipt: boolean;
};

export function PaymentsActions({
  achEnrolled,
  amountDue,
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
        How to pay
      </h2>

      {achEnrolled ? (
        <p className="mt-3 text-sm text-[var(--harbor-ink)]/75">
          ACH is enrolled on this lease. Rent is drafted automatically — no
          manual portal payment is required.
        </p>
      ) : (
        <div className="mt-3 space-y-3 text-sm text-[var(--harbor-ink)]/75">
          <p>
            You are not on ACH. Pay with a debit card in the portal, or write a
            check and give it to {COMPANY_SHORT} management.
          </p>
          <Link
            href="/portal/payments/make"
            className="btn btn-neutral w-full justify-start gap-2 min-h-12"
          >
            <Wallet className="h-4 w-4" aria-hidden="true" />
            Pay {amountDue} with debit
          </Link>
          <p className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-3 py-3 text-xs leading-relaxed">
            <strong className="text-[var(--harbor-ink)]">Check option:</strong>{" "}
            Make the check payable to {COMPANY_SHORT} and deliver it to
            management. Contact {COMPANY_MANAGEMENT_EMAIL} or{" "}
            {COMPANY_MANAGEMENT_PHONE} to arrange drop-off.
          </p>
        </div>
      )}

      <ul className="mt-4 grid gap-2 border-t border-[var(--harbor-deep)]/10 pt-4">
        <li>
          <button
            type="button"
            className="btn btn-outline w-full justify-start gap-2 border-[var(--harbor-deep)]/20"
            onClick={onDownloadLatestReceipt}
            disabled={!canDownloadReceipt}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download latest receipt
          </button>
        </li>
        <li>
          <Link
            href="/portal/payments/history"
            className="btn btn-ghost w-full justify-start gap-2"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            Full payment history
          </Link>
        </li>
      </ul>
    </section>
  );
}
