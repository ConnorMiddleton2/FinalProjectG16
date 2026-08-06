/**
 * Electronic lease signature service (additive to lease offer accept/decline).
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/lease-sign
 *   POST /api/portal/future/lease-sign/complete
 */

import type {
  CompleteLeaseSignInput,
  LeaseSignPackage,
} from "@/lib/portal/future/lease-sign-types";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

const packagesByOwner = new Map<string, LeaseSignPackage>();

function seedPackage(ownerUserId: string): LeaseSignPackage {
  return {
    id: `sign-${ownerUserId}`,
    ownerUserId,
    propertyName: "Pier 12 Residences",
    unitLabel: "Unit 304",
    occupancyClass: "personal",
    rentLabel: "$1,850 / month",
    leaseTerm: "12 months (2026-09-01 – 2027-08-31)",
    status: "awaiting_signature",
    documents: [
      {
        id: "doc-lease",
        title: "Residential Lease — Pier 12 Unit 304",
        pages: 18,
      },
      {
        id: "doc-rules",
        title: "Community Rules Addendum",
        pages: 4,
      },
      {
        id: "doc-pets",
        title: "Pet Addendum",
        pages: 2,
      },
    ],
    signerName: null,
    signedAt: null,
    expiresAt: "2026-08-20T23:59:59.000Z",
  };
}

function ensure(ownerUserId: string): LeaseSignPackage {
  if (!packagesByOwner.has(ownerUserId)) {
    packagesByOwner.set(ownerUserId, seedPackage(ownerUserId));
  }
  return packagesByOwner.get(ownerUserId)!;
}

function clone(pkg: LeaseSignPackage): LeaseSignPackage {
  return {
    ...pkg,
    documents: pkg.documents.map((d) => ({ ...d })),
  };
}

export async function getLeaseSignPackage(
  ownerUserId: string
): Promise<ServiceResult<LeaseSignPackage>> {
  const forced = assertNotForcedError("getLeaseSignPackage");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    return ok(clone(ensure(ownerUserId)), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load the lease signing packet.", "network");
  }
}

export async function completeLeaseSignature(
  ownerUserId: string,
  input: CompleteLeaseSignInput
): Promise<ServiceResult<LeaseSignPackage>> {
  const forced = assertNotForcedError("completeLeaseSignature");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    const current = ensure(ownerUserId);
    if (current.status === "signed") {
      return ok(clone(current), "mock");
    }
    if (current.status !== "awaiting_signature") {
      return fail("This lease packet can no longer be signed.", "conflict");
    }
    if (new Date(current.expiresAt).getTime() < Date.now()) {
      const expired: LeaseSignPackage = { ...current, status: "expired" };
      packagesByOwner.set(ownerUserId, expired);
      return fail("This signing packet has expired.", "conflict");
    }
    if (!input.signerName.trim() || input.signerName.trim().length < 2) {
      return fail("Enter your full legal name to sign.", "validation");
    }
    if (!input.agreedToTerms) {
      return fail(
        "You must agree to the electronic signature terms to continue.",
        "validation"
      );
    }

    const now = new Date().toISOString();
    const next: LeaseSignPackage = {
      ...current,
      status: "signed",
      signerName: input.signerName.trim(),
      signedAt: now,
    };
    packagesByOwner.set(ownerUserId, next);
    // BACKEND_TODO: create audit trail + notify leasing
    return ok(clone(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not complete the electronic signature.", "network");
  }
}
