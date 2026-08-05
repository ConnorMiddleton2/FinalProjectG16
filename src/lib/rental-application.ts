/**
 * Rental application draft model for the Future Tenant Portal.
 * Never store full SSN, bank account/routing numbers, or unmasked ID numbers.
 */

import { AVAILABLE_UNIT_DETAILS } from "@/lib/available-unit-details";
import type { ApplicantProfile } from "@/lib/applicant-profile";
import {
  migrateLegacyOccupants,
  syncPartyInvitationStatuses,
  validatePartyBasics,
  type ApplicationParty,
} from "@/lib/application-parties";
import {
  normalizeDocumentMeta,
  validateRequiredDocuments,
  type DocumentMeta,
} from "@/lib/application-documents";
import {
  createFeeIdempotencyKey,
  normalizeLegacyFeePaymentMethod,
  type FeePaymentMethod,
  type FeePaymentStatus,
} from "@/lib/application-fee";

export type { DocumentMeta } from "@/lib/application-documents";

export const RENTAL_APPLICATION_DRAFT_KEY = "harborline_rental_application_draft";
export const RENTAL_APPLICATION_SUBMISSIONS_KEY =
  "harborline_rental_application_submissions";

export const APPLICATION_STEPS = [
  { id: "unit", title: "Unit selection", short: "Unit" },
  { id: "applicant", title: "Applicant information", short: "Applicant" },
  { id: "contact", title: "Contact information", short: "Contact" },
  { id: "currentResidence", title: "Current residence", short: "Current" },
  { id: "previousResidence", title: "Previous residence", short: "Previous" },
  { id: "employment", title: "Employment and income", short: "Income" },
  { id: "occupants", title: "Household and parties", short: "Household" },
  { id: "pets", title: "Pets", short: "Pets" },
  { id: "vehicles", title: "Vehicles", short: "Vehicles" },
  { id: "rentalHistory", title: "Rental history", short: "History" },
  { id: "references", title: "References", short: "References" },
  { id: "screening", title: "Screening disclosures", short: "Screening" },
  { id: "documents", title: "Document uploads", short: "Documents" },
  { id: "fee", title: "Application fee", short: "Fee" },
  { id: "review", title: "Review and certification", short: "Review" },
  { id: "confirmation", title: "Confirmation", short: "Done" },
] as const;

export type ApplicationStepId = (typeof APPLICATION_STEPS)[number]["id"];

export type AddressFields = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type Pet = {
  id: string;
  type: string;
  breed: string;
  weight: string;
  name: string;
};

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  color: string;
  year: string;
  /** Plate may be collected; never log it. Stored only in local draft. */
  plateState: string;
};

export type Reference = {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
};

export type RentalApplicationDraft = {
  id: string;
  stepIndex: number;
  unitId: string;
  property: string;
  floorPlan: string;
  desiredMoveInDate: string;
  leaseTerm: string;

  applicantFullName: string;
  dateOfBirth: string;
  /** ID type only — never the ID number itself. */
  governmentIdType: string;
  governmentIdProvidedOffline: boolean;

  email: string;
  phone: string;
  alternatePhone: string;
  preferredContact: "Email" | "Phone" | "Text";

  currentResidence: AddressFields & {
    moveInDate: string;
    monthlyRent: string;
    landlordName: string;
    landlordPhone: string;
    reasonForLeaving: string;
  };

  hasPreviousResidence: boolean;
  previousResidence: AddressFields & {
    moveInDate: string;
    moveOutDate: string;
    landlordName: string;
    landlordPhone: string;
  };

  employmentStatus: string;
  employerName: string;
  jobTitle: string;
  employerPhone: string;
  monthlyIncome: string;
  additionalIncome: string;
  additionalIncomeSource: string;

  /** Co-applicants, guarantors, and occupants (shared fields only). */
  parties: ApplicationParty[];
  hasPets: boolean;
  pets: Pet[];
  hasVehicles: boolean;
  vehicles: Vehicle[];

  everEvicted: "" | "yes" | "no";
  everBrokeLease: "" | "yes" | "no";
  rentalHistoryNotes: string;

  references: Reference[];

  authorizeScreening: boolean;
  acknowledgeFairHousing: boolean;
  disclosureNotes: string;

  documents: DocumentMeta[];

  feeAcknowledged: boolean;
  feeRefundPolicyAcknowledged: boolean;
  feePaymentMethod: FeePaymentMethod;
  feeBillingName: string;
  feeBillingEmail: string;
  feeBillingStreet: string;
  feeBillingCity: string;
  feeBillingState: string;
  feeBillingZip: string;
  feeStatus: FeePaymentStatus;
  /** Mock payment reference only — never real card/bank numbers. */
  feePaymentReference: string;
  feePaidAt: string;
  feeReceiptId: string;
  /** Stable key used to block duplicate fee charges for this application. */
  feeIdempotencyKey: string;

  certifyAccuracy: boolean;
  certifyAuthorization: boolean;
  signatureName: string;

  status: "draft" | "submitted";
  confirmationNumber: string;
  savedAt: string;
  submittedAt: string;
};

export type SubmittedApplication = {
  confirmationNumber: string;
  applicationId: string;
  property: string;
  floorPlan: string;
  submittedAt: string;
  applicantFullName: string;
  email: string;
};

function emptyAddress(): AddressFields {
  return { street: "", city: "", state: "", zip: "" };
}

export function createApplicationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `app-${Date.now()}`;
}

export function createConfirmationNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 900 + 100);
  return `HL-${stamp.slice(-6)}-${rand}`;
}

export function emptyRentalApplicationDraft(
  unitId = ""
): RentalApplicationDraft {
  const unit = AVAILABLE_UNIT_DETAILS.find((item) => item.id === unitId);
  return {
    id: createApplicationId(),
    stepIndex: 0,
    unitId: unit?.id ?? "",
    property: unit?.property ?? "",
    floorPlan: unit?.floorPlan ?? "",
    desiredMoveInDate: "",
    leaseTerm: unit?.leaseTerms[0] ?? "12 months",

    applicantFullName: "",
    dateOfBirth: "",
    governmentIdType: "",
    governmentIdProvidedOffline: false,

    email: "",
    phone: "",
    alternatePhone: "",
    preferredContact: "Email",

    currentResidence: {
      ...emptyAddress(),
      moveInDate: "",
      monthlyRent: "",
      landlordName: "",
      landlordPhone: "",
      reasonForLeaving: "",
    },

    hasPreviousResidence: true,
    previousResidence: {
      ...emptyAddress(),
      moveInDate: "",
      moveOutDate: "",
      landlordName: "",
      landlordPhone: "",
    },

    employmentStatus: "",
    employerName: "",
    jobTitle: "",
    employerPhone: "",
    monthlyIncome: "",
    additionalIncome: "",
    additionalIncomeSource: "",

    parties: [],
    hasPets: false,
    pets: [],
    hasVehicles: false,
    vehicles: [],

    everEvicted: "",
    everBrokeLease: "",
    rentalHistoryNotes: "",

    references: [
      {
        id: createApplicationId(),
        fullName: "",
        relationship: "",
        phone: "",
        email: "",
      },
    ],

    authorizeScreening: false,
    acknowledgeFairHousing: false,
    disclosureNotes: "",

    documents: [],

    feeAcknowledged: false,
    feeRefundPolicyAcknowledged: false,
    feePaymentMethod: "",
    feeBillingName: "",
    feeBillingEmail: "",
    feeBillingStreet: "",
    feeBillingCity: "",
    feeBillingState: "",
    feeBillingZip: "",
    feeStatus: "unpaid",
    feePaymentReference: "",
    feePaidAt: "",
    feeReceiptId: "",
    feeIdempotencyKey: "",

    certifyAccuracy: false,
    certifyAuthorization: false,
    signatureName: "",

    status: "draft",
    confirmationNumber: "",
    savedAt: "",
    submittedAt: "",
  };
}

export function prefillFromProfile(
  draft: RentalApplicationDraft,
  profile: ApplicantProfile
): RentalApplicationDraft {
  return {
    ...draft,
    applicantFullName: draft.applicantFullName || profile.fullName,
    email: draft.email || profile.email,
    phone: draft.phone || profile.phone,
    preferredContact: profile.preferredContact || draft.preferredContact,
    desiredMoveInDate: draft.desiredMoveInDate || profile.desiredMoveInDate,
    currentResidence: {
      ...draft.currentResidence,
      street: draft.currentResidence.street || profile.streetAddress,
      city: draft.currentResidence.city || profile.city,
      state: draft.currentResidence.state || profile.state,
      zip: draft.currentResidence.zip || profile.zip,
    },
    property:
      draft.property ||
      profile.preferredProperty ||
      draft.property,
  };
}

export function readRentalApplicationDraft(): RentalApplicationDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RENTAL_APPLICATION_DRAFT_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as RentalApplicationDraft & {
    occupants?: Array<{
      id: string;
      fullName: string;
      relationship: string;
      age: string;
    }>;
  };
  if (!parsed || typeof parsed !== "object" || !parsed.id) {
    throw new Error("Application draft data is invalid.");
  }
  const base = emptyRentalApplicationDraft();
  const { occupants: legacyOccupants, ...rest } = parsed;
  const parties = Array.isArray(rest.parties)
    ? rest.parties
    : migrateLegacyOccupants(legacyOccupants ?? []);
  const syncedParties = syncPartyInvitationStatuses(rest.id, parties);
  const documents = Array.isArray(rest.documents)
    ? rest.documents.map((doc) => normalizeDocumentMeta(doc))
    : [];
  const feePaymentMethod = normalizeLegacyFeePaymentMethod(
    rest.feePaymentMethod as string | undefined
  );
  const feeIdempotencyKey =
    rest.feeIdempotencyKey || createFeeIdempotencyKey(rest.id);
  return {
    ...base,
    ...rest,
    parties: syncedParties,
    documents,
    feePaymentMethod,
    feeRefundPolicyAcknowledged: Boolean(rest.feeRefundPolicyAcknowledged),
    feeBillingName: rest.feeBillingName ?? "",
    feeBillingEmail: rest.feeBillingEmail ?? "",
    feeBillingStreet: rest.feeBillingStreet ?? "",
    feeBillingCity: rest.feeBillingCity ?? "",
    feeBillingState: rest.feeBillingState ?? "",
    feeBillingZip: rest.feeBillingZip ?? "",
    feeStatus: rest.feeStatus ?? (rest.feePaymentReference ? "paid" : "unpaid"),
    feePaidAt: rest.feePaidAt ?? "",
    feeReceiptId: rest.feeReceiptId ?? "",
    feeIdempotencyKey,
  };
}

export function writeRentalApplicationDraft(draft: RentalApplicationDraft) {
  if (typeof window === "undefined") return;
  const stamped = { ...draft, savedAt: new Date().toISOString() };
  window.localStorage.setItem(
    RENTAL_APPLICATION_DRAFT_KEY,
    JSON.stringify(stamped)
  );
}

export function clearRentalApplicationDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RENTAL_APPLICATION_DRAFT_KEY);
}

export function readSubmittedApplications(): SubmittedApplication[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(RENTAL_APPLICATION_SUBMISSIONS_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as SubmittedApplication[];
}

export function writeSubmittedApplication(submission: SubmittedApplication) {
  if (typeof window === "undefined") return;
  const existing = readSubmittedApplications();
  window.localStorage.setItem(
    RENTAL_APPLICATION_SUBMISSIONS_KEY,
    JSON.stringify([submission, ...existing])
  );
}

function requireText(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

function requireAddress(
  address: AddressFields,
  prefix: string
): string | null {
  return (
    requireText(address.street, `${prefix} street`) ||
    requireText(address.city, `${prefix} city`) ||
    requireText(address.state, `${prefix} state`) ||
    requireText(address.zip, `${prefix} ZIP`)
  );
}

/**
 * Minimum age to bind a residential lease in Mississippi.
 * Miss. Code Ann. § 93-19-13 (2025) grants persons 18+ capacity to lease
 * real property as a residence (even though MS age of majority is 21).
 */
export const MINIMUM_RENTAL_AGE = 18;

/** Latest allowed DOB so the applicant is at least MINIMUM_RENTAL_AGE today. */
export function getMaximumDateOfBirth(now = new Date()): string {
  const max = new Date(
    now.getFullYear() - MINIMUM_RENTAL_AGE,
    now.getMonth(),
    now.getDate()
  );
  const year = max.getFullYear();
  const month = String(max.getMonth() + 1).padStart(2, "0");
  const day = String(max.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validateApplicantAge(
  dateOfBirth: string,
  now = new Date()
): string | null {
  const required = requireText(dateOfBirth, "Date of birth");
  if (required) return required;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return "Enter a valid date of birth.";
  }

  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  if (
    Number.isNaN(birth.getTime()) ||
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return "Enter a valid date of birth.";
  }

  if (dateOfBirth > getMaximumDateOfBirth(now)) {
    return `Applicants must be at least ${MINIMUM_RENTAL_AGE} years old to rent.`;
  }

  return null;
}

/** Step validation — returns first error message or null when valid. */
export function validateApplicationStep(
  draft: RentalApplicationDraft,
  stepId: ApplicationStepId
): string | null {
  switch (stepId) {
    case "unit":
      return (
        requireText(draft.unitId, "Unit") ||
        requireText(draft.desiredMoveInDate, "Desired move-in date") ||
        requireText(draft.leaseTerm, "Lease term")
      );
    case "applicant":
      return (
        requireText(draft.applicantFullName, "Full name") ||
        validateApplicantAge(draft.dateOfBirth) ||
        requireText(draft.governmentIdType, "Government ID type") ||
        (draft.governmentIdProvidedOffline
          ? null
          : "Confirm that photo ID will be provided for screening.")
      );
    case "contact":
      return (
        requireText(draft.email, "Email") ||
        (!draft.email.includes("@") ? "Enter a valid email." : null) ||
        requireText(draft.phone, "Phone")
      );
    case "currentResidence":
      return (
        requireAddress(draft.currentResidence, "Current") ||
        requireText(draft.currentResidence.moveInDate, "Move-in date") ||
        requireText(draft.currentResidence.reasonForLeaving, "Reason for leaving")
      );
    case "previousResidence":
      if (!draft.hasPreviousResidence) return null;
      return (
        requireAddress(draft.previousResidence, "Previous") ||
        requireText(draft.previousResidence.moveInDate, "Previous move-in") ||
        requireText(draft.previousResidence.moveOutDate, "Previous move-out")
      );
    case "employment":
      return (
        requireText(draft.employmentStatus, "Employment status") ||
        requireText(draft.monthlyIncome, "Monthly income") ||
        (draft.employmentStatus === "Employed"
          ? requireText(draft.employerName, "Employer name") ||
            requireText(draft.jobTitle, "Job title")
          : null)
      );
    case "occupants":
      for (const party of draft.parties) {
        const error = validatePartyBasics(party);
        if (error) return error;
      }
      return null;
    case "pets":
      if (!draft.hasPets) return null;
      if (draft.pets.length === 0) return "Add at least one pet, or select No.";
      for (const pet of draft.pets) {
        const error =
          requireText(pet.type, "Pet type") || requireText(pet.name, "Pet name");
        if (error) return error;
      }
      return null;
    case "vehicles":
      if (!draft.hasVehicles) return null;
      if (draft.vehicles.length === 0) {
        return "Add at least one vehicle, or select No.";
      }
      for (const vehicle of draft.vehicles) {
        const error =
          requireText(vehicle.make, "Vehicle make") ||
          requireText(vehicle.model, "Vehicle model");
        if (error) return error;
      }
      return null;
    case "rentalHistory":
      return (
        (draft.everEvicted ? null : "Answer the eviction question.") ||
        (draft.everBrokeLease ? null : "Answer the lease-break question.")
      );
    case "references": {
      const primary = draft.references[0];
      if (!primary) return "Add at least one reference.";
      return (
        requireText(primary.fullName, "Reference name") ||
        requireText(primary.relationship, "Reference relationship") ||
        requireText(primary.phone, "Reference phone")
      );
    }
    case "screening":
      return draft.authorizeScreening && draft.acknowledgeFairHousing
        ? null
        : "Accept the required screening disclosures to continue.";
    case "documents":
      return validateRequiredDocuments(draft.documents);
    case "fee":
      return draft.feeStatus === "paid" &&
        draft.feeReceiptId &&
        draft.feeAcknowledged &&
        draft.feeRefundPolicyAcknowledged
        ? null
        : "Complete the application fee payment to continue.";
    case "review":
      return draft.certifyAccuracy &&
        draft.certifyAuthorization &&
        draft.signatureName.trim()
        ? null
        : "Complete certification and type your full name to submit.";
    case "confirmation":
      return null;
    default:
      return null;
  }
}

export function requiredFieldsHint(stepId: ApplicationStepId): string[] {
  const map: Record<ApplicationStepId, string[]> = {
    unit: ["Unit", "Move-in date", "Lease term"],
    applicant: [
      "Full name",
      "Date of birth",
      "ID type",
      "ID confirmation",
    ],
    contact: ["Email", "Phone"],
    currentResidence: ["Address", "Move-in date", "Reason for leaving"],
    previousResidence: ["Address dates (if applicable)"],
    employment: ["Status", "Monthly income", "Employer (if employed)"],
    occupants: [
      "Role",
      "Name",
      "Relationship",
      "Invite email when supported",
    ],
    pets: ["Pet details if applicable"],
    vehicles: ["Vehicle details if applicable"],
    rentalHistory: ["Eviction and lease-break answers"],
    references: ["At least one reference"],
    screening: ["Screening authorizations"],
    documents: [
      "Government ID",
      "Proof of income",
      "Optional supporting files",
    ],
    fee: ["Fee policy", "Billing details", "Mock payment", "Receipt"],
    review: ["Certification and signature name"],
    confirmation: [],
  };
  return map[stepId];
}
