/**
 * Future Tenant Portal in-app notification center.
 *
 * Mirrors messaging read/unread conventions (readAt + mark helpers).
 * Delivery is portal-only — do not add email, SMS, or push here unless
 * those services already exist in the project.
 */

export const PORTAL_NOTIFICATIONS_STORAGE_KEY =
  "harborline_portal_notifications";

export type PortalNotificationType =
  | "tour-confirmed"
  | "tour-changed"
  | "application-submitted"
  | "document-requested"
  | "application-status-updated"
  | "new-message"
  | "lease-offer-available"
  | "offer-deadline-approaching"
  | "move-in-task-due";

export type PortalNotificationCategory =
  | "tours"
  | "application"
  | "messages"
  | "lease-offers"
  | "move-in";

export type PortalNotification = {
  id: string;
  type: PortalNotificationType;
  category: PortalNotificationCategory;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  /** Empty string means unread — same idea as messaging lastReadAt comparison. */
  readAt: string;
};

export type PortalNotificationTypeMeta = {
  id: PortalNotificationType;
  label: string;
  category: PortalNotificationCategory;
  defaultHref: string;
};

export type PortalNotificationCategoryMeta = {
  id: PortalNotificationCategory;
  label: string;
};

export const NOTIFICATION_CATEGORIES: PortalNotificationCategoryMeta[] = [
  { id: "tours", label: "Tours" },
  { id: "application", label: "Application" },
  { id: "messages", label: "Messages" },
  { id: "lease-offers", label: "Lease offers" },
  { id: "move-in", label: "Move-in" },
];

export const NOTIFICATION_TYPES: PortalNotificationTypeMeta[] = [
  {
    id: "tour-confirmed",
    label: "Tour Confirmed",
    category: "tours",
    defaultHref: "/portal/tours",
  },
  {
    id: "tour-changed",
    label: "Tour Changed",
    category: "tours",
    defaultHref: "/portal/tours",
  },
  {
    id: "application-submitted",
    label: "Application Submitted",
    category: "application",
    defaultHref: "/portal/applications",
  },
  {
    id: "document-requested",
    label: "Document Requested",
    category: "application",
    defaultHref: "/portal/applications/demo-application-pier12/documents",
  },
  {
    id: "application-status-updated",
    label: "Application Status Updated",
    category: "application",
    defaultHref: "/portal/applications",
  },
  {
    id: "new-message",
    label: "New Message",
    category: "messages",
    defaultHref: "/portal/messages",
  },
  {
    id: "lease-offer-available",
    label: "Lease Offer Available",
    category: "lease-offers",
    defaultHref: "/portal/offers/offer-pier12-a205",
  },
  {
    id: "offer-deadline-approaching",
    label: "Offer Deadline Approaching",
    category: "lease-offers",
    defaultHref: "/portal/offers/offer-pier12-a205",
  },
  {
    id: "move-in-task-due",
    label: "Move-In Task Due",
    category: "move-in",
    defaultHref: "/portal/move-in",
  },
];

export function getNotificationTypeMeta(
  type: PortalNotificationType
): PortalNotificationTypeMeta {
  const found = NOTIFICATION_TYPES.find((item) => item.id === type);
  if (!found) throw new Error(`Unknown notification type: ${type}`);
  return found;
}

export function getNotificationCategoryMeta(
  category: PortalNotificationCategory
): PortalNotificationCategoryMeta {
  const found = NOTIFICATION_CATEGORIES.find((item) => item.id === category);
  if (!found) throw new Error(`Unknown notification category: ${category}`);
  return found;
}

export function createNotificationId(prefix = "ntf") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function isNotificationUnread(notification: PortalNotification): boolean {
  return !notification.readAt;
}

export function unreadNotificationCount(
  notifications: PortalNotification[]
): number {
  return notifications.filter(isNotificationUnread).length;
}

export function sortNotifications(
  notifications: PortalNotification[]
): PortalNotification[] {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function formatNotificationTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function seedPortalNotifications(): PortalNotification[] {
  const now = Date.now();
  const ago = (minutes: number) =>
    new Date(now - minutes * 60 * 1000).toISOString();

  return [
    {
      id: "ntf-tour-confirmed",
      type: "tour-confirmed",
      category: "tours",
      title: "Tour Confirmed",
      body: "Your tour of Pier 12 · A205 is confirmed. Arrive a few minutes early and bring a photo ID.",
      href: "/portal/tours",
      createdAt: ago(60 * 36),
      readAt: ago(60 * 30),
    },
    {
      id: "ntf-tour-changed",
      type: "tour-changed",
      category: "tours",
      title: "Tour Changed",
      body: "Leasing updated your tour time. Review the new schedule in Tour Scheduling.",
      href: "/portal/tours",
      createdAt: ago(60 * 20),
      readAt: "",
    },
    {
      id: "ntf-application-submitted",
      type: "application-submitted",
      category: "application",
      title: "Application Submitted",
      body: "Harborline received your application for Pier 12 · A205. Track progress on Application Status.",
      href: "/portal/applications",
      createdAt: ago(60 * 48),
      readAt: ago(60 * 47),
    },
    {
      id: "ntf-document-requested",
      type: "document-requested",
      category: "application",
      title: "Document Requested",
      body: "Leasing needs an updated pay stub. Upload it from your application documents.",
      href: "/portal/applications/demo-application-pier12/documents",
      createdAt: ago(180),
      readAt: "",
    },
    {
      id: "ntf-status-updated",
      type: "application-status-updated",
      category: "application",
      title: "Application Status Updated",
      body: "Your application moved to Under Review. Open Application Status for the next step.",
      href: "/portal/applications",
      createdAt: ago(95),
      readAt: "",
    },
    {
      id: "ntf-new-message",
      type: "new-message",
      category: "messages",
      title: "New Message",
      body: "Harborline leasing replied in your missing-documents thread.",
      href: "/portal/messages",
      createdAt: ago(12),
      readAt: "",
    },
    {
      id: "ntf-lease-offer",
      type: "lease-offer-available",
      category: "lease-offers",
      title: "Lease Offer Available",
      body: "A lease offer for Pier 12 · A205 is ready to review. Terms and documents are in Lease Offers.",
      href: "/portal/offers/offer-pier12-a205",
      createdAt: ago(360),
      readAt: ago(300),
    },
    {
      id: "ntf-offer-deadline",
      type: "offer-deadline-approaching",
      category: "lease-offers",
      title: "Offer Deadline Approaching",
      body: "Your Pier 12 · A205 offer expires soon. Accept or decline before the deadline.",
      href: "/portal/offers/offer-pier12-a205",
      createdAt: ago(45),
      readAt: "",
    },
    {
      id: "ntf-move-in-task",
      type: "move-in-task-due",
      category: "move-in",
      title: "Move-In Task Due",
      body: "Provide renter’s insurance before key pickup. Complete the step on your move-in checklist.",
      href: "/portal/move-in",
      createdAt: ago(25),
      readAt: "",
    },
  ];
}

export function readPortalNotifications(): PortalNotification[] {
  if (typeof window === "undefined") {
    return sortNotifications(seedPortalNotifications());
  }
  const raw = window.localStorage.getItem(PORTAL_NOTIFICATIONS_STORAGE_KEY);
  if (!raw) {
    const seeded = sortNotifications(seedPortalNotifications());
    writePortalNotifications(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as PortalNotification[];
    if (!Array.isArray(parsed)) {
      const seeded = sortNotifications(seedPortalNotifications());
      writePortalNotifications(seeded);
      return seeded;
    }
    return sortNotifications(
      parsed.filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.type === "string" &&
          typeof item.title === "string"
      )
    );
  } catch {
    const seeded = sortNotifications(seedPortalNotifications());
    writePortalNotifications(seeded);
    return seeded;
  }
}

export function writePortalNotifications(notifications: PortalNotification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PORTAL_NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify(sortNotifications(notifications))
  );
}

export function markNotificationRead(
  notification: PortalNotification,
  readAt = new Date().toISOString()
): PortalNotification {
  if (notification.readAt) return notification;
  return { ...notification, readAt };
}

export function markAllNotificationsRead(
  notifications: PortalNotification[],
  readAt = new Date().toISOString()
): PortalNotification[] {
  return notifications.map((notification) =>
    markNotificationRead(notification, readAt)
  );
}

export function filterNotificationsByCategory(
  notifications: PortalNotification[],
  category: PortalNotificationCategory | "all"
): PortalNotification[] {
  if (category === "all") return notifications;
  return notifications.filter((item) => item.category === category);
}
