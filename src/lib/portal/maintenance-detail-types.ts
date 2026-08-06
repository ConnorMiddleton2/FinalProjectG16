import type {
  MaintenanceAttachmentMeta,
  MaintenanceCategory,
  MaintenanceFormValues,
  MaintenancePriority,
  MaintenanceRequestStatus,
} from "@/lib/portal/maintenance-types";

export type MaintenanceUpdateKind =
  | "status"
  | "note"
  | "technician"
  | "schedule"
  | "tenant";

export type MaintenanceStatusUpdate = {
  id: string;
  kind: MaintenanceUpdateKind;
  message: string;
  createdAt: string;
  author: string;
};

export type MaintenanceRequestDetail = {
  id: string;
  requestNumber: string;
  status: MaintenanceRequestStatus;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  title: string;
  description: string;
  propertyOrUnit: string;
  locationInUnit: string;
  submittedOn: string;
  submittedAtLabel: string;
  scheduledOn: string | null;
  technicianName: string | null;
  lastUpdate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  preferredContactMethod: string;
  bestContactTime: string;
  permissionToEnter: string;
  petsInUnit: string;
  safetyConcerns: string;
  noticedOn: string;
  recurringIssue: string;
  preferredServiceDate: string;
  preferredServiceWindow: string;
  accessNotes: string;
  attachments: MaintenanceAttachmentMeta[];
  updates: MaintenanceStatusUpdate[];
  source: "mock" | "submitted";
};

export type MaintenanceDetailLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | { status: "success"; detail: MaintenanceRequestDetail };
