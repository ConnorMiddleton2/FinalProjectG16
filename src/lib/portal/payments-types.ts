import type { PaymentStatus } from "@/lib/portal/dashboard-types";

export type PaymentType =
  | "Rent"
  | "Late fee"
  | "Deposit"
  | "Other"
  | "Autopay";

export type SavedPaymentMethodSummary = {
  id: string;
  brand: string;
  /** Masked last four only — never full PAN or account number. */
  last4: string;
  kind: "Card" | "Bank";
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
  transactions: PaymentTransaction[];
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
