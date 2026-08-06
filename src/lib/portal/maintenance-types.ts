export type MaintenanceRequestStatus =
  | "Open"
  | "Scheduled"
  | "Completed"
  | "Cancelled";

export type MaintenancePriority = "Low" | "Normal" | "High" | "Emergency";

export type MaintenanceCategory =
  | "Plumbing"
  | "Electrical"
  | "Heating or Cooling"
  | "Appliance"
  | "Pest Control"
  | "Structural"
  | "Lock or Security"
  | "Common Area"
  | "Other";

export type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  title: string;
  /** ISO date YYYY-MM-DD */
  submittedOn: string;
  status: MaintenanceRequestStatus;
  /** ISO date when scheduled, if applicable */
  scheduledOn: string | null;
  technicianName: string | null;
  /** ISO datetime or date of last update */
  lastUpdate: string;
  location: string;
};

export type MaintenanceDateFilter = "all" | "30d" | "90d" | "ytd" | "custom";

export type MaintenanceFilters = {
  status: "all" | MaintenanceRequestStatus;
  priority: "all" | MaintenancePriority;
  category: "all" | MaintenanceCategory;
  dateFilter: MaintenanceDateFilter;
  customFrom: string;
  customTo: string;
};

export type MaintenanceLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | {
      status: "success";
      requests: MaintenanceRequest[];
      source: "live" | "mock";
    };

export const MAINTENANCE_STATUSES: MaintenanceRequestStatus[] = [
  "Open",
  "Scheduled",
  "Completed",
  "Cancelled",
];

export const MAINTENANCE_PRIORITIES: MaintenancePriority[] = [
  "Low",
  "Normal",
  "High",
  "Emergency",
];

export const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  "Plumbing",
  "Electrical",
  "Heating or Cooling",
  "Appliance",
  "Pest Control",
  "Structural",
  "Lock or Security",
  "Common Area",
  "Other",
];

export type PermissionToEnter = "yes" | "no" | "call-first";
export type ContactMethod = "email" | "phone" | "text" | "portal-message";
export type PetsInUnit = "yes" | "no";
export type RecurringIssue = "yes" | "no";
export type ServiceWindow =
  | "morning"
  | "afternoon"
  | "evening"
  | "anytime";

export type MaintenanceAttachmentMeta = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type MaintenanceFormValues = {
  propertyOrUnit: string;
  category: MaintenanceCategory | "";
  title: string;
  description: string;
  locationInUnit: string;
  priority: MaintenancePriority | "";
  permissionToEnter: PermissionToEnter | "";
  preferredContactMethod: ContactMethod | "";
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  bestContactTime: string;
  petsInUnit: PetsInUnit | "";
  safetyConcerns: string;
  noticedOn: string;
  recurringIssue: RecurringIssue | "";
  preferredServiceDate: string;
  preferredServiceWindow: ServiceWindow | "";
  accessNotes: string;
  attachments: MaintenanceAttachmentMeta[];
};

export type MaintenanceFormErrors = Partial<
  Record<keyof MaintenanceFormValues | "attachments" | "form", string>
>;

export type MaintenanceSubmissionResult = {
  id: string;
  requestNumber: string;
  submittedAt: string;
  values: MaintenanceFormValues;
};
