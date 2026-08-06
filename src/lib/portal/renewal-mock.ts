import type {
  RenewalContext,
  RenewalRequestRecord,
} from "@/lib/portal/renewal-types";

/** Isolated mock renewal context aligned with Pier 12 Suite 210 lease demo. */
export function getMockRenewalContext(): RenewalContext {
  return {
    leaseNumber: "HL-P12-210-2026",
    propertyName: "Pier 12 Commerce",
    unitNumber: "Suite 210",
    currentMonthlyRent: "$4,800.00",
    leaseEndDate: "2027-12-31",
    renewalDeadline: "2027-09-30",
    eligibility: {
      eligible: true,
      reason:
        "Your lease is active and within the renewal window. You may submit a renewal request before the deadline.",
    },
    availableTerms: [
      {
        id: "term-12",
        label: "12-month renewal",
        months: 12,
        proposedStartDate: "2028-01-01",
        proposedEndDate: "2028-12-31",
        estimatedMonthlyRent: "$4,950.00",
        notes: "Standard annual renewal term.",
      },
      {
        id: "term-24",
        label: "24-month renewal",
        months: 24,
        proposedStartDate: "2028-01-01",
        proposedEndDate: "2029-12-31",
        estimatedMonthlyRent: "$4,875.00",
        notes: "Longer commitment with a modest estimated rate hold.",
      },
      {
        id: "term-month",
        label: "Month-to-month (after term)",
        months: 1,
        proposedStartDate: "2028-01-01",
        proposedEndDate: "2028-01-31",
        estimatedMonthlyRent: null,
        notes:
          "Estimated rent is set when an offer is issued. Month-to-month may include a premium.",
      },
    ],
    conditions: [
      {
        id: "cond-1",
        title: "Request is not a signed renewal",
        detail:
          "Submitting a renewal request does not automatically finalize your renewal. A formal offer and signed documents are still required.",
      },
      {
        id: "cond-2",
        title: "Offer timing",
        detail:
          "Harborline reviews requests and may issue an offer before your renewal deadline. Terms and rent estimates can change until an offer is accepted in writing.",
      },
      {
        id: "cond-3",
        title: "Account standing",
        detail:
          "Renewal offers typically require the lease account to be in good standing, including rent and required insurance on file.",
      },
      {
        id: "cond-4",
        title: "Deadline",
        detail:
          "Requests should be submitted by the renewal deadline. Late requests may still be reviewed but are not guaranteed.",
      },
    ],
  };
}

/** Optional seed for demoing a mid-pipeline request (not used by default). */
export function getMockSubmittedRenewalRequest(): RenewalRequestRecord {
  return {
    id: "ren-demo-1",
    status: "Under Review",
    preferredTermId: "term-12",
    preferredTermLabel: "12-month renewal",
    message: "We would like to stay in Suite 210 if possible.",
    submittedAt: "2026-04-20T14:30:00.000Z",
    updatedAt: "2026-04-22T10:00:00.000Z",
    estimatedMonthlyRent: "$4,950.00",
    timeline: [
      {
        id: "t1",
        status: "Submitted",
        at: "2026-04-20T14:30:00.000Z",
        note: "Renewal request received from tenant.",
      },
      {
        id: "t2",
        status: "Under Review",
        at: "2026-04-22T10:00:00.000Z",
        note: "Harborline is reviewing eligibility and term options.",
      },
    ],
  };
}
