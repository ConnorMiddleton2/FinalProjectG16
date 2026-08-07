import { toTenantFacingMaintenanceDetail } from "@/lib/portal/maintenance-detail-types";
import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceRequestDetail,
  MaintenanceRequestStatus,
  MaintenanceSubmissionResult,
} from "@/lib/portal/models";
import {
  denyCrossTenant,
} from "@/lib/portal/tenant-scope";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";
import {
  categoryLabel,
  type WorkOrder,
  type WorkOrderCategory,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/lib/maintenance";
import {
  portalListMyWorkOrders,
  portalSubmitWorkOrder,
} from "@/app/portal/maintenance-actions";

/**
 * Maintenance — tenant portal reads/writes the shared work_orders ledger.
 */

function mapCategory(cat: WorkOrderCategory | string): MaintenanceCategory {
  switch (cat) {
    case "plumbing":
      return "Plumbing";
    case "electrical":
      return "Electrical";
    case "hvac":
      return "Heating or Cooling";
    case "appliance":
      return "Appliance";
    case "structural":
      return "Structural";
    case "security":
      return "Lock or Security";
    case "janitorial":
    case "landscaping":
      return "Common Area";
    case "other":
      return "Other";
    default:
      return "Other";
  }
}

function mapPriority(p: WorkOrderPriority | string): MaintenancePriority {
  switch (p) {
    case "low":
      return "Low";
    case "high":
      return "High";
    case "emergency":
      return "Emergency";
    default:
      return "Normal";
  }
}

function mapStatus(s: WorkOrderStatus | string): MaintenanceRequestStatus {
  switch (s) {
    case "in_progress":
      return "Scheduled";
    case "completed":
      return "Completed";
    default:
      return "Open";
  }
}

function workOrderToRequest(wo: WorkOrder): MaintenanceRequest {
  return {
    id: wo.id,
    requestNumber: `WO-${(wo.createdAt || "").replace(/-/g, "")}-${wo.id.slice(0, 4).toUpperCase()}`,
    category: mapCategory(wo.category),
    priority: mapPriority(wo.priority),
    title: wo.title,
    submittedOn: wo.createdAt,
    status: mapStatus(wo.status),
    scheduledOn: wo.status === "in_progress" ? wo.dueDate || null : null,
    technicianName: wo.vendorName || null,
    lastUpdate: wo.completedAt || wo.dueDate || wo.createdAt,
    location: [wo.property, wo.unit].filter(Boolean).join(" · "),
  };
}

export async function listMaintenanceRequests(): Promise<
  ServiceResult<MaintenanceRequest[]>
> {
  const forced = assertNotForcedError("listMaintenanceRequests");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    const orders = await portalListMyWorkOrders();
    if (orders.length > 0) {
      return ok(orders.map(workOrderToRequest), "live");
    }
    return ok([], "live");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load maintenance requests.",
      "network"
    );
  }
}

export async function getMaintenanceRequest(
  id: string
): Promise<ServiceResult<MaintenanceRequestDetail | null>> {
  const forced = assertNotForcedError("getMaintenanceRequest");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(350);
    const orders = await portalListMyWorkOrders();
    const wo = orders.find((o) => o.id === id);
    if (wo) {
      const req = workOrderToRequest(wo);
      const detail: MaintenanceRequestDetail = {
        id: req.id,
        requestNumber: req.requestNumber,
        status: req.status,
        category: req.category,
        priority: req.priority,
        title: req.title,
        description: wo.description,
        propertyOrUnit: req.location,
        locationInUnit: wo.unit,
        submittedOn: wo.createdAt,
        submittedAtLabel: wo.createdAt,
        scheduledOn: req.scheduledOn,
        appointmentWindow: null,
        technicianName: wo.vendorName || null,
        technicianCompany: null,
        technicianPhone: null,
        lastUpdate: req.lastUpdate,
        contactName: auth.data.displayName,
        contactPhone: "",
        contactEmail: auth.data.email,
        preferredContactMethod: "portal-message",
        bestContactTime: "",
        permissionToEnter: "",
        petsInUnit: "",
        safetyConcerns: "",
        noticedOn: wo.createdAt,
        recurringIssue: "",
        preferredServiceDate: wo.dueDate || "",
        preferredServiceWindow: "",
        accessNotes: "",
        attachments: [],
        updates: [
          {
            id: `upd-${wo.id}`,
            kind: "tenant",
            message: `Submitted to Maintenance ledger (${categoryLabel(wo.category)}, ${wo.priority} priority).`,
            createdAt: wo.createdAt,
            author: "You",
            visibility: "tenant",
          },
        ],
        source: "submitted",
      };
      return ok(toTenantFacingMaintenanceDetail(detail), "live");
    }

    return ok(null, "live");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load this maintenance request.",
      "network"
    );
  }
}

export async function createMaintenanceRequest(input: {
  title: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  description: string;
}): Promise<ServiceResult<MaintenanceSubmissionResult>> {
  const forced = assertNotForcedError("createMaintenanceRequest");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    const res = await portalSubmitWorkOrder(input);
    if ("error" in res && res.error) {
      return fail(res.error, "validation");
    }
    if (!("ok" in res) || !res.ok) {
      return fail("Could not submit your maintenance request.", "validation");
    }
    const result: MaintenanceSubmissionResult = {
      id: res.id,
      requestNumber: res.requestNumber,
      submittedAt: res.submittedAt,
      values: {
        propertyOrUnit: [res.order.property, res.order.unit]
          .filter(Boolean)
          .join(" · "),
        category: mapCategory(res.order.category),
        title: res.order.title,
        description: res.order.description,
        locationInUnit: res.order.unit,
        priority: mapPriority(res.order.priority),
        permissionToEnter: "",
        preferredContactMethod: "",
        contactName: auth.data.displayName,
        contactPhone: "",
        contactEmail: auth.data.email,
        bestContactTime: "",
        petsInUnit: "",
        safetyConcerns: "",
        noticedOn: res.order.createdAt,
        recurringIssue: "",
        preferredServiceDate: "",
        preferredServiceWindow: "",
        accessNotes: "",
        attachments: [],
      },
    };
    return ok(result, "live");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not submit your maintenance request.",
      "network"
    );
  }
}

export async function addMaintenanceUpdate(
  id: string,
  message: string
): Promise<ServiceResult<MaintenanceRequestDetail>> {
  const forced = assertNotForcedError("addMaintenanceUpdate");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  return denyCrossTenant();
}

export async function cancelMaintenanceRequest(
  id: string
): Promise<ServiceResult<MaintenanceRequestDetail>> {
  const forced = assertNotForcedError("cancelMaintenanceRequest");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  return denyCrossTenant();
}

export function getMaintenanceRequestsDemoFixture(): MaintenanceRequest[] {
  return [];
}
