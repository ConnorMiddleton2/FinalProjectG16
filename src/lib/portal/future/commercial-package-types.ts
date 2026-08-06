/**
 * Commercial leasing package for future / retail tenants.
 * BACKEND_TODO: GET/PUT/POST /api/portal/future/commercial-package
 */

export type CommercialPackageStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "needs_revision";

export type SalesReportingFrequency =
  | "monthly"
  | "quarterly"
  | "annual"
  | "not_required";

export type CommercialGuarantor = {
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
  guaranteedAmountLabel: string;
};

export type CommercialPackage = {
  ownerUserId: string;
  status: CommercialPackageStatus;
  businessName: string;
  dbaName: string;
  naicsCode: string;
  /** Permitted use / use clause language. */
  useClause: string;
  exclusiveUse: string;
  /** Tenant improvement allowance summary. */
  tiAllowanceLabel: string;
  tiNotes: string;
  tiRequestedAmount: string;
  guarantorRequired: boolean;
  guarantor: CommercialGuarantor;
  /** Percentage rent / sales reporting for retail. */
  salesReportingRequired: boolean;
  salesReportingFrequency: SalesReportingFrequency;
  percentageRentRate: string;
  salesBreakpointLabel: string;
  lastSalesReportPeriod: string;
  lastSalesReportAmount: string;
  notes: string;
  lastUpdatedAt: string;
  submittedAt: string | null;
};

export type SaveCommercialPackageInput = Omit<
  CommercialPackage,
  "ownerUserId" | "status" | "lastUpdatedAt" | "submittedAt"
>;
