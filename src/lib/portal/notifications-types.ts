export const NOTIFICATION_TYPES = [
  "rent_due",
  "payment_received",
  "payment_failed",
  "maintenance_updated",
  "new_announcement",
  "new_message",
  "lease_renewal_deadline",
  "new_document",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CATEGORIES = [
  "Payments",
  "Maintenance",
  "Announcements",
  "Messages",
  "Lease",
  "Documents",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationFilter =
  | "all"
  | "unread"
  | NotificationCategory;

export const NOTIFICATION_FILTERS: Array<{
  id: NotificationFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "Payments", label: "Payments" },
  { id: "Maintenance", label: "Maintenance" },
  { id: "Announcements", label: "Announcements" },
  { id: "Messages", label: "Messages" },
  { id: "Lease", label: "Lease" },
  { id: "Documents", label: "Documents" },
];

export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { label: string; category: NotificationCategory }
> = {
  rent_due: { label: "Rent due", category: "Payments" },
  payment_received: { label: "Payment received", category: "Payments" },
  payment_failed: { label: "Payment failed", category: "Payments" },
  maintenance_updated: {
    label: "Maintenance updated",
    category: "Maintenance",
  },
  new_announcement: {
    label: "New announcement",
    category: "Announcements",
  },
  new_message: { label: "New message", category: "Messages" },
  lease_renewal_deadline: {
    label: "Lease renewal deadline",
    category: "Lease",
  },
  new_document: { label: "New document", category: "Documents" },
};

/**
 * In-portal notification only — no email/SMS/push delivery.
 * Follows the announcements read/unread session pattern.
 */
export type PortalNotification = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  /** ISO datetime */
  createdAt: string;
  /** Deep link within the tenant portal */
  href: string;
  hrefLabel: string;
};

export type PortalNotificationWithRead = PortalNotification & {
  read: boolean;
};

export type NotificationsLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | {
      status: "success";
      notifications: PortalNotification[];
      source: "live" | "mock";
    };
