export const MOVE_OUT_REASONS = [
  "End of lease term",
  "Relocation",
  "Purchasing a home",
  "Financial reasons",
  "Unit or building concerns",
  "Other",
] as const;

export type MoveOutReason = (typeof MOVE_OUT_REASONS)[number];

export const MOVE_OUT_STATUSES = [
  "Not Started",
  "Submitted",
  "Under Review",
  "Acknowledged",
  "Inspection Scheduled",
  "Completed",
  "Cancelled",
] as const;

export type MoveOutStatus = (typeof MOVE_OUT_STATUSES)[number];

export type MoveOutContext = {
  leaseNumber: string;
  propertyName: string;
  unitNumber: string;
  /** ISO date YYYY-MM-DD */
  leaseEndDate: string;
  /** Required notice period in days */
  requiredNoticeDays: number;
  noticeRequirementLabel: string;
  /** Fixed demo “today” for notice calculations */
  todayIso: string;
  tenantContactName: string;
  tenantContactPhone: string;
  tenantContactEmail: string;
  checklist: Array<{ id: string; label: string; detail: string }>;
};

export type MoveOutFormValues = {
  /** ISO date YYYY-MM-DD */
  requestedMoveOutDate: string;
  reason: MoveOutReason | "";
  reasonOther: string;
  forwardingAddress: string;
  /** ISO date YYYY-MM-DD */
  preferredInspectionDate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  acknowledgment: boolean;
};

export type MoveOutFormErrors = Partial<
  Record<keyof MoveOutFormValues | "form", string>
>;

export type MoveOutNoticeRecord = {
  id: string;
  confirmationNumber: string;
  status: MoveOutStatus;
  values: MoveOutFormValues;
  noticeWarning: string | null;
  /** ISO datetime */
  submittedAt: string;
  updatedAt: string;
  timeline: Array<{
    id: string;
    status: MoveOutStatus;
    at: string;
    note: string;
  }>;
};

export type MoveOutWizardStep =
  | "overview"
  | "details"
  | "review"
  | "confirmation";

export type MoveOutLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      context: MoveOutContext;
      notice: MoveOutNoticeRecord | null;
      source: "live" | "mock";
    };
