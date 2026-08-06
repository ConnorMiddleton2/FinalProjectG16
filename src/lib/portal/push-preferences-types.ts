/**
 * Current-tenant push / mobile notification preferences.
 * BACKEND_TODO: POST /api/tenant/notifications/push-preferences
 * BACKEND_TODO: register device tokens / Web Push subscriptions
 */

export type PushCategoryKey =
  | "rent"
  | "payments"
  | "maintenance"
  | "messages"
  | "announcements"
  | "lease"
  | "documents";

export type PushPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export type PushCategoryPreference = {
  key: PushCategoryKey;
  label: string;
  description: string;
  enabled: boolean;
};

export type PushNotificationPreferences = {
  masterEnabled: boolean;
  permission: PushPermissionState;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  categories: PushCategoryPreference[];
  lastUpdatedAt: string | null;
  lastTestSentAt: string | null;
};

export type UpdatePushPreferencesInput = {
  masterEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  categories: Array<{ key: PushCategoryKey; enabled: boolean }>;
};

export const DEFAULT_PUSH_CATEGORIES: PushCategoryPreference[] = [
  {
    key: "rent",
    label: "Rent reminders",
    description: "Upcoming rent due dates and late notices.",
    enabled: true,
  },
  {
    key: "payments",
    label: "Payment activity",
    description: "Payment received, failed, and receipt alerts.",
    enabled: true,
  },
  {
    key: "maintenance",
    label: "Maintenance updates",
    description: "Status changes and appointment windows.",
    enabled: true,
  },
  {
    key: "messages",
    label: "Messages",
    description: "New replies from Harborline management.",
    enabled: true,
  },
  {
    key: "announcements",
    label: "Announcements",
    description: "Building and property notices.",
    enabled: false,
  },
  {
    key: "lease",
    label: "Lease & renewal",
    description: "Renewal deadlines and lease updates.",
    enabled: true,
  },
  {
    key: "documents",
    label: "Documents",
    description: "New statements and files ready to download.",
    enabled: false,
  },
];
