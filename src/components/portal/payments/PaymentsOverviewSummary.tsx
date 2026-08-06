import Link from "next/link";
import type { PaymentsOverview } from "@/lib/portal/payments-types";
import { paymentStatusClass } from "@/lib/portal/dashboard-status";

type Props = {
  data: PaymentsOverview;
};

export function PaymentsOverviewSummary({ data }: Props) {
  return (
    <section aria-labelledby="payments-overview-heading" className="space-y-4">
      <h2 id="payments-overview-heading" className="sr-only">
        Payment overview
      </h2>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-[var(--harbor-ink)]/60">Amount due now</p>
            <p className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
              {data.amountDue}
            </p>
            <p className="text-sm text-[var(--harbor-ink)]/70">
              Due {data.dueDate} · Status{" "}
              <span className={`badge badge-sm ${paymentStatusClass(data.paymentStatus)}`}>
                {data.paymentStatus}
              </span>
            </p>
          </div>
          <Link
            href="/portal/payments/make"
            className="btn btn-neutral btn-lg min-h-12 gap-2 px-6 text-base"
          >
            Pay {data.amountDue} now
          </Link>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Current balance" value={data.currentBalance} />
        <SummaryCard label="Amount due" value={data.amountDue} />
        <SummaryCard label="Due date" value={data.dueDate} />
        <li className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm">
          <p className="text-sm text-[var(--harbor-ink)]/60">Payment status</p>
          <span
            className={`badge badge-lg mt-3 ${paymentStatusClass(data.paymentStatus)}`}
          >
            {data.paymentStatus}
          </span>
        </li>
      </ul>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm sm:p-5"
        aria-labelledby="ledger-heading"
      >
        <h3
          id="ledger-heading"
          className="text-sm font-semibold text-[var(--harbor-ink)]"
        >
          Charges, fees, and credits
        </h3>
        {data.ledger.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--harbor-ink)]/60">
            No open charges or credits on this balance.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--harbor-deep)]/10">
            {data.ledger.map((line) => (
              <li
                key={line.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--harbor-ink)]">
                    {line.label}
                  </p>
                  <p className="text-xs text-[var(--harbor-ink)]/55">
                    {line.date} ·{" "}
                    {line.kind === "charge"
                      ? "Charge"
                      : line.kind === "fee"
                        ? "Fee"
                        : "Credit"}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    line.kind === "credit"
                      ? "text-success"
                      : "text-[var(--harbor-ink)]"
                  }`}
                >
                  {line.amount}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">
            Late fee
          </h3>
          {data.lateFee ? (
            <p className="mt-2 font-display text-2xl text-[var(--harbor-ink)]">
              {data.lateFee}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
              No late fee on this balance.
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">
            Autopay status
          </h3>
          <p className="mt-2 text-sm text-[var(--harbor-ink)]/80">
            {data.autopay.enabled ? (
              <>
                <span className="badge badge-success badge-sm mr-2">On</span>
                Next run {data.autopay.nextRunDate ?? "—"}
                {data.autopay.methodLabel
                  ? ` · ${data.autopay.methodLabel}`
                  : null}
              </>
            ) : (
              <>
                <span className="badge badge-ghost badge-sm mr-2">Off</span>
                Autopay is not enabled for this lease.
              </>
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">
            Saved payment method
          </h3>
          {data.savedMethod ? (
            <div className="mt-2 space-y-1">
              <p className="font-medium text-[var(--harbor-ink)]">
                {data.savedMethod.brand} {data.savedMethod.kind.toLowerCase()}{" "}
                •••• {data.savedMethod.last4}
              </p>
              <p className="text-xs text-[var(--harbor-ink)]/55">
                {data.savedMethod.isDefault ? "Default method · " : ""}
                Only the last four digits are shown.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
              No saved payment method on file.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm">
      <p className="text-sm text-[var(--harbor-ink)]/60">{label}</p>
      <p className="mt-2 font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
        {value}
      </p>
    </li>
  );
}
