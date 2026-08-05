import type { SavedPaymentMethodSummary } from "@/lib/portal/payments-types";

export type MakePaymentStep =
  | "review-balance"
  | "select-amount"
  | "select-method"
  | "review-payment"
  | "confirm-payment"
  | "confirmation";

export type AmountChoice = "full-balance" | "current-rent" | "custom";

export type MakePaymentContext = {
  propertyLabel: string;
  currentBalance: number;
  currentRent: number;
  lateFee: number;
  dueDate: string;
  currencySymbol: string;
  allowCustomAmount: boolean;
  /** Soft max for custom amounts (typically current balance). */
  maxPayable: number;
  methods: SavedPaymentMethodSummary[];
};

export type PaymentConfirmation = {
  confirmationNumber: string;
  paidAt: string;
  amount: number;
  methodSummary: string;
  updatedBalance: number;
  propertyLabel: string;
};

export type MakePaymentDraft = {
  amountChoice: AmountChoice | null;
  customAmountInput: string;
  resolvedAmount: number | null;
  methodId: string | null;
};

export type AmountValidationError =
  | "empty"
  | "invalid"
  | "negative"
  | "excessive"
  | "zero";

export type MethodValidationError = "missing-method";

export type ConfirmValidationError = "duplicate" | "processing";
