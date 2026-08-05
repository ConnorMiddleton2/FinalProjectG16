export const ANNOUNCEMENT_CATEGORIES = [
  "Property updates",
  "Service interruptions",
  "Office closures",
  "Community events",
  "Safety notices",
  "Policy reminders",
  "Payment reminders",
  "Package notices",
  "Parking notices",
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export type AnnouncementPriority = "Low" | "Normal" | "High" | "Urgent";

export type AnnouncementFilter =
  | "all"
  | "unread"
  | "important"
  | "community"
  | "maintenance"
  | "policy";

export const ANNOUNCEMENT_FILTERS: Array<{
  id: AnnouncementFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "important", label: "Important" },
  { id: "community", label: "Community" },
  { id: "maintenance", label: "Maintenance" },
  { id: "policy", label: "Policy" },
];

export type AnnouncementAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeLabel: string;
};

export type TenantAnnouncement = {
  id: string;
  title: string;
  category: AnnouncementCategory;
  /** ISO date YYYY-MM-DD */
  publishDate: string;
  /** ISO date YYYY-MM-DD when the notice expires; null if none */
  expirationDate: string | null;
  priority: AnnouncementPriority;
  message: string;
  attachment: AnnouncementAttachment | null;
};

export type AnnouncementsLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | {
      status: "success";
      announcements: TenantAnnouncement[];
      source: "live" | "mock";
    };

/** Categories grouped under each non-status filter chip. */
export const ANNOUNCEMENT_FILTER_CATEGORIES: Record<
  "community" | "maintenance" | "policy",
  AnnouncementCategory[]
> = {
  community: ["Community events", "Property updates", "Package notices"],
  maintenance: [
    "Service interruptions",
    "Office closures",
    "Parking notices",
  ],
  policy: ["Policy reminders", "Safety notices", "Payment reminders"],
};
