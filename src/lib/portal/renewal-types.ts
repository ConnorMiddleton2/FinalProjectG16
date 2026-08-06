export const RENEWAL_STATUSES = [
  "Not Started",
  "Submitted",
  "Under Review",
  "Offer Available",
  "Accepted",
  "Declined",
  "Expired",
] as const;

export type RenewalStatus = (typeof RENEWAL_STATUSES)[number];

export type RenewalTermOption = {
  id: string;
  label: string;
  months: number;
  /** ISO date YYYY-MM-DD */
  proposedStartDate: string;
  /** ISO date YYYY-MM-DD */
  proposedEndDate: string;
  estimatedMonthlyRent: string | null;
  notes: string;
};

export type RenewalEligibility = {
  eligible: boolean;
  reason: string;
};

export type RenewalCondition = {
  id: string;
  title: string;
  detail: string;
};

/**
 * Context for starting or tracking a renewal request.
 * Tenant-facing only — no private management notes.
 */
export type RenewalContext = {
  leaseNumber: string;
  propertyName: string;
  unitNumber: string;
  currentMonthlyRent: string;
  /** ISO date YYYY-MM-DD */
  leaseEndDate: string;
  /** ISO date YYYY-MM-DD */
  renewalDeadline: string;
  eligibility: RenewalEligibility;
  availableTerms: RenewalTermOption[];
  conditions: RenewalCondition[];
};

export type RenewalRequestRecord = {
  id: string;
  status: RenewalStatus;
  preferredTermId: string;
  preferredTermLabel: string;
  message: string;
  /** ISO datetime */
  submittedAt: string | null;
  /** ISO datetime of last status change */
  updatedAt: string;
  estimatedMonthlyRent: string | null;
  timeline: Array<{
    id: string;
    status: RenewalStatus;
    at: string;
    note: string;
  }>;
};

export type RenewalWizardStep =
  | "overview"
  | "select-term"
  | "add-message"
  | "review"
  | "confirmation";

export type RenewalDraft = {
  preferredTermId: string;
  message: string;
};

export type RenewalLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      context: RenewalContext;
      request: RenewalRequestRecord | null;
      source: "live" | "mock";
    };
