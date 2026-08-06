import type { RenewalStatus } from "@/lib/portal/renewal-types";

export function formatRenewalDate(isoDate: string | null | undefined) {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatRenewalDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function renewalStatusClass(status: RenewalStatus) {
  switch (status) {
    case "Not Started":
      return "badge-ghost";
    case "Submitted":
      return "badge-info";
    case "Under Review":
      return "badge-warning";
    case "Offer Available":
      return "badge-primary";
    case "Accepted":
      return "badge-success";
    case "Declined":
      return "badge-error";
    case "Expired":
      return "badge-ghost";
    default:
      return "badge-ghost";
  }
}

export function isRenewalInProgress(status: RenewalStatus) {
  return (
    status === "Submitted" ||
    status === "Under Review" ||
    status === "Offer Available"
  );
}

export function canStartNewRenewalRequest(status: RenewalStatus | null) {
  if (!status || status === "Not Started") return true;
  return status === "Declined" || status === "Expired";
}
