/**
 * Future Tenant Portal domain models.
 *
 * Canonical interfaces for the prospect/applicant surface. Domain modules under
 * `src/lib/*` may keep richer storage shapes; services map to/from these models.
 *
 * @backend Replace service implementations — keep these interfaces stable for UI.
 */

export type AvailabilityStatus =
  | "Available now"
  | "Available soon"
  | "Waitlist";

export type PreferredContactMethod = "Email" | "Phone" | "Text";

/** Primary future-tenant / applicant profile. */
export type Applicant = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredContact: PreferredContactMethod;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  desiredMoveInDate: string;
  preferredProperty: string;
  preferredUnitType: string;
  updatedAt: string;
};

export type Property = {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  selfGuidedToursSupported: boolean;
};

export type UnitFee = {
  label: string;
  amount: string;
  note: string;
};

export type Unit = {
  id: string;
  propertyId: string;
  property: string;
  floorPlan: string;
  address: string;
  neighborhood: string;
  /** Short location label for search cards (e.g. "Downtown · Harbor Walk"). */
  location: string;
  rent: number;
  deposit: string;
  beds: number;
  baths: number;
  sqft: number;
  availableDate: string;
  listedAt: string;
  availability: AvailabilityStatus;
  leaseTerms: string[];
  utilities: string[];
  petPolicy: string;
  petFriendly: boolean;
  parking: string;
  amenities: string[];
  accessibility: string[];
  accessible: boolean;
  requirements: string[];
  fees: UnitFee[];
  /** Gradient stops for placeholder artwork. */
  artwork: string[];
};

export type SavedUnit = {
  id: string;
  unitId: string;
  applicantId: string;
  savedAt: string;
};

export type TourType = "In-Person" | "Virtual" | "Self-Guided";
export type TourStatus = "confirmed" | "cancelled" | "rescheduled";

export type Tour = {
  id: string;
  property: string;
  unitId: string;
  floorPlan: string;
  tourType: TourType;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  accessibility: string;
  notes: string;
  status: TourStatus;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationStatus =
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

export type Application = {
  id: string;
  applicantId: string;
  unitId: string;
  property: string;
  floorPlan: string;
  desiredMoveInDate: string;
  leaseTerm: string;
  status: ApplicationStatus;
  confirmationNumber: string;
  applicantFullName: string;
  email: string;
  phone: string;
  submittedAt: string;
  updatedAt: string;
  isDraft: boolean;
};

export type PartyRole =
  | "co-applicant"
  | "guarantor"
  | "adult-occupant"
  | "minor-occupant";

export type InvitationStatus =
  | "not-sent"
  | "pending"
  | "completed"
  | "declined";

/** Shared fields for household party rows on an application. */
export type ApplicationPartyBase = {
  id: string;
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  relationshipToPrimary: string;
  dateOfBirth: string;
  invitationStatus: InvitationStatus;
  inviteToken: string;
  invitedAt: string;
  completedAt: string;
};

export type CoApplicant = ApplicationPartyBase & {
  role: "co-applicant";
};

export type Occupant = ApplicationPartyBase & {
  role: "adult-occupant" | "minor-occupant";
};

export type Guarantor = ApplicationPartyBase & {
  role: "guarantor";
};

export type DocumentCategory =
  | "proof-of-income"
  | "government-id"
  | "employment-verification"
  | "rental-history"
  | "pet-records"
  | "vehicle-information"
  | "supporting";

export type DocumentUploadStatus = "uploading" | "success" | "failure";

export type UploadedDocument = {
  id: string;
  applicationId: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: DocumentUploadStatus;
  errorMessage: string;
  /** Opaque storage key — never a public URL. */
  storageKey: string;
};

export type FeePaymentMethod = "mock-card" | "mock-ach";
export type FeePaymentStatus =
  | "unpaid"
  | "processing"
  | "paid"
  | "failed";

export type FeePayment = {
  id: string;
  applicationId: string;
  amountCents: number;
  currency: string;
  status: FeePaymentStatus;
  paymentMethod: FeePaymentMethod | "";
  billingName: string;
  billingEmail: string;
  /** Display-only mock mask — never a full PAN or account number. */
  paymentDisplayMask: string;
  paidAt: string;
  receiptId: string;
  idempotencyKey: string;
  property: string;
  floorPlan: string;
};

export type MessageSender = "applicant" | "leasing";
export type MessageDeliveryStatus = "sending" | "sent" | "failed";

export type MessageAttachment = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: MessageSender;
  body: string;
  createdAt: string;
  deliveryStatus: MessageDeliveryStatus;
  attachments: MessageAttachment[];
};

export type LeaseOfferStatus =
  | "available"
  | "accepted-pending-signature"
  | "declined"
  | "expired";

export type LeaseOfferDocument = {
  id: string;
  title: string;
  description: string;
  fileName: string;
};

export type LeaseOffer = {
  id: string;
  applicationId: string;
  applicationNumber: string;
  applicantName: string;
  property: string;
  unit: string;
  unitId: string;
  monthlyRent: string;
  securityDeposit: string;
  leaseStartDate: string;
  leaseEndDate: string;
  leaseTerm: string;
  includedUtilities: string[];
  parking: string;
  petTerms: string;
  offerExpirationDate: string;
  requiredNextSteps: string[];
  documents: LeaseOfferDocument[];
  status: LeaseOfferStatus;
  createdAt: string;
  updatedAt: string;
  respondedAt: string;
  responseNote: string;
};

export type MoveInTaskId =
  | "sign-lease"
  | "pay-deposit"
  | "pay-first-month"
  | "renters-insurance"
  | "set-up-utilities"
  | "confirm-occupants"
  | "register-vehicles"
  | "register-pets"
  | "schedule-key-pickup"
  | "review-instructions"
  | "move-in-inspection";

export type MoveInTaskStatus = "remaining" | "completed";

export type MoveInRequiredDocument = {
  id: string;
  label: string;
  note: string;
};

export type MoveInTask = {
  id: MoveInTaskId;
  onboardingId: string;
  title: string;
  description: string;
  deadline: string;
  requiredDocuments: MoveInRequiredDocument[];
  status: MoveInTaskStatus;
  completedAt: string;
  helpHref?: string;
  helpLabel?: string;
};
