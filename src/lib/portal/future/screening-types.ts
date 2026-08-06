/**
 * Applicant screening models (ID, income, consent).
 * BACKEND_TODO: GET/POST /api/portal/future/screening
 */

export type ScreeningOverallStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "clear"
  | "needs_info"
  | "failed";

export type ScreeningDocumentKind = "government_id" | "income_proof";

export type ScreeningDocument = {
  id: string;
  kind: ScreeningDocumentKind;
  label: string;
  uploadedAt: string;
};

export type ScreeningPackage = {
  ownerUserId: string;
  occupancyClass: "personal" | "commercial";
  status: ScreeningOverallStatus;
  consentGiven: boolean;
  consentAt: string | null;
  idDocument: ScreeningDocument | null;
  incomeDocument: ScreeningDocument | null;
  notes: string;
  lastUpdatedAt: string;
};

export type ScreeningConsentInput = {
  occupancyClass: "personal" | "commercial";
  consentGiven: boolean;
};

export type ScreeningUploadInput = {
  kind: ScreeningDocumentKind;
  label: string;
};
