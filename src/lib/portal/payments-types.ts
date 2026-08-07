import type { PaymentStatus } from "@/lib/portal/dashboard-types";

export type { PaymentStatus };

export type PaymentType =
  | "Rent"
  | "Late fee"
  | "Fee"
  | "Credit"
  | "Deposit"
  | "Other"
  | "Autopay";

export type LedgerLineKind = "charge" | "fee" | "credit";

export type PaymentLedgerLine = {
  id: string;
  label: string;
  amount: string;
  kind: LedgerLineKind;
  date: string;
};

export type SavedPaymentMethodSummary = {
  id: string;
  brand: string;
  /** Masked last four only — never full PAN or account number. */
  last4: string;
  /** Shared categories: ACH, Check, Debit card (legacy Card/Bank still accepted). */
  kind: "ACH" | "Check" | "Debit card" | "Card" | "Bank" | "Monthly";
  isDefault: boolean;
};

export type AutopayStatus = {
  enabled: boolean;
  nextRunDate: string | null;
  methodLabel: string | null;
};

export type PaymentTransaction = {
  id: string;
  label: string;
  amount: string;
  /** ISO date YYYY-MM-DD for filtering */
  date: string;
  displayDate: string;
  status: PaymentStatus;
  type: PaymentType;
  methodSummary: string;
  receiptAvailable: boolean;
};

export type PaymentsOverview = {
  currentBalance: string;
  amountDue: string;
  dueDate: string;
  paymentStatus: PaymentStatus;
  lateFee: string | null;
  autopay: AutopayStatus;
  savedMethod: SavedPaymentMethodSummary | null;
  /** Open charges, fees, and credits that make up the current balance. */
  ledger: PaymentLedgerLine[];
  transactions: PaymentTransaction[];
  /** Tenant-reported check awaiting A/R approval (not deposited yet). */
  pendingCheck?: {
    id: string;
    amount: string;
    delivery: "mailed" | "handed";
    submittedAt: string;
    status: "pending_ar" | "approved" | "declined";
  } | null;
};

export type PaymentsLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | {
      status: "success";
      data: PaymentsOverview;
      source: "live" | "mock";
    };

export type PaymentsDateRangeFilter =
  | "all"
  | "30d"
  | "90d"
  | "ytd"
  | "custom";

export type PaymentsFilters = {
  dateRange: PaymentsDateRangeFilter;
  customFrom: string;
  customTo: string;
  status: "all" | PaymentStatus;
  type: "all" | PaymentType;
};
