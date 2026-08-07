import type { MaintenanceRequestDetail } from "@/lib/portal/maintenance-detail-types";
import { toTenantFacingMaintenanceDetail } from "@/lib/portal/maintenance-detail-types";
import type { MaintenanceSubmissionResult } from "@/lib/portal/maintenance-types";
import { getMockMaintenanceRequests } from "@/lib/portal/maintenance-mock";
import { formatMaintenanceDate } from "@/lib/portal/maintenance-format";

const STORAGE_KEY = "cpmc.portal.maintenanceDetails.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readAll(): Record<string, MaintenanceRequestDetail> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MaintenanceRequestDetail>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, MaintenanceRequestDetail>) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getStoredMaintenanceDetail(
  id: string
): MaintenanceRequestDetail | null {
  return readAll()[id] ?? null;
}

export function upsertStoredMaintenanceDetail(
  detail: MaintenanceRequestDetail
) {
  const map = readAll();
  map[detail.id] = detail;
  writeAll(map);
}

export function createDetailFromSubmission(input: {
  id: string;
  result: MaintenanceSubmissionResult;
}): MaintenanceRequestDetail {
  const { values, requestNumber, submittedAt } = input.result;
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: input.id,
    requestNumber,
    status: "Open",
    category: values.category as MaintenanceRequestDetail["category"],
    priority: values.priority as MaintenanceRequestDetail["priority"],
    title: values.title.trim(),
    description: values.description.trim(),
    propertyOrUnit: values.propertyOrUnit,
    locationInUnit: values.locationInUnit.trim(),
    submittedOn: today,
    submittedAtLabel: submittedAt,
    scheduledOn: null,
    appointmentWindow: null,
    technicianName: null,
    technicianCompany: null,
    technicianPhone: null,
    lastUpdate: today,
    contactName: values.contactName.trim(),
    contactPhone: values.contactPhone.trim(),
    contactEmail: values.contactEmail.trim(),
    preferredContactMethod: values.preferredContactMethod,
    bestContactTime: values.bestContactTime.trim(),
    permissionToEnter: values.permissionToEnter,
    petsInUnit: values.petsInUnit,
    safetyConcerns: values.safetyConcerns.trim(),
    noticedOn: values.noticedOn,
    recurringIssue: values.recurringIssue,
    preferredServiceDate: values.preferredServiceDate,
    preferredServiceWindow: values.preferredServiceWindow,
    accessNotes: values.accessNotes.trim(),
    attachments: values.attachments,
    source: "submitted",
    updates: [
      {
        id: crypto.randomUUID(),
        kind: "status",
        message: "Request submitted by tenant and marked Open.",
        createdAt: submittedAt,
        author: values.contactName.trim() || "Tenant",
        visibility: "tenant",
      },
      {
        id: crypto.randomUUID(),
        kind: "note",
        message:
          "CPMC received your request. A coordinator will review and update this page.",
        createdAt: submittedAt,
        author: "CPMC",
        visibility: "tenant",
      },
      {
        id: crypto.randomUUID(),
        kind: "note",
        message:
          "INTERNAL: Assign to vendor queue and check SLA. Do not show this note to the tenant.",
        createdAt: submittedAt,
        author: "Ops desk",
        visibility: "internal",
      },
    ],
  };
}

function seedFromListItem(
  request: ReturnType<typeof getMockMaintenanceRequests>[number],
  extras: Partial<MaintenanceRequestDetail> & {
    description: string;
    locationInUnit: string;
    updates: MaintenanceRequestDetail["updates"];
  }
): MaintenanceRequestDetail {
  const { description, locationInUnit, updates, ...overrides } = extras;
  return {
    id: request.id,
    requestNumber: request.requestNumber,
    status: request.status,
    category: request.category,
    priority: request.priority,
    title: request.title,
    description,
    propertyOrUnit: request.location,
    locationInUnit,
    submittedOn: request.submittedOn,
    submittedAtLabel: `${formatMaintenanceDate(request.submittedOn)}, 10:00 AM`,
    scheduledOn: request.scheduledOn,
    appointmentWindow: request.scheduledOn ? "Morning (8 AM – 12 PM)" : null,
    technicianName: request.technicianName,
    technicianCompany: request.technicianName ? "CPMC Facilities" : null,
    technicianPhone: request.technicianName ? "(662) 555-0177" : null,
    lastUpdate: request.lastUpdate,
    contactName: "Alex Tenant",
    contactPhone: "(662) 555-0142",
    contactEmail: "alex.tenant@example.com",
    preferredContactMethod: "email",
    bestContactTime: "Weekdays after 3 PM",
    permissionToEnter: "yes",
    petsInUnit: "no",
    safetyConcerns: "",
    noticedOn: request.submittedOn,
    recurringIssue: "no",
    preferredServiceDate: request.scheduledOn ?? "",
    preferredServiceWindow: "anytime",
    accessNotes: "",
    attachments: [],
    source: "mock",
    updates,
    ...overrides,
  };
}

/** Seed details for dashboard mock IDs so View Details works before a new submit. */
export function getSeedMaintenanceDetail(
  id: string
): MaintenanceRequestDetail | null {
  const list = getMockMaintenanceRequests();
  const request = list.find((item) => item.id === id);
  if (!request) return null;

  const rich: Record<
    string,
    Partial<MaintenanceRequestDetail> & {
      description: string;
      locationInUnit: string;
      updates: MaintenanceRequestDetail["updates"];
    }
  > = {
    "maint-1": {
      description:
        "The suite heating and cooling system blows air but it is not cold. Started mid-afternoon and has not recovered overnight.",
      propertyOrUnit: "Pier 12 · Suite 210",
      locationInUnit: "Main open office area",
      submittedAtLabel: "Apr 22, 2026, 10:14 AM",
      preferredContactMethod: "email",
      preferredServiceDate: "2026-04-29",
      preferredServiceWindow: "afternoon",
      accessNotes: "South lobby is closest after 5 PM.",
      safetyConcerns: "Uneven flooring near the thermostat wall plate.",
      noticedOn: "2026-04-21",
      attachments: [
        {
          id: "att-hvac-1",
          name: "thermostat-reading.jpg",
          size: 245_760,
          type: "image/jpeg",
        },
      ],
      updates: [
        {
          id: "u1",
          kind: "status",
          message: "Request submitted and marked Open.",
          createdAt: "Apr 22, 2026, 10:14 AM",
          author: "Alex Tenant",
          visibility: "tenant",
        },
        {
          id: "u2",
          kind: "note",
          message: "Coordinator reviewing heating and cooling work order priority.",
          createdAt: "Apr 23, 2026, 9:02 AM",
          author: "CPMC",
          visibility: "tenant",
        },
        {
          id: "u-internal-1",
          kind: "note",
          message:
            "INTERNAL: Vendor overtime approval pending — do not disclose cost estimate to tenant.",
          createdAt: "Apr 23, 2026, 9:05 AM",
          author: "Ops desk",
          visibility: "internal",
        },
        {
          id: "u3",
          kind: "note",
          message: "Waiting on vendor availability for diagnostic visit.",
          createdAt: "Apr 28, 2026, 4:20 PM",
          author: "CPMC",
          visibility: "tenant",
        },
      ],
    },
    "maint-2": {
      description:
        "Badge reader at the main lobby sometimes fails on first tap and requires a second try.",
      propertyOrUnit: "Pier 12 · Suite 210",
      locationInUnit: "Main lobby entrance",
      submittedAtLabel: "Apr 20, 2026, 2:41 PM",
      preferredContactMethod: "phone",
      bestContactTime: "Mornings",
      recurringIssue: "yes",
      preferredServiceDate: "2026-05-02",
      preferredServiceWindow: "morning",
      appointmentWindow: "Morning (8 AM – 12 PM)",
      technicianName: "Jordan Lee",
      technicianCompany: "CPMC Facilities",
      technicianPhone: "(662) 555-0177",
      noticedOn: "2026-04-19",
      attachments: [
        {
          id: "att-badge-1",
          name: "lobby-reader.pdf",
          size: 102_400,
          type: "application/pdf",
        },
      ],
      updates: [
        {
          id: "u1",
          kind: "status",
          message: "Request submitted.",
          createdAt: "Apr 20, 2026, 2:41 PM",
          author: "Alex Tenant",
          visibility: "tenant",
        },
        {
          id: "u2",
          kind: "technician",
          message: "Assigned to Jordan Lee (CPMC Facilities).",
          createdAt: "Apr 24, 2026, 11:10 AM",
          author: "CPMC",
          visibility: "tenant",
        },
        {
          id: "u-internal-2",
          kind: "note",
          message:
            "INTERNAL: Badge vendor SLA ticket #4412 — employee-only tracking.",
          createdAt: "Apr 24, 2026, 11:12 AM",
          author: "Ops desk",
          visibility: "internal",
        },
        {
          id: "u3",
          kind: "schedule",
          message: "Visit scheduled for May 2, 2026 · Morning (8 AM – 12 PM).",
          createdAt: "Apr 26, 2026, 3:05 PM",
          author: "CPMC",
          visibility: "tenant",
        },
      ],
    },
  };

  if (rich[id]) {
    return seedFromListItem(request, rich[id]);
  }

  const statusMessage =
    request.status === "Cancelled"
      ? "Request cancelled."
      : request.status === "Completed"
        ? "Work completed and request closed."
        : request.status === "Scheduled"
          ? `Visit scheduled${request.scheduledOn ? ` for ${formatMaintenanceDate(request.scheduledOn)}` : ""}.`
          : "Request submitted and marked Open.";

  return seedFromListItem(request, {
    description: `${request.title}. Additional notes were provided when this request was filed.`,
    locationInUnit: request.location,
    updates: [
      {
        id: `${id}-u1`,
        kind: "status",
        message: "Request submitted.",
        createdAt: `${formatMaintenanceDate(request.submittedOn)}, 10:00 AM`,
        author: "Alex Tenant",
        visibility: "tenant",
      },
      ...(request.technicianName
        ? [
            {
              id: `${id}-u2`,
              kind: "technician" as const,
              message: `Assigned to ${request.technicianName}.`,
              createdAt: `${formatMaintenanceDate(request.lastUpdate)}, 11:00 AM`,
              author: "CPMC",
              visibility: "tenant" as const,
            },
          ]
        : []),
      {
        id: `${id}-u3`,
        kind: "status",
        message: statusMessage,
        createdAt: `${formatMaintenanceDate(request.lastUpdate)}, 3:00 PM`,
        author: "CPMC",
        visibility: "tenant",
      },
    ],
  });
}

export function resolveMaintenanceDetail(
  id: string
): MaintenanceRequestDetail | null {
  const raw = getStoredMaintenanceDetail(id) ?? getSeedMaintenanceDetail(id);
  return raw ? toTenantFacingMaintenanceDetail(raw) : null;
}

export function appendTenantUpdate(
  detail: MaintenanceRequestDetail,
  message: string
): MaintenanceRequestDetail {
  const createdAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const today = new Date().toISOString().slice(0, 10);
  const next: MaintenanceRequestDetail = {
    ...detail,
    lastUpdate: today,
    updates: [
      {
        id: crypto.randomUUID(),
        kind: "tenant",
        message: message.trim(),
        createdAt,
        author: detail.contactName || "Tenant",
        visibility: "tenant",
      },
      ...detail.updates,
    ],
  };
  upsertStoredMaintenanceDetail(next);
  return toTenantFacingMaintenanceDetail(next);
}

export function cancelMaintenanceRequest(
  detail: MaintenanceRequestDetail
): MaintenanceRequestDetail {
  const createdAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const today = new Date().toISOString().slice(0, 10);
  const next: MaintenanceRequestDetail = {
    ...detail,
    status: "Cancelled",
    lastUpdate: today,
    updates: [
      {
        id: crypto.randomUUID(),
        kind: "status",
        message: "Tenant cancelled this maintenance request.",
        createdAt,
        author: detail.contactName || "Tenant",
        visibility: "tenant",
      },
      ...detail.updates,
    ],
  };
  upsertStoredMaintenanceDetail(next);
  return toTenantFacingMaintenanceDetail(next);
}
