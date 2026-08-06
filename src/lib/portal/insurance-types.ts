/**
 * Current-tenant insurance / certificate of insurance (COI) tracking.
 * BACKEND_TODO: GET/POST /api/tenant/insurance
 */

export type InsurancePolicyStatus =
  | "valid"
  | "expiring_soon"
  | "expired"
  | "missing"
  | "under_review";

export type InsuranceOccupancyClass = "personal" | "commercial";

export type InsurancePolicy = {
  id: string;
  occupancyClass: InsuranceOccupancyClass;
  policyType: string;
  carrier: string;
  policyNumber: string;
  coverageAmount: string;
  effectiveDate: string;
  expirationDate: string;
  status: InsurancePolicyStatus;
  /** COI / declaration PDF label for demo download. */
  documentLabel: string;
  notes: string;
};

export type InsuranceUploadInput = {
  policyType: string;
  carrier: string;
  policyNumber: string;
  coverageAmount: string;
  effectiveDate: string;
  expirationDate: string;
  occupancyClass: InsuranceOccupancyClass;
  documentLabel: string;
};
