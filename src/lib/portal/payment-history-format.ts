import type { HistoryPaymentStatus } from "@/lib/portal/payment-history-types";

/** Consistent currency formatting for portal payment history. */
export function formatHistoryCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/** Consistent medium date formatting for portal payment history. */
export function formatHistoryDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function historyStatusClass(status: HistoryPaymentStatus) {
  switch (status) {
    case "Paid":
      return "badge-success";
    case "Pending":
      return "badge-info";
    case "Failed":
      return "badge-error";
    case "Reversed":
      return "badge-ghost";
    case "Refunded":
      return "badge-secondary";
    case "Late":
      return "badge-warning";
    default:
      return "badge-ghost";
  }
}

export function buildHistoryReceiptText(input: {
  confirmationNumber: string;
  date: string;
  description: string;
  amount: number;
  methodSummary: string;
  status: HistoryPaymentStatus;
  propertyLabel: string;
}) {
  return [
    "Harborline Property Management",
    "Payment receipt (demo — not a bank record)",
    "----------------------------------------",
    `Confirmation: ${input.confirmationNumber}`,
    `Date: ${formatHistoryDate(input.date)}`,
    `Description: ${input.description}`,
    `Property: ${input.propertyLabel}`,
    `Amount: ${formatHistoryCurrency(input.amount)}`,
    `Method: ${input.methodSummary}`,
    `Status: ${input.status}`,
    "",
    "Complete card or bank-account details are never stored or printed.",
  ].join("\n");
}
