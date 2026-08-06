/**
 * Central Future Tenant Portal mock catalog.
 *
 * Keep seed/catalog data here — not inside React components.
 *
 * @backend Replace with API responses. Until then, unit detail fields stay
 * aligned with `AVAILABLE_UNIT_DETAILS` so detail pages stay consistent.
 */

import { AVAILABLE_UNIT_DETAILS } from "@/lib/available-unit-details";
import { SELF_GUIDED_PROPERTIES } from "@/lib/tour-scheduling";
import type {
  Applicant,
  Application,
  CoApplicant,
  FeePayment,
  LeaseOffer,
  Message,
  MoveInTask,
  Occupant,
  Property,
  SavedUnit,
  Tour,
  Unit,
  UploadedDocument,
} from "@/lib/portal/models";

/** Search-card listing dates not present on the detail catalog. */
const UNIT_LISTED_AT: Record<string, string> = {
  "pier-12-305": "2026-08-04",
  "canal-yard-a": "2026-08-01",
  "harbor-court-3b": "2026-08-05",
  "wharf-east-402": "2026-07-29",
  "pier-12-708": "2026-08-03",
  "canal-yard-c": "2026-07-31",
  "harbor-court-5a": "2026-08-02",
  "marina-house-214": "2026-08-05",
};

const UNIT_LOCATION: Record<string, string> = {
  "pier-12-305": "Downtown · Harbor Walk",
  "canal-yard-a": "Arts District · Canal Street",
  "harbor-court-3b": "East Wharf · Seaport Avenue",
  "wharf-east-402": "East Wharf · Market Pier",
  "pier-12-708": "Downtown · Harbor Walk",
  "canal-yard-c": "Arts District · Canal Street",
  "harbor-court-5a": "East Wharf · Seaport Avenue",
  "marina-house-214": "North Marina · Anchor Lane",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isPetFriendly(petPolicy: string): boolean {
  return !/not currently designated pet-friendly/i.test(petPolicy);
}

function toPortalUnit(
  detail: (typeof AVAILABLE_UNIT_DETAILS)[number]
): Unit {
  const propertyId = slugify(detail.property);
  return {
    id: detail.id,
    propertyId,
    property: detail.property,
    floorPlan: detail.floorPlan,
    address: detail.address,
    neighborhood: detail.neighborhood,
    location:
      UNIT_LOCATION[detail.id] ||
      `${detail.neighborhood} · ${detail.property}`,
    rent: detail.rent,
    deposit: detail.deposit,
    beds: detail.beds,
    baths: detail.baths,
    sqft: detail.sqft,
    availableDate: detail.availableDate,
    listedAt: UNIT_LISTED_AT[detail.id] || detail.availableDate,
    availability: detail.availability,
    leaseTerms: detail.leaseTerms,
    utilities: detail.utilities,
    petPolicy: detail.petPolicy,
    petFriendly: isPetFriendly(detail.petPolicy),
    parking: detail.parking,
    amenities: detail.amenities,
    accessibility: detail.accessibility,
    accessible: detail.accessibility.length > 0,
    requirements: detail.requirements,
    fees: detail.fees,
    artwork: detail.artwork,
  };
}

export const MOCK_UNITS: Unit[] = AVAILABLE_UNIT_DETAILS.map(toPortalUnit);

export const MOCK_PROPERTIES: Property[] = Array.from(
  new Map(
    MOCK_UNITS.map((unit) => {
      const property: Property = {
        id: unit.propertyId,
        name: unit.property,
        address: unit.address,
        neighborhood: unit.neighborhood,
        selfGuidedToursSupported: SELF_GUIDED_PROPERTIES.has(unit.property),
      };
      return [unit.propertyId, property] as const;
    })
  ).values()
);

export const DEMO_APPLICANT_ID = "applicant-alex-demo";

export const MOCK_APPLICANT: Applicant = {
  id: DEMO_APPLICANT_ID,
  fullName: "Alex Tenant",
  email: "alex.tenant@example.com",
  phone: "(555) 014-2200",
  preferredContact: "Email",
  streetAddress: "410 Seaport Avenue Apt 2",
  city: "Harbor City",
  state: "MS",
  zip: "20411",
  desiredMoveInDate: "2026-09-01",
  preferredProperty: "Pier 12 Residences",
  preferredUnitType: "1 bedroom",
  updatedAt: "2026-08-05T15:00:00.000Z",
};

export const MOCK_SAVED_UNITS: SavedUnit[] = [
  {
    id: "saved-pier-12-305",
    unitId: "pier-12-305",
    applicantId: DEMO_APPLICANT_ID,
    savedAt: "2026-08-04T18:22:00.000Z",
  },
  {
    id: "saved-marina-house-214",
    unitId: "marina-house-214",
    applicantId: DEMO_APPLICANT_ID,
    savedAt: "2026-08-05T11:05:00.000Z",
  },
];

export const MOCK_TOURS: Tour[] = [
  {
    id: "tour-pier12-confirmed",
    property: "Pier 12 Residences",
    unitId: "pier-12-305",
    floorPlan: "Residence 305 · Harbor One",
    tourType: "In-Person",
    date: "2026-08-12",
    time: "2:00 PM",
    guests: 2,
    name: "Alex Tenant",
    email: "alex.tenant@example.com",
    phone: "(555) 014-2200",
    accessibility: "",
    notes: "Interested in covered parking.",
    status: "confirmed",
    createdAt: "2026-08-03T16:00:00.000Z",
    updatedAt: "2026-08-03T16:00:00.000Z",
  },
];

export const MOCK_APPLICATIONS: Application[] = [
  {
    id: "demo-application-pier12",
    applicantId: DEMO_APPLICANT_ID,
    unitId: "pier12-a205",
    property: "Pier 12 Residences",
    floorPlan: "A205 · 1 bed / 1 bath",
    desiredMoveInDate: "2026-09-01",
    leaseTerm: "12 months",
    status: "Lease Offer Available",
    confirmationNumber: "HL-DEMO-OFFER",
    applicantFullName: "Alex Tenant",
    email: "alex.tenant@example.com",
    phone: "(555) 014-2200",
    submittedAt: "2026-07-28T14:30:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
    isDraft: false,
  },
];

export const MOCK_CO_APPLICANTS: CoApplicant[] = [
  {
    id: "party-co-jordan",
    applicationId: "demo-application-pier12",
    role: "co-applicant",
    fullName: "Jordan Tenant",
    email: "jordan.tenant@example.com",
    phone: "(555) 014-2211",
    relationshipToPrimary: "Spouse",
    dateOfBirth: "",
    invitationStatus: "pending",
    inviteToken: "invite-co-jordan-demo",
    invitedAt: "2026-07-28T15:00:00.000Z",
    completedAt: "",
  },
];

export const MOCK_OCCUPANTS: Occupant[] = [
  {
    id: "party-occ-sam",
    applicationId: "demo-application-pier12",
    role: "minor-occupant",
    fullName: "Sam Tenant",
    email: "",
    phone: "",
    relationshipToPrimary: "Child",
    dateOfBirth: "2016-04-12",
    invitationStatus: "not-sent",
    inviteToken: "",
    invitedAt: "",
    completedAt: "",
  },
];

export const MOCK_UPLOADED_DOCUMENTS: UploadedDocument[] = [
  {
    id: "doc-income-stub",
    applicationId: "demo-application-pier12",
    category: "proof-of-income",
    fileName: "july-paystub.pdf",
    fileSize: 248_320,
    mimeType: "application/pdf",
    uploadedAt: "2026-07-28T16:10:00.000Z",
    status: "success",
    errorMessage: "",
    storageKey: "mock://doc-income-stub/july-paystub.pdf",
  },
];

export const MOCK_FEE_PAYMENTS: FeePayment[] = [
  {
    id: "fee-demo-pier12",
    applicationId: "demo-application-pier12",
    amountCents: 5500,
    currency: "USD",
    status: "paid",
    paymentMethod: "mock-card",
    billingName: "Alex Tenant",
    billingEmail: "alex.tenant@example.com",
    paymentDisplayMask: "Card ending 4242",
    paidAt: "2026-07-28T14:45:00.000Z",
    receiptId: "RCPT-DEMO-5500",
    idempotencyKey: "fee-demo-application-pier12",
    property: "Pier 12 Residences",
    floorPlan: "A205 · 1 bed / 1 bath",
  },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: "msg-leasing-docs",
    conversationId: "conv-missing-documents",
    sender: "leasing",
    body: "Thanks for applying. Please upload an updated pay stub when you can.",
    createdAt: "2026-08-05T14:20:00.000Z",
    deliveryStatus: "sent",
    attachments: [],
  },
];

export const MOCK_LEASE_OFFERS: LeaseOffer[] = [
  {
    id: "offer-pier12-a205",
    applicationId: "demo-application-pier12",
    applicationNumber: "HL-DEMO-OFFER",
    applicantName: "Alex Tenant",
    property: "Pier 12 Residences",
    unit: "A205 · 1 bed / 1 bath",
    unitId: "pier12-a205",
    monthlyRent: "$1,650",
    securityDeposit: "$1,650",
    leaseStartDate: "2026-09-01",
    leaseEndDate: "2027-08-31",
    leaseTerm: "12 months",
    includedUtilities: [
      "Trash service included",
      "Water and sewer billed with monthly resident charges",
    ],
    parking: "One covered space available for $95 per month.",
    petTerms: "Up to two pets with fees as disclosed in the offer package.",
    offerExpirationDate: "2026-08-10T17:00:00.000Z",
    requiredNextSteps: [
      "Review lease documents",
      "Accept or decline before the deadline",
      "Complete e-sign when leasing sends the package",
    ],
    documents: [
      {
        id: "offer-doc-lease",
        title: "Lease draft",
        description: "Proposed lease terms for review.",
        fileName: "pier12-a205-lease-draft.txt",
      },
    ],
    status: "available",
    createdAt: "2026-08-05T08:00:00.000Z",
    updatedAt: "2026-08-05T08:00:00.000Z",
    respondedAt: "",
    responseNote: "",
  },
];

export const MOCK_MOVE_IN_TASKS: MoveInTask[] = [
  {
    id: "renters-insurance",
    onboardingId: "move-in-default",
    title: "Provide Renter’s Insurance",
    description:
      "Submit proof of renter’s insurance that meets community requirements.",
    deadline: "2026-08-25",
    requiredDocuments: [
      {
        id: "insurance-certificate",
        label: "Certificate of insurance",
        note: "Must list required coverage and effective dates.",
      },
    ],
    status: "remaining",
    completedAt: "",
    helpHref: "/portal/messages?intent=move-in",
    helpLabel: "Ask leasing",
  },
  {
    id: "pay-deposit",
    onboardingId: "move-in-default",
    title: "Pay Deposit",
    description: "Pay the security deposit according to your approved offer.",
    deadline: "2026-08-22",
    requiredDocuments: [
      {
        id: "deposit-receipt",
        label: "Deposit payment confirmation",
        note: "Keep your receipt or confirmation number.",
      },
    ],
    status: "remaining",
    completedAt: "",
  },
];

/** Amenity chips used by the unit search UI. */
export const MOCK_SEARCH_AMENITIES = [
  "Water views",
  "Covered parking",
  "Fitness room",
  "Roof terrace",
  "Elevator",
  "Package room",
  "Bike storage",
  "High ceilings",
] as const;
