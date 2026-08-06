/**
 * Future Tenant Portal domain models.
 *
 * Stable contracts for the future-tenant service layer.
 * BACKEND_TODO: map API DTOs into these shapes at the service boundary.
 */

import type {
  OccupancyClass,
  PortalPropertyType,
} from "@/lib/portal/occupancy";

export type { OccupancyClass, PortalPropertyType } from "@/lib/portal/occupancy";

export type PreferredContactMethod =
  | "email"
  | "phone"
  | "text"
  | "portal-message";

export type Applicant = {
  id: string;
  ownerUserId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  preferredContactMethod: PreferredContactMethod;
  currentAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  desiredMoveInDate: string | null;
  preferredPropertyId: string | null;
  preferredUnitType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PropertySummary = {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  addressLine: string;
  /** Personal (residential) or commercial leasing inventory. */
  occupancyClass: OccupancyClass;
  propertyType: PortalPropertyType;
};

export type UnitAvailability = "available" | "limited" | "coming_soon";

export type AvailableUnit = {
  id: string;
  propertyId: string;
  propertyName: string;
  unitLabel: string;
  floorPlan: string;
  /** Personal (residential) home or commercial space. */
  occupancyClass: OccupancyClass;
  propertyType: PortalPropertyType;
  /** Monthly rent in USD (whole dollars). */
  rent: number;
  /** Security deposit in USD (whole dollars). */
  deposit: number;
  /** Bedrooms — use 0 for studio or commercial suites. */
  beds: number;
  baths: number;
  sqft: number;
  /** ISO date (YYYY-MM-DD). */
  availableDate: string;
  imageUrl: string;
  galleryUrls?: string[];
  amenities: string[];
  petFriendly: boolean;
  accessibility: string[];
  availability: UnitAvailability;
  location: {
    city: string;
    neighborhood: string;
  };
  description: string;
  utilities: string;
  parking: string;
  petPolicy: string;
  leaseTermOptions: string[];
  applicationRequirements: string[];
  feesDisclaimer: string;
  /** ISO datetime when the listing was published (for newest sort). */
  listedAt: string;
};

export type SavedUnit = {
  unitId: string;
  savedAt: string;
};

export type TourType = "in_person" | "virtual" | "self_guided";

export type TourStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type TourRequest = {
  id: string;
  ownerUserId: string;
  propertyId: string;
  propertyName: string;
  unitId: string | null;
  unitLabel: string | null;
  tourType: TourType;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Local time slot, e.g. "09:00". */
  timeSlot: string;
  guestCount: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  accessibilityRequests: string;
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

/** Wizard steps 1–16. */
export type ApplicationWizardStep =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16";

export const APPLICATION_WIZARD_STEP_LABELS: Record<
  ApplicationWizardStep,
  string
> = {
  "1": "Unit selection",
  "2": "Applicant information",
  "3": "Contact information",
  "4": "Current residence",
  "5": "Previous residence",
  "6": "Employment and income",
  "7": "Additional occupants",
  "8": "Pets",
  "9": "Vehicles",
  "10": "Rental history",
  "11": "References",
  "12": "Screening disclosures",
  "13": "Document uploads",
  "14": "Application fee",
  "15": "Review and certification",
  "16": "Confirmation",
};

export type OccupantRole =
  | "primary"
  | "co_applicant"
  | "guarantor"
  | "adult_occupant"
  | "minor_occupant";

export type CoApplicant = {
  id: string;
  applicationId: string;
  role: OccupantRole;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  relationship: string;
  inviteStatus: "not_sent" | "pending" | "accepted" | "declined";
  /** Never store full SSN / government ID numbers in frontend models. */
  dateOfBirth?: string | null;
};

/** Alias for non-applicant household members (same shape). */
export type Occupant = CoApplicant;

export type DocumentCategory =
  | "proof_of_income"
  | "government_id"
  | "employment_verification"
  | "rental_history"
  | "pet_records"
  | "vehicle_information"
  | "supporting";

export type UploadedDocument = {
  id: string;
  applicationId: string;
  ownerUserId: string;
  category: DocumentCategory;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  status: "pending" | "uploaded" | "under_review" | "accepted" | "rejected";
  uploadedAt: string;
  rejectionReason?: string | null;
  /** Mock / signed URL only — never a public upload folder path for real files. */
  previewUrl?: string | null;
};

export type FeePayment = {
  id: string;
  applicationId: string;
  ownerUserId: string;
  amountCents: number;
  currency: "USD";
  status: "unpaid" | "processing" | "paid" | "failed" | "refunded";
  /** Mock receipt id — no card PAN storage. */
  receiptNumber: string | null;
  paidAt: string | null;
  refundable: boolean;
  explanation: string;
};

export type FutureMessageTopic =
  | "unit_question"
  | "tour"
  | "application_question"
  | "missing_documents"
  | "status_question"
  | "lease_offer"
  | "move_in_preparation";

export type FutureMessageSenderRole = "applicant" | "leasing";

export type FutureMessageAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
};

export type FutureMessage = {
  id: string;
  threadId: string;
  senderRole: FutureMessageSenderRole;
  senderName: string;
  body: string;
  sentAt: string;
  attachments: FutureMessageAttachment[];
  deliveryStatus?: "sent" | "failed" | "sending";
};

export type FutureMessageThread = {
  id: string;
  ownerUserId: string;
  subject: string;
  topic: FutureMessageTopic;
  lastMessageAt: string;
  preview: string;
  unreadCount: number;
  messages: FutureMessage[];
};

export type LeaseOfferStatus =
  | "available"
  | "accepted"
  | "declined"
  | "expired";

export type LeaseOffer = {
  id: string;
  ownerUserId: string;
  applicationId: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitLabel: string;
  occupancyClass: OccupancyClass;
  propertyType: PortalPropertyType;
  rent: number;
  deposit: number;
  leaseStartDate: string;
  leaseEndDate: string;
  leaseTerm: string;
  includedUtilities: string;
  fees: string[];
  parking: string;
  petTerms: string;
  offerExpiresAt: string;
  requiredNextSteps: string[];
  status: LeaseOfferStatus;
  documentTitles: string[];
  acceptedAt: string | null;
  declinedAt: string | null;
};

export type MoveInTaskId =
  | "sign_lease"
  | "pay_deposit"
  | "pay_first_month"
  | "renters_insurance"
  | "set_up_utilities"
  | "confirm_occupants"
  | "register_vehicles"
  | "register_pets"
  | "schedule_key_pickup"
  | "review_instructions"
  | "move_in_inspection";

export type MoveInTask = {
  id: MoveInTaskId;
  ownerUserId: string;
  label: string;
  description: string;
  complete: boolean;
  required: boolean;
  deadline: string | null;
  requiredDocuments: string[];
  href: string | null;
};

export type FutureNotificationType =
  | "tour_confirmed"
  | "tour_changed"
  | "application_submitted"
  | "document_requested"
  | "application_status_updated"
  | "new_message"
  | "lease_offer_available"
  | "offer_deadline_approaching"
  | "move_in_task_due";

export type FutureNotificationCategory =
  | "Tours"
  | "Application"
  | "Documents"
  | "Messages"
  | "Lease Offer"
  | "Move-In";

export type FutureNotification = {
  id: string;
  ownerUserId: string;
  type: FutureNotificationType;
  category: FutureNotificationCategory;
  title: string;
  body: string;
  createdAt: string;
  href: string;
  hrefLabel: string;
  read: boolean;
};

export type RentalApplication = {
  id: string;
  applicationNumber: string;
  ownerUserId: string;
  applicantName: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitLabel: string;
  status: ApplicationStatus;
  currentStep: ApplicationWizardStep;
  submittedAt: string | null;
  lastUpdatedAt: string;
  nextRequiredAction: string | null;
  confirmationNumber: string | null;
  coApplicants: CoApplicant[];
  documents: UploadedDocument[];
  feePayment: FeePayment | null;
  /** Opaque draft payload for wizard fields — never log sensitive values. */
  draftPayload: Record<string, unknown>;
  certifiedAt: string | null;
};
