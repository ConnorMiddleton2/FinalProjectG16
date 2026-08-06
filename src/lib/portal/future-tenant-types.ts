/**
 * Future-tenant (approved, pre-move-in) domain types.
 * Extends the existing tenant portal — not a separate app.
 */

export const FUTURE_TENANT_STAGES = [
  "approved",
  "account_verified",
  "documents_submitted",
  "lease_ready",
  "lease_signed",
  "payments_completed",
  "insurance_utilities_verified",
  "move_in_confirmed",
  "ready_for_move_in",
] as const;

export type FutureTenantStage = (typeof FUTURE_TENANT_STAGES)[number];

export const FUTURE_TENANT_STAGE_LABELS: Record<FutureTenantStage, string> = {
  approved: "Approved",
  account_verified: "Account verified",
  documents_submitted: "Documents submitted",
  lease_ready: "Lease ready",
  lease_signed: "Lease signed",
  payments_completed: "Required payments completed",
  insurance_utilities_verified: "Insurance and utilities verified",
  move_in_confirmed: "Move-in appointment confirmed",
  ready_for_move_in: "Ready for move-in",
};

export type ChecklistItemStatus =
  | "required"
  | "not_submitted"
  | "under_review"
  | "approved"
  | "rejected";

export type FutureDocKind =
  | "government_id"
  | "proof_of_income"
  | "employment_verification"
  | "rental_history"
  | "guarantor"
  | "pet_documentation"
  | "renters_insurance"
  | "utility_confirmation";

export type FutureDocumentItem = {
  id: string;
  kind: FutureDocKind;
  label: string;
  status: ChecklistItemStatus;
  rejectionReason?: string | null;
  fileName?: string | null;
  uploadedAt?: string | null;
};

export type FutureChargeKind =
  | "application_fee"
  | "holding_fee"
  | "security_deposit"
  | "pet_deposit"
  | "first_month_rent"
  | "admin_fee";

export type FutureChargeStatus =
  | "due"
  | "paid"
  | "processing"
  | "declined"
  | "waived";

export type FuturePreMoveInCharge = {
  id: string;
  kind: FutureChargeKind;
  label: string;
  description: string;
  amount: string;
  dueDate: string;
  status: FutureChargeStatus;
  refundable: boolean;
  receiptId?: string | null;
};

export type LeasePartySignStatus = {
  id: string;
  name: string;
  role: "tenant" | "guarantor" | "management";
  signed: boolean;
  signedAt?: string | null;
};

export type FutureLeasePackage = {
  id: string;
  propertyLabel: string;
  unit: string;
  monthlyRent: string;
  securityDeposit: string;
  feesSummary: string;
  leaseStart: string;
  leaseEnd: string;
  addendums: string[];
  ready: boolean;
  tenantInitialed: boolean;
  tenantSigned: boolean;
  signedAt?: string | null;
  parties: LeasePartySignStatus[];
  downloadAvailable: boolean;
};

export type MoveInAppointment = {
  leaseStartDate: string;
  requestedDate: string | null;
  requestedTime: string | null;
  confirmedDate: string | null;
  confirmedTime: string | null;
  keyPickupConfirmed: boolean;
  changeRequested: boolean;
  changeReason?: string | null;
  changeStatus?: "none" | "pending_approval" | "approved" | "denied";
  officeHours: string;
  parkingInstructions: string;
  loadingInstructions: string;
  elevatorInstructions: string;
  buildingAccess: string;
};

export type UtilityProvider = {
  id: string;
  name: string;
  utility: string;
  setupUrl?: string;
  instructions: string;
  activationBy: string;
  confirmed: boolean;
  confirmationNote?: string;
};

export type InsuranceRequirement = {
  requiredCoverage: string;
  minLiability: string;
  additionalInterest: string;
  status: ChecklistItemStatus;
  rejectionReason?: string | null;
  fileName?: string | null;
};

export type HouseholdConfirmation = {
  occupants: string[];
  emergencyContacts: string[];
  pets: string[];
  assistanceAnimals: string[];
  vehicles: string[];
  parkingNeeds: string;
  storageNeeds: string;
  confirmed: boolean;
  changeRequest?: string | null;
  changeStatus?: "none" | "pending_approval" | "approved" | "denied";
};

export type MoveInInfoPack = {
  propertyAddress: string;
  unit: string;
  keyPickup: string;
  parking: string;
  buildingAccess: string;
  mailPackages: string;
  trash: string;
  internetUtilities: string;
  communityRules: string;
  managementContact: string;
  emergencyGuidance: string;
};

export type ReadinessItem = {
  id: string;
  label: string;
  complete: boolean;
  blocking: boolean;
};

export type FutureTenantOnboarding = {
  id: string;
  ownerUserId: string;
  ownerEmail: string;
  lifecycle: "future" | "current";
  propertyLabel: string;
  unit: string;
  applicationId?: string | null;
  invitationCode: string;
  leaseStartDate: string;
  currentStage: FutureTenantStage;
  completedStages: FutureTenantStage[];
  outstandingRequirements: string[];
  importantDeadlines: Array<{ label: string; date: string }>;
  nextAction: string;
  readinessPercent: number;
  documents: FutureDocumentItem[];
  charges: FuturePreMoveInCharge[];
  lease: FutureLeasePackage;
  appointment: MoveInAppointment;
  readiness: ReadinessItem[];
  utilities: UtilityProvider[];
  insurance: InsuranceRequirement;
  household: HouseholdConfirmation;
  moveInInfo: MoveInInfoPack;
  accountVerified: boolean;
  updatedAt: string;
};

export const FUTURE_DOC_LABELS: Record<FutureDocKind, string> = {
  government_id: "Government-issued identification",
  proof_of_income: "Proof of income",
  employment_verification: "Employment verification",
  rental_history: "Rental history",
  guarantor: "Guarantor or co-signer documents",
  pet_documentation: "Pet documentation",
  renters_insurance: "Renter’s insurance",
  utility_confirmation: "Utility setup confirmation",
};

export const MAX_FUTURE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_FUTURE_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
