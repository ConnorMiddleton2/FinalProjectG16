"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Banknote, Building2, CreditCard, LoaderCircle } from "lucide-react";
import {
  portalConfirmCheckDelivery,
  portalRecordRentPayment,
  portalSavePaymentMethodAction,
} from "@/app/portal/payment-actions";
import type { PaymentsOverview } from "@/lib/portal/payments-types";
import { isAchEnrolled } from "@/lib/portal/payments-ach";
import { paymentStatusClass } from "@/lib/portal/dashboard-status";
import {
  COMPANY_MANAGEMENT_EMAIL,
  COMPANY_MANAGEMENT_PHONE,
  COMPANY_SHORT,
} from "@/lib/brand";
import type { TenantPaymentMethod } from "@/lib/payment-methods";

type MethodChoice = TenantPaymentMethod;

type Props = {
  data: PaymentsOverview;
  onSuccess: (message: string) => void;
  onPaid: () => void;
};

function parseMoney(value: string): number {
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function PaymentBillPanel({ data, onSuccess, onPaid }: Props) {
  const achOn = isAchEnrolled(data);
  const amountDue = parseMoney(data.amountDue);
  const balance = parseMoney(data.currentBalance);
  const billAmount = amountDue > 0 ? amountDue : balance;
  const hasBill = billAmount > 0.009;
  const checkPending = data.pendingCheck?.status === "pending_ar";
  const balanceLocked =
    checkPending ||
    data.paymentStatus === "Paid" ||
    !hasBill;

  const defaultMethod: MethodChoice = checkPending
    ? "check"
    : achOn
      ? "ach"
      : data.savedMethod?.kind === "Debit card" ||
          data.savedMethod?.kind === "Card"
        ? "debit_card"
        : data.savedMethod?.kind === "Check"
          ? "check"
          : "debit_card";

  const [method, setMethod] = useState<MethodChoice>(defaultMethod);
  const [debitLast4, setDebitLast4] = useState("");
  const [debitName, setDebitName] = useState("");
  const [achAccountLast4, setAchAccountLast4] = useState("");
  const [achRoutingLast4, setAchRoutingLast4] = useState("");
  const [achAccountName, setAchAccountName] = useState("");
  const [checkDelivered, setCheckDelivered] = useState(false);
  const [checkHow, setCheckHow] = useState<"mailed" | "handed">("handed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceSettled, setBalanceSettled] = useState(false);
  const submitLock = useRef(false);

  const payBlocked = balanceLocked || balanceSettled;

  const billLabel = useMemo(() => {
    if (data.paymentStatus === "Overdue") return "Current bill (overdue)";
    if ((data.paymentStatus === "Paid" || balanceSettled) && !hasBill)
      return "Next bill";
    return "Current / next bill";
  }, [data.paymentStatus, hasBill, balanceSettled]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitLock.current || busy) return;
    setError(null);

    if (method === "debit_card" || method === "check") {
      if (payBlocked) {
        setError(
          checkPending
            ? "A check is already awaiting Accounts Receivable. You cannot submit another payment for this balance."
            : "This balance is already paid or submitted. You cannot pay it again."
        );
        return;
      }
    }

    submitLock.current = true;
    setBusy(true);
    try {
      if (method === "debit_card") {
        if (!hasBill) {
          setError("There is no balance due to pay right now.");
          return;
        }
        if (debitLast4.replace(/\D/g, "").length !== 4) {
          setError("Enter the last 4 digits of your debit card.");
          return;
        }
        if (!debitName.trim()) {
          setError("Enter the name on the debit card.");
          return;
        }
        const save = await portalSavePaymentMethodAction({
          method: "debit_card",
          last4: debitLast4,
        });
        if (save && "error" in save && save.error) {
          // Still allow pay if method save fails (lease may lack tenant row)
        }
        const pay = await portalRecordRentPayment({
          amount: billAmount,
          method: `Debit card •••• ${debitLast4.replace(/\D/g, "").slice(-4)}`,
        });
        if (pay && "error" in pay && pay.error) {
          setError(pay.error);
          return;
        }
        setBalanceSettled(true);
        onSuccess(
          `Debit payment of $${billAmount.toFixed(2)} recorded. Confirmation ${
            pay && "confirmationNumber" in pay ? pay.confirmationNumber : ""
          }.`.trim()
        );
        onPaid();
        return;
      }

      if (method === "check") {
        if (!hasBill) {
          setError("There is no balance due to confirm right now.");
          return;
        }
        if (!checkDelivered) {
          setError(
            "Confirm that you have mailed or handed the check to management."
          );
          return;
        }
        const pay = await portalConfirmCheckDelivery({
          amount: billAmount,
          delivery: checkHow,
        });
        if (pay && "error" in pay && pay.error) {
          setError(pay.error);
          return;
        }
        setMethod("check");
        setBalanceSettled(true);
        onSuccess(
          pay && "message" in pay && pay.message
            ? pay.message
            : `Check of $${billAmount.toFixed(2)} submitted. Accounts Receivable must approve before funds are deposited.`
        );
        onPaid();
        return;
      }

      // ACH enrollment
      if (achAccountLast4.replace(/\D/g, "").length !== 4) {
        setError("Enter the last 4 digits of your bank account.");
        return;
      }
      if (achRoutingLast4.replace(/\D/g, "").length !== 4) {
        setError("Enter the last 4 digits of your routing number.");
        return;
      }
      if (!achAccountName.trim()) {
        setError("Enter the name on the bank account.");
        return;
      }
      const save = await portalSavePaymentMethodAction({
        method: "ach",
        last4: achAccountLast4,
      });
      if (save && "error" in save && save.error) {
        setError(save.error);
        return;
      }
      onSuccess(
        `ACH enrolled (account •••• ${achAccountLast4.replace(/\D/g, "").slice(-4)}). Rent will be collected automatically on the due date.`
      );
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete payment.");
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm sm:p-5"
      aria-labelledby="payment-bill-heading"
    >
      <div>
        <h2
          id="payment-bill-heading"
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          {billLabel}
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-muted)]">
          Review the amount due, choose how you pay, and complete the steps for
          that method.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
            Amount
          </p>
          <p className="mt-1 font-display text-3xl tracking-tight text-[var(--harbor-ink)]">
            {hasBill ? data.amountDue : data.currentBalance}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
            Due date
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--harbor-ink)]">
            {data.dueDate}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
            Status
          </p>
          {checkPending ? (
            <span className="badge badge-lg badge-warning mt-2">
              Awaiting A/R
            </span>
          ) : balanceSettled || data.paymentStatus === "Paid" ? (
            <span className="badge badge-lg badge-success mt-2">Paid</span>
          ) : (
            <span
              className={`badge badge-lg mt-2 ${paymentStatusClass(data.paymentStatus)}`}
            >
              {data.paymentStatus}
            </span>
          )}
          {data.lateFee ? (
            <p className="mt-2 text-sm text-amber-800">
              Late fees: <strong>{data.lateFee}</strong>
            </p>
          ) : null}
        </div>
      </div>

      {balanceSettled && !checkPending && data.pendingCheck?.status !== "approved" ? (
        <div
          className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]"
          role="status"
        >
          <p className="font-semibold">Balance payment submitted</p>
          <p className="mt-1">
            This bill is locked so it cannot be paid twice. Refresh if you need
            an updated balance.
          </p>
        </div>
      ) : null}

      {data.pendingCheck?.status === "pending_ar" ? (
        <div
          className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-semibold">
            Check payment submitted — awaiting Accounts Receivable
          </p>
          <p className="mt-1">
            You confirmed a check for <strong>{data.pendingCheck.amount}</strong>{" "}
            was{" "}
            {data.pendingCheck.delivery === "mailed"
              ? "mailed"
              : "handed to management"}
            . Funds are not deposited until A/R approves. You will get a portal
            message when it is approved or if they need more information.
          </p>
          <p className="mt-2 text-xs text-amber-900/70">
            Submitted {new Date(data.pendingCheck.submittedAt).toLocaleString()}
          </p>
        </div>
      ) : null}

      {data.pendingCheck?.status === "approved" ? (
        <div
          className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]"
          role="status"
        >
          <p className="font-semibold">Latest check was approved by A/R</p>
          <p className="mt-1">
            {data.pendingCheck.amount} was deposited to the property bank and
            applied to your rent balance.
          </p>
        </div>
      ) : null}

      {data.pendingCheck?.status === "declined" ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950"
          role="status"
        >
          <p className="font-semibold">Latest check was not approved</p>
          <p className="mt-1">
            Accounts Receivable declined your check confirmation. Contact
            management or submit again after delivering the check.
          </p>
        </div>
      ) : null}

      {achOn ? (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-mist)]/50 px-4 py-3 text-sm text-[var(--harbor-ink)]/80">
          <Building2
            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-[var(--harbor-ink)]">
              ACH autopay is enrolled
            </p>
            <p className="mt-1">
              Rent drafts automatically
              {data.autopay.nextRunDate
                ? ` on ${data.autopay.nextRunDate}`
                : " on the due date"}
              {data.savedMethod
                ? ` from account •••• ${data.savedMethod.last4}`
                : ""}
              . You can update ACH details below if needed.
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-semibold text-[var(--harbor-ink)]">
            Select payment method
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MethodOption
              selected={method === "debit_card"}
              onSelect={() => setMethod("debit_card")}
              icon={CreditCard}
              title="Debit card"
              detail="Enter card details and pay now"
              disabled={payBlocked}
            />
            <MethodOption
              selected={method === "check"}
              onSelect={() => setMethod("check")}
              icon={Banknote}
              title="Check"
              detail={
                checkPending
                  ? "Submitted — awaiting A/R approval"
                  : balanceSettled
                    ? "Balance already submitted"
                    : "Confirm check mailed or handed to management"
              }
              disabled={balanceSettled && !checkPending}
            />
            <MethodOption
              selected={method === "ach"}
              onSelect={() => setMethod("ach")}
              icon={Building2}
              title="ACH autopay"
              detail="Save bank details for automatic collection"
              disabled={checkPending}
            />
          </div>
        </fieldset>

        {method === "debit_card" ? (
          payBlocked ? (
            <div className="space-y-2 rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-[var(--harbor-ink)]">
              <p className="font-semibold">
                {checkPending
                  ? "Debit unavailable — check pending A/R"
                  : "Balance already paid"}
              </p>
              <p>
                {checkPending
                  ? "Wait for Accounts Receivable to finish reviewing your check before using another payment method."
                  : "This bill can only be paid once. A debit or check submission is already on file for this period."}
              </p>
            </div>
          ) : (
          <div className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 p-4">
            <p className="text-sm text-[var(--harbor-ink)]/75">
              Pay the current bill with a debit card. Only the last four digits
              are stored — never the full card number.
            </p>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--harbor-text)]">
                Name on card
              </span>
              <input
                className="input input-bordered w-full bg-white"
                value={debitName}
                onChange={(e) => setDebitName(e.target.value)}
                autoComplete="cc-name"
                required={method === "debit_card"}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--harbor-text)]">
                Debit card last 4
              </span>
              <input
                className="input input-bordered w-full bg-white"
                inputMode="numeric"
                maxLength={4}
                placeholder="4242"
                value={debitLast4}
                onChange={(e) =>
                  setDebitLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                autoComplete="off"
                required={method === "debit_card"}
              />
            </label>
            <button
              type="submit"
              className="btn btn-neutral min-h-11"
              disabled={busy || payBlocked}
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {busy
                ? "Processing…"
                : payBlocked
                  ? "Balance already paid"
                  : `Pay ${hasBill ? data.amountDue : "$0.00"} now`}
            </button>
          </div>
          )
        ) : null}

        {method === "check" ? (
          data.pendingCheck?.status === "pending_ar" ||
          (balanceSettled && data.pendingCheck?.status !== "declined") ? (
            <div className="space-y-3 rounded-xl border border-amber-300/50 bg-amber-50/80 p-4">
              <p className="text-sm font-semibold text-amber-950">
                Check selected · confirmation on file
              </p>
              <p className="text-sm text-amber-950/80">
                {data.pendingCheck?.status === "pending_ar" ? (
                  <>
                    Your {data.pendingCheck.amount} check (
                    {data.pendingCheck.delivery === "mailed"
                      ? "mailed"
                      : "handed to management"}
                    ) is waiting for Accounts Receivable approval. No bank
                    deposit happens until they approve.
                  </>
                ) : (
                  <>
                    This balance was already submitted. You cannot submit
                    another check or debit payment for the same bill.
                  </>
                )}
              </p>
              <p className="text-xs text-amber-900/70">
                You cannot submit another payment while one is pending review
                or already paid.
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 p-4">
              <p className="text-sm text-[var(--harbor-ink)]/75">
                Write a check payable to {COMPANY_SHORT} for{" "}
                <strong>{hasBill ? data.amountDue : "the amount due"}</strong>,
                then mail or hand it to management (
                {COMPANY_MANAGEMENT_EMAIL} · {COMPANY_MANAGEMENT_PHONE}). A/R
                must approve before funds hit the property bank.
              </p>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-[var(--harbor-text)]">
                  How did you deliver the check?
                </legend>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="radio radio-sm"
                    checked={checkHow === "handed"}
                    onChange={() => setCheckHow("handed")}
                  />
                  Handed to management
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="radio radio-sm"
                    checked={checkHow === "mailed"}
                    onChange={() => setCheckHow("mailed")}
                  />
                  Mailed to management
                </label>
              </fieldset>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5"
                  checked={checkDelivered}
                  onChange={(e) => setCheckDelivered(e.target.checked)}
                />
                <span>
                  I confirm I have{" "}
                  {checkHow === "mailed" ? "mailed" : "handed"} a check for{" "}
                  {hasBill ? data.amountDue : "the amount due"} to{" "}
                  {COMPANY_SHORT} management.
                </span>
              </label>
              <button
                type="submit"
                className="btn btn-neutral min-h-11"
                disabled={busy || payBlocked}
              >
                {busy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {busy ? "Submitting…" : "Submit for A/R approval"}
              </button>
            </div>
          )
        ) : null}

        {method === "ach" ? (
          <div className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 p-4">
            <p className="text-sm text-[var(--harbor-ink)]/75">
              Enroll ACH so rent is collected automatically on the due date.
              Only last-four digits are stored — never full account or routing
              numbers.
            </p>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--harbor-text)]">
                Name on bank account
              </span>
              <input
                className="input input-bordered w-full bg-white"
                value={achAccountName}
                onChange={(e) => setAchAccountName(e.target.value)}
                required={method === "ach"}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--harbor-text)]">
                  Routing number last 4
                </span>
                <input
                  className="input input-bordered w-full bg-white"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0210"
                  value={achRoutingLast4}
                  onChange={(e) =>
                    setAchRoutingLast4(
                      e.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                  autoComplete="off"
                  required={method === "ach"}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--harbor-text)]">
                  Account number last 4
                </span>
                <input
                  className="input input-bordered w-full bg-white"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="9910"
                  value={achAccountLast4}
                  onChange={(e) =>
                    setAchAccountLast4(
                      e.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                  autoComplete="off"
                  required={method === "ach"}
                />
              </label>
            </div>
            <button type="submit" className="btn btn-neutral min-h-11" disabled={busy}>
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {busy
                ? "Saving…"
                : achOn
                  ? "Update ACH enrollment"
                  : "Enroll ACH autopay"}
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function MethodOption({
  selected,
  onSelect,
  icon: Icon,
  title,
  detail,
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof CreditCard;
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex min-h-[4.5rem] flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition ${
        selected
          ? "border-[var(--harbor-ink)] bg-[var(--harbor-sand)]/60 ring-1 ring-[var(--harbor-ink)]"
          : "border-[var(--harbor-deep)]/15 bg-white hover:border-[var(--harbor-mid)]/40"
      } ${disabled ? "cursor-not-allowed opacity-50 hover:border-[var(--harbor-deep)]/15" : ""}`}
      aria-pressed={selected}
      aria-disabled={disabled}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--harbor-ink)]">
        <Icon className="h-4 w-4 text-[var(--harbor-mid)]" aria-hidden="true" />
        {title}
      </span>
      <span className="text-xs text-[var(--harbor-muted)]">{detail}</span>
    </button>
  );
}
