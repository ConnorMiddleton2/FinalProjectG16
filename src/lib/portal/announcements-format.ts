import type { AnnouncementPriority } from "@/lib/portal/announcements-types";

export function formatAnnouncementDate(isoDate: string | null | undefined) {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function announcementPriorityClass(priority: AnnouncementPriority) {
  switch (priority) {
    case "Urgent":
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

export function isAnnouncementExpired(
  expirationDate: string | null,
  todayIso = "2026-04-30"
) {
  if (!expirationDate) return false;
  return expirationDate < todayIso;
}
