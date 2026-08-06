import type { LeaseStatus } from "@/lib/portal/lease-types";

export function formatLeaseDate(isoDate: string | null | undefined) {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function leaseStatusClass(status: LeaseStatus) {
  switch (status) {
    case "Active":
      return "badge-success";
    case "Expiring soon":
      return "badge-warning";
    case "Pending renewal":
      return "badge-info";
    case "Expired":
    case "Ended":
      return "badge-ghost";
    default:
      return "badge-ghost";
  }
}
