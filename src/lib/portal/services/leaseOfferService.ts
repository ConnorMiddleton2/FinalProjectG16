/**
 * Lease offer service.
 *
 * @backend GET /api/portal/lease-offers
 * @backend POST /api/portal/lease-offers/:id/accept|decline
 * Acceptance is an intent signal until signatures/backend lease processing finish.
 */

import {
  acceptLeaseOffer,
  declineLeaseOffer,
  readLeaseOffers,
  type LeaseOffer as StoredLeaseOffer,
} from "@/lib/lease-offers";
import { MOCK_LEASE_OFFERS } from "@/lib/portal/mock/data";
import { PortalServiceError } from "@/lib/portal/mock/delay";
import type { LeaseOffer } from "@/lib/portal/models";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

function fromStored(offer: StoredLeaseOffer): LeaseOffer {
  return {
    id: offer.id,
    applicationId: offer.applicationId,
    applicationNumber: offer.applicationNumber,
    applicantName: offer.applicantName,
    property: offer.property,
    unit: offer.unit,
    unitId: offer.unitId,
    monthlyRent: offer.monthlyRent,
    securityDeposit: offer.securityDeposit,
    leaseStartDate: offer.leaseStartDate,
    leaseEndDate: offer.leaseEndDate,
    leaseTerm: offer.leaseTerm,
    includedUtilities: [...offer.includedUtilities],
    parking: offer.parking,
    petTerms: offer.petTerms,
    offerExpirationDate: offer.offerExpirationDate,
    requiredNextSteps: [...offer.requiredNextSteps],
    documents: offer.documents.map((document) => ({
      id: document.id,
      title: document.title,
      description: document.description,
      fileName: document.fileName,
    })),
    status: offer.status,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    respondedAt: offer.respondedAt,
    responseNote: offer.responseNote,
  };
}

function collectOffers(): LeaseOffer[] {
  const stored = readLeaseOffers().map(fromStored);
  const byId = new Map<string, LeaseOffer>();
  for (const item of MOCK_LEASE_OFFERS) byId.set(item.id, { ...item });
  for (const item of stored) byId.set(item.id, item);
  return Array.from(byId.values());
}

/** @backend GET /api/portal/lease-offers */
export async function listLeaseOffers(): Promise<ServiceResult<LeaseOffer[]>> {
  return runMockService(() => collectOffers(), {
    minMs: 160,
    maxMs: 420,
    failureRate: 0.03,
    failureMessage: "Could not load lease offers.",
  });
}

/** @backend GET /api/portal/lease-offers/:id */
export async function getLeaseOffer(
  offerId: string
): Promise<ServiceResult<LeaseOffer>> {
  return runMockService(() => {
    const offer = collectOffers().find((item) => item.id === offerId);
    if (!offer) {
      throw new PortalServiceError("Lease offer not found.", "NOT_FOUND", 404);
    }
    return offer;
  }, {
    minMs: 120,
    maxMs: 300,
    failureRate: 0.02,
    failureMessage: "Could not load lease offer.",
  });
}

/** @backend POST /api/portal/lease-offers/:id/accept */
export async function acceptOffer(
  offerId: string
): Promise<ServiceResult<LeaseOffer>> {
  return runMockService(() => {
    const updated = acceptLeaseOffer(offerId);
    if (!updated) {
      throw new PortalServiceError("Lease offer not found.", "NOT_FOUND", 404);
    }
    return fromStored(updated);
  }, {
    minMs: 280,
    maxMs: 700,
    failureRate: 0.04,
    failureMessage: "Could not accept this lease offer.",
  });
}

/** @backend POST /api/portal/lease-offers/:id/decline */
export async function declineOffer(
  offerId: string,
  responseNote = ""
): Promise<ServiceResult<LeaseOffer>> {
  return runMockService(() => {
    const updated = declineLeaseOffer(offerId, responseNote);
    if (!updated) {
      throw new PortalServiceError("Lease offer not found.", "NOT_FOUND", 404);
    }
    return fromStored(updated);
  }, {
    minMs: 280,
    maxMs: 700,
    failureRate: 0.04,
    failureMessage: "Could not decline this lease offer.",
  });
}
