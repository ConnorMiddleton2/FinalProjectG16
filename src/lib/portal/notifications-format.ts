import type { NotificationType } from "@/lib/portal/notifications-types";
import { NOTIFICATION_TYPE_META } from "@/lib/portal/notifications-types";

export function formatNotificationTimestamp(iso: string) {
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

export function notificationTypeLabel(type: NotificationType) {
  return NOTIFICATION_TYPE_META[type].label;
}
