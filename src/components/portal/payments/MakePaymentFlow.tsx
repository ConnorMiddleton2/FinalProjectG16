"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  LoaderCircle,
} from "lucide-react";
import { useMakePaymentFlow } from "@/hooks/useMakePaymentFlow";
import { formatUsd } from "@/lib/portal/make-payment-mock";

export function MakePaymentFlow() {
  const flow = useMakePaymentFlow();
  const {
    context,
    step,
    stepIndex,
    steps,
    stepLabels,
    draft,
    resolvedAmount,
    selectedMethod,
    amountError,
    methodError,
    confirmError,
    processing,
    confirmation,
    goNextFromBalance,
    setAmountChoice,
    setCustomAmountInput,
    goNextFromAmount,
    setMethodId,
    goNextFromMethod,
    goNextFromReview,
    goBack,
    confirmPayment,
    startNewPayment,
  } = flow;

  function downloadReceipt() {
    if (!confirmation) return;
    const body = [
      "Harborline Property Management",
      "Rent payment receipt (demo — not a bank record)",
      "----------------------------------------------",
      `Confirmation: ${confirmation.confirmationNumber}`,
      `Date: ${confirmation.paidAt}`,
      `Property: ${confirmation.propertyLabel}`,
      `Amount: ${formatUsd(confirmation.amount)}`,
      `Method: ${confirmation.methodSummary}`,
      `Updated balance: ${formatUsd(confirmation.updatedBalance)}`,
      "",
      "Isolated mock flow — no live payment provider.",
      "Complete card or bank details are never stored.",
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harborline-receipt-${confirmation.confirmationNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border border-[var(--harbor-mid)]/20 bg-[var(--harbor-mist)]/50 px-4 py-3 text-sm text-[var(--harbor-ink)]/75"
        role="note"
      >
        Isolated mock payment flow. This project has no live payment provider —
        nothing is charged, and only masked method summaries are used.
      </div>

      <nav aria-label="Payment steps">
        <ol className="flex flex-wrap gap-2">
          {steps.map((id, index) => {
            const active = id === step;
            const done = index < stepIndex;
            return (
              <li key={id}>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                    active
                      ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                      : done
                        ? "bg-[var(--harbor-mid)]/15 text-[var(--harbor-deep)]"
                        : "bg-white/70 text-[var(--harbor-ink)]/45"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  {stepLabels[id]}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm sm:p-6">
        {step === "review-balance" ? (
          <StepReviewBalance
            propertyLabel={context.propertyLabel}
            balance={context.currentBalance}
            rent={context.currentRent}
            lateFee={context.lateFee}
            dueDate={context.dueDate}
            onContinue={goNextFromBalance}
          />
        ) : null}

        {step === "select-amount" ? (
          <StepSelectAmount
            context={context}
            amountChoice={draft.amountChoice}
            customAmountInput={draft.customAmountInput}
            error={amountError}
            onSelectChoice={setAmountChoice}
            onCustomChange={setCustomAmountInput}
            onBack={goBack}
            onContinue={() => void goNextFromAmount()}
          />
        ) : null}

        {step === "select-method" ? (
          <StepSelectMethod
            methods={context.methods}
            methodId={draft.methodId}
            error={methodError}
            amount={resolvedAmount}
            onSelect={setMethodId}
            onBack={goBack}
            onContinue={() => void goNextFromMethod()}
          />
        ) : null}

        {step === "review-payment" ? (
          <StepReviewPayment
            propertyLabel={context.propertyLabel}
            amount={resolvedAmount}
            method={selectedMethod}
            dueDate={context.dueDate}
            onBack={goBack}
            onContinue={goNextFromReview}
          />
        ) : null}

        {step === "confirm-payment" ? (
          <StepConfirmPayment
            amount={resolvedAmount}
            method={selectedMethod}
            error={confirmError}
            processing={processing}
            onBack={goBack}
            onConfirm={() => void confirmPayment()}
          />
        ) : null}

        {step === "confirmation" && confirmation ? (
          <StepConfirmation
            confirmation={confirmation}
            onDownloadReceipt={downloadReceipt}
            onNewPayment={startNewPayment}
          />
        ) : null}
      </div>
    </div>
  );
}

function StepActions({
  onBack,
  onContinue,
  continueLabel = "Continue",
  backDisabled,
  continueDisabled,
  continueBusy,
}: {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  backDisabled?: boolean;
  continueDisabled?: boolean;
  continueBusy?: boolean;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      {onBack ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm gap-1"
          onClick={onBack}
          disabled={backDisabled || continueBusy}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      ) : (
        <Link href="/portal/payments" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Cancel
        </Link>
      )}
      <button
        type="button"
        className="btn btn-neutral btn-sm gap-1"
        onClick={onContinue}
        disabled={continueDisabled || continueBusy}
      >
        {continueBusy ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Processing…
          </>
        ) : (
          <>
            {continueLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}

function StepReviewBalance({
  propertyLabel,
  balance,
  rent,
  lateFee,
  dueDate,
  onContinue,
}: {
  propertyLabel: string;
  balance: number;
  rent: number;
  lateFee: number;
  dueDate: string;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
          Review balance
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
          Confirm what you owe for {propertyLabel} before choosing an amount.
        </p>
      </header>
      <dl className="grid gap-3 sm:grid-cols-2">
        <InfoTile label="Current balance" value={formatUsd(balance)} emphasize />
        <InfoTile label="Current rent" value={formatUsd(rent)} />
        <InfoTile
          label="Late fee"
          value={lateFee > 0 ? formatUsd(lateFee) : "None"}
        />
        <InfoTile label="Due date" value={dueDate} />
      </dl>
      <StepActions onContinue={onContinue} continueLabel="Choose amount" />
    </div>
  );
}

function StepSelectAmount({
  context,
  amountChoice,
  customAmountInput,
  error,
  onSelectChoice,
  onCustomChange,
  onBack,
  onContinue,
}: {
  context: ReturnType<typeof useMakePaymentFlow>["context"];
  amountChoice: ReturnType<typeof useMakePaymentFlow>["draft"]["amountChoice"];
  customAmountInput: string;
  error: string | null;
  onSelectChoice: (choice: "full-balance" | "current-rent" | "custom") => void;
  onCustomChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
          Select payment amount
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
          Pay the full balance, this month’s rent, or enter a custom amount
          {context.allowCustomAmount ? "" : " (custom amounts are disabled)"}.
        </p>
      </header>

      <fieldset className="space-y-2">
        <legend className="sr-only">Amount options</legend>
        <AmountOption
          selected={amountChoice === "full-balance"}
          title="Full balance"
          detail={formatUsd(context.currentBalance)}
          onSelect={() => onSelectChoice("full-balance")}
        />
        <AmountOption
          selected={amountChoice === "current-rent"}
          title="Current rent amount"
          detail={formatUsd(context.currentRent)}
          onSelect={() => onSelectChoice("current-rent")}
        />
        {context.allowCustomAmount ? (
          <div
            className={`rounded-xl border px-4 py-3 ${
              amountChoice === "custom"
                ? "border-[var(--harbor-ink)] bg-[var(--harbor-sand)]/50"
                : "border-[var(--harbor-deep)]/15"
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="amount-choice"
                className="radio radio-sm mt-1"
                checked={amountChoice === "custom"}
                onChange={() => onSelectChoice("custom")}
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-[var(--harbor-ink)]">
                  Custom amount
                </span>
                <span className="mt-2 block">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input input-bordered w-full max-w-xs"
                    placeholder="0.00"
                    value={customAmountInput}
                    onChange={(e) => onCustomChange(e.target.value)}
                    onFocus={() => onSelectChoice("custom")}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "amount-error" : "amount-hint"}
                  />
                  <span
                    id="amount-hint"
                    className="mt-1 block text-xs text-[var(--harbor-ink)]/55"
                  >
                    Up to {formatUsd(context.maxPayable)}. Do not exceed the
                    payable balance.
                  </span>
                </span>
              </span>
            </label>
          </div>
        ) : null}
      </fieldset>

      {error ? (
        <p id="amount-error" className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <StepActions onBack={onBack} onContinue={onContinue} />
    </div>
  );
}

function AmountOption({
  selected,
  title,
  detail,
  onSelect,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
        selected
          ? "border-[var(--harbor-ink)] bg-[var(--harbor-sand)]/50"
          : "border-[var(--harbor-deep)]/15"
      }`}
    >
      <input
        type="radio"
        name="amount-choice"
        className="radio radio-sm"
        checked={selected}
        onChange={onSelect}
      />
      <span className="flex-1">
        <span className="block text-sm font-semibold text-[var(--harbor-ink)]">
          {title}
        </span>
        <span className="text-sm text-[var(--harbor-ink)]/65">{detail}</span>
      </span>
    </label>
  );
}

function StepSelectMethod({
  methods,
  methodId,
  error,
  amount,
  onSelect,
  onBack,
  onContinue,
}: {
  methods: ReturnType<typeof useMakePaymentFlow>["context"]["methods"];
  methodId: string | null;
  error: string | null;
  amount: number | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
          Select payment method
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
          Paying {amount !== null ? formatUsd(amount) : "—"}. Only masked method
          summaries are shown.
        </p>
      </header>

      {methods.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--harbor-deep)]/25 px-4 py-6 text-sm text-[var(--harbor-ink)]/60">
          No saved payment methods. Add one from the payments overview first.
        </p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="sr-only">Saved methods</legend>
          {methods.map((method) => {
            const selected = methodId === method.id;
            return (
              <label
                key={method.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                  selected
                    ? "border-[var(--harbor-ink)] bg-[var(--harbor-sand)]/50"
                    : "border-[var(--harbor-deep)]/15"
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  className="radio radio-sm"
                  checked={selected}
                  onChange={() => onSelect(method.id)}
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--harbor-ink)]">
                    {method.brand} {method.kind.toLowerCase()} •••• {method.last4}
                  </span>
                  {method.isDefault ? (
                    <span className="text-xs text-[var(--harbor-ink)]/55">
                      Default
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <StepActions onBack={onBack} onContinue={onContinue} />
    </div>
  );
}

function StepReviewPayment({
  propertyLabel,
  amount,
  method,
  dueDate,
  onBack,
  onContinue,
}: {
  propertyLabel: string;
  amount: number | null;
  method: ReturnType<typeof useMakePaymentFlow>["selectedMethod"];
  dueDate: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
          Review payment
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
          Double-check the details before confirming.
        </p>
      </header>
      <dl className="grid gap-3 sm:grid-cols-2">
        <InfoTile label="Property" value={propertyLabel} />
        <InfoTile label="Due date" value={dueDate} />
        <InfoTile
          label="Amount"
          value={amount !== null ? formatUsd(amount) : "—"}
          emphasize
        />
        <InfoTile
          label="Payment method"
          value={
            method
              ? `${method.brand} ${method.kind.toLowerCase()} •••• ${method.last4}`
              : "—"
          }
        />
      </dl>
      <StepActions
        onBack={onBack}
        onContinue={onContinue}
        continueLabel="Go to confirm"
      />
    </div>
  );
}

function StepConfirmPayment({
  amount,
  method,
  error,
  processing,
  onBack,
  onConfirm,
}: {
  amount: number | null;
  method: ReturnType<typeof useMakePaymentFlow>["selectedMethod"];
  error: string | null;
  processing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
          Confirm payment
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
          Submit once. Duplicate clicks are blocked while processing.
        </p>
      </header>

      <div className="rounded-xl bg-[var(--harbor-sand)]/50 px-4 py-4 text-sm text-[var(--harbor-ink)]/80">
        You are about to submit a <strong>demo</strong> payment of{" "}
        <strong>{amount !== null ? formatUsd(amount) : "—"}</strong>
        {method
          ? ` using ${method.brand} •••• ${method.last4}`
          : ""}.
        No live charge will be made.
      </div>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <StepActions
        onBack={onBack}
        onContinue={onConfirm}
        continueLabel="Confirm payment"
        backDisabled={processing}
        continueDisabled={processing}
        continueBusy={processing}
      />
    </div>
  );
}

function StepConfirmation({
  confirmation,
  onDownloadReceipt,
  onNewPayment,
}: {
  confirmation: NonNullable<
    ReturnType<typeof useMakePaymentFlow>["confirmation"]
  >;
  onDownloadReceipt: () => void;
  onNewPayment: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 h-7 w-7 text-success"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
            Payment confirmed
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
            Mock confirmation generated. Keep the receipt for your records.
          </p>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <InfoTile
          label="Confirmation number"
          value={confirmation.confirmationNumber}
          emphasize
        />
        <InfoTile label="Date" value={confirmation.paidAt} />
        <InfoTile label="Amount" value={formatUsd(confirmation.amount)} />
        <InfoTile
          label="Payment method"
          value={confirmation.methodSummary}
        />
        <InfoTile
          label="Updated balance"
          value={formatUsd(confirmation.updatedBalance)}
        />
        <InfoTile label="Property" value={confirmation.propertyLabel} />
      </dl>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-neutral btn-sm gap-1"
          onClick={onDownloadReceipt}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download receipt
        </button>
        <Link href="/portal/payments" className="btn btn-outline btn-sm">
          Back to payments
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onNewPayment}
        >
          Start another payment
        </button>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--harbor-sand)]/40 px-3 py-3">
      <dt className="text-xs uppercase tracking-wide text-[var(--harbor-ink)]/50">
        {label}
      </dt>
      <dd
        className={`mt-1 text-[var(--harbor-ink)] ${
          emphasize ? "font-display text-2xl tracking-tight" : "text-sm font-medium"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
