import Link from "next/link";
import { Banknote, Building2, CreditCard } from "lucide-react";
import type { PaymentsOverview } from "@/lib/portal/payments-types";
import { isAchEnrolled } from "@/lib/portal/payments-ach";
import { paymentStatusClass } from "@/lib/portal/dashboard-status";
import {
  COMPANY_MANAGEMENT_EMAIL,
  COMPANY_MANAGEMENT_PHONE,
  COMPANY_SHORT,
} from "@/lib/brand";

type Props = {
  data: PaymentsOverview;
};

export function PaymentsOverviewSummary({ data }: Props) {
  const ach = isAchEnrolled(data);
  const lateFeeLines = data.ledger.filter((line) => line.kind === "fee");
  const hasLateFee = Boolean(data.lateFee) || lateFeeLines.length > 0;

  return (
    <section aria-labelledby="payments-overview-heading" className="space-y-4">
      <h2 id="payments-overview-heading" className="sr-only">
        Payment overview
      </h2>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-[var(--harbor-muted)]">Amount due</p>
            <p className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
              {data.amountDue}
            </p>
            <p className="text-sm text-[var(--harbor-ink)]/70">
              Due <strong>{data.dueDate}</strong>
              <span className="mx-1.5 text-[var(--harbor-muted)]">·</span>
              <span
                className={`badge badge-sm ${paymentStatusClass(data.paymentStatus)}`}
              >
                {data.paymentStatus}
              </span>
            </p>
            <p className="text-sm text-[var(--harbor-muted)]">
              Current balance {data.currentBalance}
            </p>
          </div>

          {ach ? (
            <div className="max-w-md rounded-xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-mist)]/50 px-4 py-3 text-sm text-[var(--harbor-ink)]/80">
              <p className="font-semibold text-[var(--harbor-ink)]">
                ACH autopay is on
              </p>
              <p className="mt-1">
                Rent drafts automatically
                {data.autopay.nextRunDate
                  ? ` on ${data.autopay.nextRunDate}`
                  : " on the due date"}
                {data.autopay.methodLabel
                  ? ` via ${data.autopay.methodLabel}`
                  : ""}
                . You do not need to pay manually unless management asks you to.
              </p>
            </div>
          ) : (
            <Link
              href="/portal/payments/make"
              className="btn btn-neutral btn-lg min-h-12 gap-2 px-6 text-base"
            >
              Pay {data.amountDue} with debit card
            </Link>
          )}
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Payment amount" value={data.amountDue} />
        <SummaryCard label="Due date" value={data.dueDate} />
        <li className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm">
          <p className="text-sm text-[var(--harbor-muted)]">Late fees</p>
          {data.lateFee ? (
            <p className="mt-2 font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
              {data.lateFee}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
              None assessed right now
            </p>
          )}
        </li>
      </ul>

      <section
        className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm sm:p-5"
        aria-labelledby="payment-options-heading"
      >
        <h3
          id="payment-options-heading"
          className="text-sm font-semibold text-[var(--harbor-ink)]"
        >
          Payment options
        </h3>
        {ach ? (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-3 py-3">
            <Building2
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--harbor-mid)]"
              aria-hidden="true"
            />
            <div className="text-sm text-[var(--harbor-ink)]/80">
              <p className="font-medium text-[var(--harbor-ink)]">ACH enrolled</p>
              <p className="mt-1">
                Your lease is set up for ACH. {COMPANY_SHORT} drafts the amount
                due on or after the due date. Contact management if you need to
                change enrollment.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-3 py-3">
              <CreditCard
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--harbor-mid)]"
                aria-hidden="true"
              />
              <div className="text-sm text-[var(--harbor-ink)]/80">
                <p className="font-medium text-[var(--harbor-ink)]">
                  Debit card (portal)
                </p>
                <p className="mt-1">
                  Pay the balance online with a debit card. You are not on ACH,
                  so this is the self-serve option in the portal.
                </p>
                <Link
                  href="/portal/payments/make"
                  className="btn btn-neutral btn-sm mt-3 min-h-10"
                >
                  Pay with debit
                </Link>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-3 py-3">
              <Banknote
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--harbor-mid)]"
                aria-hidden="true"
              />
              <div className="text-sm text-[var(--harbor-ink)]/80">
                <p className="font-medium text-[var(--harbor-ink)]">
                  Check to management
                </p>
                <p className="mt-1">
                  Write a check payable to {COMPANY_SHORT} and deliver it to
                  management. Checks are not processed in the portal.
                </p>
                <p className="mt-2 text-xs text-[var(--harbor-muted)]">
                  {COMPANY_MANAGEMENT_EMAIL} · {COMPANY_MANAGEMENT_PHONE}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section
        className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
          hasLateFee
            ? "border-amber-300/60 bg-amber-50/80"
            : "border-[var(--harbor-deep)]/10 bg-white/80"
        }`}
        aria-labelledby="late-fees-heading"
      >
        <h3
          id="late-fees-heading"
          className="text-sm font-semibold text-[var(--harbor-ink)]"
        >
          Late fees from management
        </h3>
        {!hasLateFee ? (
          <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
            No late fees have been assessed on your current balance.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--harbor-deep)]/10">
            {lateFeeLines.length > 0 ? (
              lateFeeLines.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--harbor-ink)]">
                      {line.label}
                    </p>
                    <p className="text-xs text-[var(--harbor-ink)]/55">
                      {line.date}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--harbor-ink)]">
                    {line.amount}
                  </p>
                </li>
              ))
            ) : (
              <li className="flex flex-wrap items-center justify-between gap-2 py-1">
                <p className="text-sm font-medium text-[var(--harbor-ink)]">
                  Late fee on current balance
                </p>
                <p className="text-sm font-semibold text-[var(--harbor-ink)]">
                  {data.lateFee}
                </p>
              </li>
            )}
          </ul>
        )}
      </section>

      {data.ledger.length > 0 ? (
        <section
          className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm sm:p-5"
          aria-labelledby="open-charges-heading"
        >
          <h3
            id="open-charges-heading"
            className="text-sm font-semibold text-[var(--harbor-ink)]"
          >
            Open charges &amp; credits
          </h3>
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
        </section>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm">
      <p className="text-sm text-[var(--harbor-muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
        {value}
      </p>
    </li>
  );
}
