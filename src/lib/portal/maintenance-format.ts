import type {
  MaintenancePriority,
  MaintenanceRequestStatus,
} from "@/lib/portal/maintenance-types";

export function formatMaintenanceDate(isoDate: string | null) {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function maintenanceRequestStatusClass(status: MaintenanceRequestStatus) {
  switch (status) {
    case "Open":
      return "badge-info";
    case "Scheduled":
      return "badge-warning";
    case "Completed":
      return "badge-success";
    case "Cancelled":
      return "badge-ghost";
    default:
      return "badge-ghost";
  }
}

export function maintenancePriorityClass(priority: MaintenancePriority) {
  switch (priority) {
    case "Emergency":
      return "badge-error";
    case "High":
      return "badge-warning";
    case "Normal":
      return "badge-info";
    case "Low":
      return "badge-ghost";
    default:
      return "badge-ghost";
  }
}
