/**
 * Lease offer review / accept / decline.
 *
 * Acceptance in the mock portal is not a legally complete signature event.
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/lease-offer
 *   POST /api/portal/future/lease-offer/accept
 *   POST /api/portal/future/lease-offer/decline
 * Server must verify the offer belongs to the authenticated applicant.
 */

import {
  DEMO_FUTURE_OWNER_USER_ID,
  getMockApprovedLeaseOffer,
  getMockLeaseOffer,
} from "@/lib/portal/future/mock-data";
import type { LeaseOffer } from "@/lib/portal/future/models";
import {
  assertNotForcedError,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

const offersByOwner = new Map<string, LeaseOffer | null>();

function ensureOffer(ownerUserId: string): LeaseOffer | null {
  if (offersByOwner.has(ownerUserId)) {
    return offersByOwner.get(ownerUserId) ?? null;
  }
  const seeded = getMockLeaseOffer(ownerUserId);
  offersByOwner.set(ownerUserId, seeded);
  return seeded;
}

/** Test helper — seed an available offer for a given owner. */
export function seedLeaseOfferForOwner(
  ownerUserId: string,
  offer?: LeaseOffer
): LeaseOffer {
  const next = offer ?? getMockApprovedLeaseOffer(ownerUserId);
  offersByOwner.set(ownerUserId, next);
  return next;
}

export async function getOffer(
  ownerUserId: string
): Promise<ServiceResult<LeaseOffer | null>> {
  const forced = assertNotForcedError("getOffer");
  if (forced) return forced;

  try {
    await simulateLatency();
    if (!ownerUserId) {
      return fail("An owner user id is required.", "validation");
    }
    // BACKEND_TODO: fetch offer for auth.uid() only; hide internal underwriting notes
    let offer = ensureOffer(ownerUserId);

    // Demo path: under-review applicant has no offer unless explicitly seeded.
    if (ownerUserId === DEMO_FUTURE_OWNER_USER_ID && !offer) {
      return ok(null, "mock");
    }

    return ok(offer ? structuredClone(offer) : null, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load your lease offer.", "network");
  }
}

export async function acceptOffer(
  ownerUserId: string
): Promise<ServiceResult<LeaseOffer>> {
  const forced = assertNotForcedError("acceptOffer");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const offer = ensureOffer(ownerUserId);
    if (!offer) {
      return fail("No lease offer is available.", "not_found");
    }
    if (offer.ownerUserId !== ownerUserId) {
      return fail("You are not authorized to accept this offer.", "unauthorized");
    }
    if (offer.status === "accepted") {
      return ok(structuredClone(offer), "mock");
    }
    if (offer.status !== "available") {
      return fail("This offer can no longer be accepted.", "conflict");
    }
    if (new Date(offer.offerExpiresAt).getTime() < Date.now()) {
      const expired: LeaseOffer = { ...offer, status: "expired" };
      offersByOwner.set(ownerUserId, expired);
      return fail("This offer has expired.", "conflict");
    }

    const next: LeaseOffer = {
      ...offer,
      status: "accepted",
      acceptedAt: new Date().toISOString(),
      declinedAt: null,
    };
    offersByOwner.set(ownerUserId, next);
    // BACKEND_TODO: start e-sign / deposit workflow; do not treat portal click as final legal acceptance alone
    return ok(structuredClone(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not accept the lease offer.", "network");
  }
}

export async function declineOffer(
  ownerUserId: string
): Promise<ServiceResult<LeaseOffer>> {
  const forced = assertNotForcedError("declineOffer");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const offer = ensureOffer(ownerUserId);
    if (!offer) {
      return fail("No lease offer is available.", "not_found");
    }
    if (offer.ownerUserId !== ownerUserId) {
      return fail("You are not authorized to decline this offer.", "unauthorized");
    }
    if (offer.status === "declined") {
      return ok(structuredClone(offer), "mock");
    }
    if (offer.status !== "available") {
      return fail("This offer can no longer be declined.", "conflict");
    }

    const next: LeaseOffer = {
      ...offer,
      status: "declined",
      declinedAt: new Date().toISOString(),
      acceptedAt: null,
    };
    offersByOwner.set(ownerUserId, next);
    // BACKEND_TODO: notify leasing of decline
    return ok(structuredClone(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not decline the lease offer.", "network");
  }
}
