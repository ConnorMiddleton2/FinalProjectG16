export type HistoryPaymentStatus =
  | "Paid"
  | "Pending"
  | "Failed"
  | "Reversed"
  | "Refunded"
  | "Late";

export type PaymentHistoryRecord = {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  description: string;
  amount: number;
  /** Masked method only, e.g. Visa •••• 4242 */
  methodSummary: string;
  status: HistoryPaymentStatus;
  confirmationNumber: string;
  receiptAvailable: boolean;
  propertyLabel: string;
};

export type PaymentHistorySortKey = "date" | "amount" | "status" | "description";
export type SortDirection = "asc" | "desc";

export type PaymentHistoryDateFilter =
  | "all"
  | "30d"
  | "90d"
  | "ytd"
  | "custom";

export type PaymentHistoryFilters = {
  search: string;
  status: "all" | HistoryPaymentStatus;
  dateFilter: PaymentHistoryDateFilter;
  customFrom: string;
  customTo: string;
  sortKey: PaymentHistorySortKey;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
};

export type PaymentHistoryLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | {
      status: "success";
      records: PaymentHistoryRecord[];
      source: "live" | "mock";
    };

export const HISTORY_STATUS_OPTIONS: HistoryPaymentStatus[] = [
  "Paid",
  "Pending",
  "Failed",
  "Reversed",
  "Refunded",
  "Late",
];
