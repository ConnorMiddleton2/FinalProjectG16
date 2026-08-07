import {
  clearStoredRenewalRequest,
  loadStoredRenewalRequest,
  saveStoredRenewalRequest,
} from "@/lib/portal/renewal-store";
import type {
  RenewalContext,
  RenewalDraft,
  RenewalRequest,
  RenewalStatus,
} from "@/lib/portal/models";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

export type RenewalBundle = {
  context: RenewalContext;
  request: RenewalRequest | null;
};

/**
 * Lease renewal request service.
 * Submitting a request is not a finalized renewal.
 *
 * BACKEND_TODO:
 *   GET  /api/tenant/renewal
 *   POST /api/tenant/renewal
 *   GET  /api/tenant/renewal/status
 */

export async function getRenewalBundle(): Promise<ServiceResult<RenewalBundle>> {
  const forced = assertNotForcedError("getRenewalBundle");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    // BACKEND_TODO: live eligibility + existing request for session lease
    return ok(
      {
        context: emptyRenewalContext(),
        request: loadStoredRenewalRequest(auth.data.tenantScopeId),
      },
      "live"
    );
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load renewal information.",
      "network"
    );
  }
}

export async function submitRenewalRequest(input: {
  context: RenewalContext;
  draft: RenewalDraft;
  termLabel: string;
  estimatedMonthlyRent: string | null;
}): Promise<ServiceResult<RenewalRequest>> {
  const forced = assertNotForcedError("submitRenewalRequest");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  if (!input.context.eligibility.eligible) {
    return fail(
      "You are not currently eligible to submit a renewal request.",
      "validation"
    );
  }
  if (!input.draft.preferredTermId) {
    return fail("Select a preferred renewal term.", "validation");
  }

  try {
    await simulateLatency(800);
    const now = new Date().toISOString();
    const request: RenewalRequest = {
      id: `ren-${crypto.randomUUID().slice(0, 8)}`,
      status: "Submitted",
      preferredTermId: input.draft.preferredTermId,
      preferredTermLabel: input.termLabel,
      message: input.draft.message.trim(),
      submittedAt: now,
      updatedAt: now,
      estimatedMonthlyRent: input.estimatedMonthlyRent,
      timeline: [
        {
          id: crypto.randomUUID(),
          status: "Submitted",
          at: now,
          note: "Renewal request received. This is a request only — not a finalized renewal.",
        },
      ],
    };
    // BACKEND_TODO: POST and return server-authored record
    saveStoredRenewalRequest(request, auth.data.tenantScopeId);
    return ok(request, "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not submit your renewal request.",
      "network"
    );
  }
}

/** Demo-only status walkthrough for UI testing. */
export async function advanceRenewalDemoStatus(
  request: RenewalRequest
): Promise<ServiceResult<RenewalRequest>> {
  const forced = assertNotForcedError("advanceRenewalDemoStatus");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  const order: RenewalStatus[] = [
    "Submitted",
    "Under Review",
    "Offer Available",
    "Accepted",
  ];
  const idx = order.indexOf(request.status as (typeof order)[number]);
  const nextStatus =
    idx >= 0 && idx < order.length - 1 ? order[idx + 1] : request.status;
  if (nextStatus === request.status) {
    return ok(request, "mock");
  }

  const now = new Date().toISOString();
  const next: RenewalRequest = {
    ...request,
    status: nextStatus,
    updatedAt: now,
    timeline: [
      ...request.timeline,
      {
        id: crypto.randomUUID(),
        status: nextStatus,
        at: now,
        note: `Status updated to ${nextStatus} (demo).`,
      },
    ],
  };
  saveStoredRenewalRequest(next, auth.data.tenantScopeId);
  return ok(next, "mock");
}

export async function clearRenewalRequest(): Promise<
  ServiceResult<{ cleared: true }>
> {
  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  clearStoredRenewalRequest(auth.data.tenantScopeId);
  return ok({ cleared: true }, "mock");
}

export function getRenewalContextDemoFixture(): RenewalContext {
  return emptyRenewalContext();
}

export function getSubmittedRenewalDemoFixture(): RenewalRequest | null {
  return null;
}

function emptyRenewalContext(): RenewalContext {
  return {
    leaseNumber: "—",
    propertyName: "—",
    unitNumber: "—",
    currentMonthlyRent: "—",
    leaseEndDate: "",
    renewalDeadline: "",
    eligibility: {
      eligible: false,
      reason: "No lease is linked to this tenant account yet.",
    },
    availableTerms: [],
    conditions: [],
  };
}
