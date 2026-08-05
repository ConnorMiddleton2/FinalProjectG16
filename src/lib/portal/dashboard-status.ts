import type {
  MaintenanceStatus,
  PaymentStatus,
} from "@/lib/portal/dashboard-types";

export function paymentStatusClass(status: PaymentStatus) {
  switch (status) {
    case "Paid":
      return "badge-success";
    case "Due":
      return "badge-warning";
    case "Overdue":
      return "badge-error";
    case "Processing":
      return "badge-info";
    default:
      return "badge-ghost";
  }
}

export function maintenanceStatusClass(status: MaintenanceStatus) {
  switch (status) {
    case "Completed":
      return "badge-success";
    case "In progress":
      return "badge-info";
    case "Scheduled":
      return "badge-warning";
    case "Submitted":
      return "badge-ghost";
    default:
      return "badge-ghost";
  }
}
