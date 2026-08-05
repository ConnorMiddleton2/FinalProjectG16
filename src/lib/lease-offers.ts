/**
 * Applicant-facing lease offers.
 *
 * Acceptance in this portal is an intent signal only — it is not a legally
 * binding lease until required signatures and backend lease processes finish.
 */

export const LEASE_OFFERS_STORAGE_KEY = "harborline_portal_lease_offers";

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
  /** Mock download payload — never a public production lease vault. */
  mockContents: string;
};

export type LeaseOfferFee = {
  label: string;
  amount: string;
  note: string;
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
  fees: LeaseOfferFee[];
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

export function createOfferId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `offer-${crypto.randomUUID()}`;
  }
  return `offer-${Date.now()}`;
}

export function formatOfferDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatOfferDateTime(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function isOfferExpired(offer: LeaseOffer, now = new Date()): boolean {
  if (offer.status === "expired") return true;
  const expires = new Date(offer.offerExpirationDate);
  if (Number.isNaN(expires.getTime())) return false;
  return expires.getTime() < now.getTime();
}

export function leaseOfferStatusLabel(status: LeaseOfferStatus): string {
  switch (status) {
    case "available":
      return "Available to review";
    case "accepted-pending-signature":
      return "Accepted — awaiting signatures";
    case "declined":
      return "Declined";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

function seedLeaseOffers(): LeaseOffer[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + 21);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  const expires = new Date(now);
  expires.setDate(expires.getDate() + 5);
  expires.setHours(17, 0, 0, 0);

  const createdAt = new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString();

  return [
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
      leaseStartDate: start.toISOString().slice(0, 10),
      leaseEndDate: end.toISOString().slice(0, 10),
      leaseTerm: "12 months",
      includedUtilities: [
        "Trash service included",
        "Water and sewer billed with monthly resident charges",
        "Electricity and internet arranged by resident",
      ],
      fees: [
        {
          label: "Administrative fee",
          amount: "$175",
          note: "Due at lease signing.",
        },
        {
          label: "Holding deposit",
          amount: "$300",
          note: "Applied to move-in costs if the lease is fully executed.",
        },
        {
          label: "Monthly pet rent",
          amount: "$35 per approved pet",
          note: "If applicable under the pet terms.",
        },
      ],
      parking: "One assigned garage space included with the unit.",
      petTerms:
        "Up to two cats or dogs. Breed and weight guidelines apply. $300 pet fee plus $35 monthly pet rent per pet.",
      offerExpirationDate: expires.toISOString(),
      requiredNextSteps: [
        "Review the lease package and community policies.",
        "Confirm rent, deposit, dates, and fees before responding.",
        "Accept or decline before the offer expiration date.",
        "If you accept, complete required electronic signatures when leasing sends the signing package.",
        "Do not treat portal acceptance as a finished lease until signatures and Harborline processing are complete.",
      ],
      documents: [
        {
          id: "doc-lease-draft",
          title: "Draft lease agreement",
          description: "Proposed lease terms for review before signing.",
          fileName: "pier12-a205-lease-draft.txt",
          mockContents: [
            "Harborline draft lease — Pier 12 Residences · A205",
            "This is a demo document for applicant review only.",
            "Monthly rent: $1,650",
            "Security deposit: $1,650",
            "Lease term: 12 months",
            "Portal acceptance is not a completed legal lease.",
          ].join("\n"),
        },
        {
          id: "doc-community-policies",
          title: "Community policies",
          description: "Resident handbook summary and building policies.",
          fileName: "pier12-community-policies.txt",
          mockContents: [
            "Pier 12 community policies (demo)",
            "- Quiet hours 10 PM – 8 AM",
            "- Guest parking rules apply",
            "- Pet registration required before move-in",
          ].join("\n"),
        },
        {
          id: "doc-fee-sheet",
          title: "Fee sheet",
          description: "Move-in and recurring fee summary.",
          fileName: "pier12-a205-fee-sheet.txt",
          mockContents: [
            "Fee sheet — Pier 12 A205 (demo)",
            "Administrative fee: $175 at signing",
            "Holding deposit: $300",
            "Pet fee / rent if applicable",
          ].join("\n"),
        },
      ],
      status: "available",
      createdAt,
      updatedAt: createdAt,
      respondedAt: "",
      responseNote: "",
    },
  ];
}

export function readLeaseOffers(): LeaseOffer[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LEASE_OFFERS_STORAGE_KEY);
  if (!raw) {
    const seeded = seedLeaseOffers();
    writeLeaseOffers(seeded);
    return seeded;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return (parsed as LeaseOffer[])
    .map((offer) =>
      isOfferExpired(offer) && offer.status === "available"
        ? { ...offer, status: "expired" as const, updatedAt: new Date().toISOString() }
        : offer
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export function writeLeaseOffers(offers: LeaseOffer[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEASE_OFFERS_STORAGE_KEY, JSON.stringify(offers));
}

export function readLeaseOffer(offerId: string): LeaseOffer | null {
  return readLeaseOffers().find((offer) => offer.id === offerId) ?? null;
}

export function upsertLeaseOffer(offer: LeaseOffer) {
  const existing = readLeaseOffers().filter((item) => item.id !== offer.id);
  writeLeaseOffers([offer, ...existing]);
}

export function acceptLeaseOffer(offerId: string): LeaseOffer | null {
  const offer = readLeaseOffer(offerId);
  if (!offer) return null;
  if (offer.status !== "available" || isOfferExpired(offer)) {
    throw new Error("This offer is no longer available to accept.");
  }
  const now = new Date().toISOString();
  const updated: LeaseOffer = {
    ...offer,
    status: "accepted-pending-signature",
    updatedAt: now,
    respondedAt: now,
    responseNote:
      "Applicant indicated acceptance in the portal. Lease is not complete until required signatures and backend processing finish.",
  };
  upsertLeaseOffer(updated);
  return updated;
}

export function declineLeaseOffer(
  offerId: string,
  reason = ""
): LeaseOffer | null {
  const offer = readLeaseOffer(offerId);
  if (!offer) return null;
  if (offer.status !== "available" || isOfferExpired(offer)) {
    throw new Error("This offer is no longer available to decline.");
  }
  const now = new Date().toISOString();
  const updated: LeaseOffer = {
    ...offer,
    status: "declined",
    updatedAt: now,
    respondedAt: now,
    responseNote: reason.trim() || "Applicant declined this lease offer.",
  };
  upsertLeaseOffer(updated);
  return updated;
}

export function downloadOfferDocument(document: LeaseOfferDocument) {
  const blob = new Blob([document.mockContents], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.fileName;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
