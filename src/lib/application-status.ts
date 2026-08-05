/**
 * Applicant-facing application status records.
 *
 * Keep this model limited to information applicants are allowed to see.
 * Never add screening scores, decision criteria, reviewer notes, or internal flags.
 */

import type {
  RentalApplicationDraft,
  SubmittedApplication,
} from "@/lib/rental-application";

export const APPLICATION_STATUS_RECORDS_KEY =
  "harborline_application_status_records";

export type ApplicationPublicStatus =
  | "Draft"
  | "Submitted"
  | "Payment Pending"
  | "Documents Required"
  | "Under Review"
  | "Screening in Progress"
  | "Additional Information Requested"
  | "Approved"
  | "Conditionally Approved"
  | "Waitlisted"
  | "Denied"
  | "Withdrawn"
  | "Lease Offer Available"
  | "Lease Accepted";

export type ApplicationStatusAction =
  | "continue"
  | "pay"
  | "upload-document"
  | "provide-information"
  | "review-application"
  | "review-lease-offer"
  | "withdraw"
  | "contact-leasing";

export type ApplicationStatusMeta = {
  status: ApplicationPublicStatus;
  explanation: string;
  nextRequiredAction: string;
  actions: ApplicationStatusAction[];
  tone: "neutral" | "info" | "warning" | "success" | "error";
};

export const APPLICATION_STATUS_DEFINITIONS: ApplicationStatusMeta[] = [
  {
    status: "Draft",
    explanation:
      "Your application is saved but has not been submitted to the leasing team.",
    nextRequiredAction: "Finish the remaining steps and submit your application.",
    actions: ["continue"],
    tone: "neutral",
  },
  {
    status: "Submitted",
    explanation:
      "Harborline received your application and will confirm that it is ready for review.",
    nextRequiredAction: "No action is required unless leasing contacts you.",
    actions: ["review-application", "withdraw", "contact-leasing"],
    tone: "info",
  },
  {
    status: "Payment Pending",
    explanation:
      "Your application was received, but the required application fee is not complete.",
    nextRequiredAction: "Complete the application-fee step.",
    actions: ["pay", "withdraw", "contact-leasing"],
    tone: "warning",
  },
  {
    status: "Documents Required",
    explanation:
      "One or more documents needed to continue reviewing your application are missing.",
    nextRequiredAction: "Upload the requested document or documents.",
    actions: ["upload-document", "withdraw", "contact-leasing"],
    tone: "warning",
  },
  {
    status: "Under Review",
    explanation:
      "The leasing team is reviewing the application information you submitted.",
    nextRequiredAction: "No action is required right now.",
    actions: ["review-application", "withdraw", "contact-leasing"],
    tone: "info",
  },
  {
    status: "Screening in Progress",
    explanation:
      "Authorized screening is underway. Private criteria and screening details are not shown here.",
    nextRequiredAction: "No action is required unless leasing contacts you.",
    actions: ["withdraw", "contact-leasing"],
    tone: "info",
  },
  {
    status: "Additional Information Requested",
    explanation:
      "The leasing team needs more information from you before it can continue.",
    nextRequiredAction: "Provide the requested information.",
    actions: ["provide-information", "withdraw", "contact-leasing"],
    tone: "warning",
  },
  {
    status: "Approved",
    explanation:
      "Your application has been approved. Leasing will prepare the next step.",
    nextRequiredAction: "Wait for your lease offer or contact leasing with questions.",
    actions: ["contact-leasing"],
    tone: "success",
  },
  {
    status: "Conditionally Approved",
    explanation:
      "Your application can move forward after you review and satisfy the stated conditions.",
    nextRequiredAction: "Review the conditions provided by leasing.",
    actions: ["provide-information", "contact-leasing"],
    tone: "warning",
  },
  {
    status: "Waitlisted",
    explanation:
      "Your application remains active, but the requested home is not currently available to offer.",
    nextRequiredAction: "No action is required unless you want to withdraw or discuss alternatives.",
    actions: ["withdraw", "contact-leasing"],
    tone: "neutral",
  },
  {
    status: "Denied",
    explanation:
      "Harborline cannot approve this application. Any legally required notice is provided separately.",
    nextRequiredAction: "Review your notice or contact leasing with permitted questions.",
    actions: ["contact-leasing"],
    tone: "error",
  },
  {
    status: "Withdrawn",
    explanation:
      "This application was withdrawn and is no longer being considered.",
    nextRequiredAction: "No action is required.",
    actions: ["contact-leasing"],
    tone: "neutral",
  },
  {
    status: "Lease Offer Available",
    explanation:
      "A lease offer is ready for you to review before accepting or declining.",
    nextRequiredAction: "Review the lease offer before its deadline.",
    actions: ["review-lease-offer", "withdraw", "contact-leasing"],
    tone: "success",
  },
  {
    status: "Lease Accepted",
    explanation:
      "Your lease offer has been accepted. Leasing will provide move-in instructions.",
    nextRequiredAction:
      "Start the move-in checklist and complete required signatures when leasing sends them.",
    actions: ["contact-leasing"],
    tone: "success",
  },
];

export type ApplicationStatusTimelineEvent = {
  id: string;
  status: ApplicationPublicStatus;
  occurredAt: string;
  description: string;
};

export type ApplicationStatusRecord = {
  applicationId: string;
  applicationNumber: string;
  applicantName: string;
  property: string;
  unit: string;
  submissionDate: string;
  currentStatus: ApplicationPublicStatus;
  lastUpdatedAt: string;
  timeline: ApplicationStatusTimelineEvent[];
};

export function getApplicationStatusMeta(
  status: ApplicationPublicStatus
): ApplicationStatusMeta {
  const found = APPLICATION_STATUS_DEFINITIONS.find(
    (definition) => definition.status === status
  );
  if (!found) {
    throw new Error(`Unknown public application status: ${status}`);
  }
  return found;
}

function createTimelineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `status-${Date.now()}`;
}

function readStoredStatusRecords(): ApplicationStatusRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(APPLICATION_STATUS_RECORDS_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as ApplicationStatusRecord[];
}

export function readApplicationStatusRecord(
  applicationId: string
): ApplicationStatusRecord | null {
  return (
    readStoredStatusRecords().find(
      (record) => record.applicationId === applicationId
    ) ?? null
  );
}

function writeStoredStatusRecords(records: ApplicationStatusRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    APPLICATION_STATUS_RECORDS_KEY,
    JSON.stringify(records)
  );
}

export function createDraftStatusRecord(
  draft: RentalApplicationDraft
): ApplicationStatusRecord {
  const occurredAt = draft.savedAt || new Date().toISOString();
  return {
    applicationId: draft.id,
    applicationNumber: `DRAFT-${draft.id.slice(0, 8).toUpperCase()}`,
    applicantName: draft.applicantFullName || "Applicant",
    property: draft.property || "Property not selected",
    unit: draft.floorPlan || draft.unitId || "Unit not selected",
    submissionDate: "",
    currentStatus: "Draft",
    lastUpdatedAt: occurredAt,
    timeline: [
      {
        id: createTimelineId(),
        status: "Draft",
        occurredAt,
        description: "Application draft saved.",
      },
    ],
  };
}

export function recordSubmittedApplicationStatus(
  submission: SubmittedApplication
): ApplicationStatusRecord {
  const existing = readStoredStatusRecords().find(
    (record) => record.applicationId === submission.applicationId
  );
  if (existing && existing.currentStatus !== "Draft") return existing;

  const submittedEvent: ApplicationStatusTimelineEvent = {
    id: createTimelineId(),
    status: "Submitted",
    occurredAt: submission.submittedAt,
    description: "Application submitted to Harborline.",
  };
  const record: ApplicationStatusRecord = {
    applicationId: submission.applicationId,
    applicationNumber: submission.confirmationNumber,
    applicantName: submission.applicantFullName,
    property: submission.property,
    unit: submission.floorPlan,
    submissionDate: submission.submittedAt,
    currentStatus: "Submitted",
    lastUpdatedAt: submission.submittedAt,
    timeline: existing
      ? [...existing.timeline, submittedEvent]
      : [
          {
            id: createTimelineId(),
            status: "Draft",
            occurredAt: submission.submittedAt,
            description: "Application prepared for submission.",
          },
          submittedEvent,
        ],
  };
  upsertApplicationStatusRecord(record);
  return record;
}

export function upsertApplicationStatusRecord(
  record: ApplicationStatusRecord
) {
  const existing = readStoredStatusRecords().filter(
    (item) => item.applicationId !== record.applicationId
  );
  writeStoredStatusRecords([record, ...existing]);
}

export function updatePublicApplicationStatus(
  applicationId: string,
  status: ApplicationPublicStatus,
  description?: string
): ApplicationStatusRecord | null {
  const records = readStoredStatusRecords();
  const current = records.find(
    (record) => record.applicationId === applicationId
  );
  if (!current || current.currentStatus === status) return current ?? null;

  const occurredAt = new Date().toISOString();
  const next: ApplicationStatusRecord = {
    ...current,
    currentStatus: status,
    lastUpdatedAt: occurredAt,
    timeline: [
      ...current.timeline,
      {
        id: createTimelineId(),
        status,
        occurredAt,
        description:
          description ?? getApplicationStatusMeta(status).explanation,
      },
    ],
  };
  upsertApplicationStatusRecord(next);
  return next;
}

/**
 * Merge persisted public status with legacy submission summaries.
 * No full application or private screening data is returned.
 */
export function readApplicationStatusRecords(
  submissions: SubmittedApplication[]
): ApplicationStatusRecord[] {
  const stored = readStoredStatusRecords();
  const byApplication = new Map(
    stored.map((record) => [record.applicationId, record])
  );

  for (const submission of submissions) {
    if (!byApplication.has(submission.applicationId)) {
      const record = recordSubmittedApplicationStatus(submission);
      byApplication.set(submission.applicationId, record);
    }
  }

  return Array.from(byApplication.values()).sort(
    (a, b) =>
      new Date(b.lastUpdatedAt).getTime() -
      new Date(a.lastUpdatedAt).getTime()
  );
}
