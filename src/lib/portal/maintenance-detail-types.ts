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

export type MaintenanceUpdateVisibility = "tenant" | "internal";

export type MaintenanceStatusUpdate = {
  id: string;
  kind: MaintenanceUpdateKind;
  message: string;
  createdAt: string;
  author: string;
  /**
   * Tenant portal must only render `tenant` updates.
   * Internal employee notes stay out of API responses to tenants.
   */
  visibility?: MaintenanceUpdateVisibility;
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
  /** Human-readable appointment window when scheduled (tenant-facing). */
  appointmentWindow: string | null;
  technicianName: string | null;
  technicianCompany: string | null;
  technicianPhone: string | null;
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

/** Strip internal employee notes before any tenant-facing response. */
export function toTenantFacingMaintenanceDetail(
  detail: MaintenanceRequestDetail
): MaintenanceRequestDetail {
  return {
    ...detail,
    updates: detail.updates.filter(
      (entry) => (entry.visibility ?? "tenant") === "tenant"
    ),
  };
}
