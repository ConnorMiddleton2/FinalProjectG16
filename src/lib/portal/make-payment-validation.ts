import type {
  AmountChoice,
  AmountValidationError,
  MakePaymentContext,
  MakePaymentDraft,
  MethodValidationError,
} from "@/lib/portal/make-payment-types";

export function resolveAmountForChoice(
  choice: AmountChoice,
  customInput: string,
  context: MakePaymentContext
): number | null {
  if (choice === "full-balance") return context.currentBalance;
  if (choice === "current-rent") return context.currentRent;
  return parseAmountInput(customInput);
}

export function parseAmountInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/[$,\s]/g, "");
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function validateAmountSelection(
  draft: MakePaymentDraft,
  context: MakePaymentContext
): AmountValidationError | null {
  if (!draft.amountChoice) {
    return "empty";
  }

  if (draft.amountChoice === "custom") {
    if (!context.allowCustomAmount) {
      return "invalid";
    }
    const trimmed = draft.customAmountInput.trim();
    if (!trimmed) return "empty";
    const normalized = trimmed.replace(/[$,\s]/g, "");
    if (normalized.startsWith("-")) return "negative";
    const parsed = parseAmountInput(trimmed);
    if (parsed === null) return "invalid";
    if (parsed < 0) return "negative";
    if (parsed === 0) return "zero";
    if (parsed > context.maxPayable) return "excessive";
    return null;
  }

  const resolved = resolveAmountForChoice(
    draft.amountChoice,
    draft.customAmountInput,
    context
  );
  if (resolved === null) return "invalid";
  if (resolved < 0) return "negative";
  if (resolved === 0) return "zero";
  if (resolved > context.maxPayable) return "excessive";
  return null;
}

export function amountErrorMessage(error: AmountValidationError): string {
  switch (error) {
    case "empty":
      return "Enter or select a payment amount.";
    case "invalid":
      return "Enter a valid dollar amount (for example 100.00).";
    case "negative":
      return "Payment amount cannot be negative.";
    case "zero":
      return "Payment amount must be greater than zero.";
    case "excessive":
      return "Amount exceeds the payable balance for this lease.";
    default:
      return "Check the payment amount.";
  }
}

export function validateMethodSelection(
  methodId: string | null
): MethodValidationError | null {
  if (!methodId) return "missing-method";
  return null;
}

export function methodErrorMessage(error: MethodValidationError): string {
  switch (error) {
    case "missing-method":
      return "Select a payment method to continue.";
    default:
      return "Select a payment method.";
  }
}
