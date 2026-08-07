import {
  clearStoredMoveOutNotice,
  loadStoredMoveOutNotice,
  saveStoredMoveOutNotice,
} from "@/lib/portal/move-out-store";
import { getNoticePeriodWarning } from "@/lib/portal/move-out-validation";
import type {
  MoveOutContext,
  MoveOutFormValues,
  MoveOutNotice,
  MoveOutStatus,
} from "@/lib/portal/models";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

export type MoveOutBundle = {
  context: MoveOutContext;
  notice: MoveOutNotice | null;
};

/**
 * Move-out notice service.
 * Submitting notice is not accepted until management acknowledges.
 *
 * BACKEND_TODO:
 *   GET  /api/tenant/move-out
 *   POST /api/tenant/move-out
 *   GET  /api/tenant/move-out/status
 */

export async function getMoveOutBundle(): Promise<ServiceResult<MoveOutBundle>> {
  const forced = assertNotForcedError("getMoveOutBundle");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    // BACKEND_TODO: live lease notice rules + existing notice for session tenant
    return ok(
      {
        context: emptyMoveOutContext(auth.data.displayName, auth.data.email),
        notice: loadStoredMoveOutNotice(auth.data.tenantScopeId),
      },
      "live"
    );
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load move-out information.",
      "network"
    );
  }
}

export async function submitMoveOutNotice(input: {
  context: MoveOutContext;
  values: MoveOutFormValues;
}): Promise<ServiceResult<MoveOutNotice>> {
  const forced = assertNotForcedError("submitMoveOutNotice");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(850);
    const now = new Date().toISOString();
    const confirmationNumber = `MO-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const notice: MoveOutNotice = {
      id: `move-${crypto.randomUUID().slice(0, 8)}`,
      confirmationNumber,
      status: "Submitted",
      values: input.values,
      noticeWarning: getNoticePeriodWarning(
        input.context,
        input.values.requestedMoveOutDate
      ),
      submittedAt: now,
      updatedAt: now,
      timeline: [
        {
          id: crypto.randomUUID(),
          status: "Submitted",
          at: now,
          note: "Move-out notice received. Not accepted until management acknowledges.",
        },
      ],
    };
    // BACKEND_TODO: POST notice; server validates notice period
    saveStoredMoveOutNotice(notice, auth.data.tenantScopeId);
    return ok(notice, "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not submit your move-out notice.",
      "network"
    );
  }
}

/** Demo-only status walkthrough for UI testing. */
export async function advanceMoveOutDemoStatus(
  notice: MoveOutNotice
): Promise<ServiceResult<MoveOutNotice>> {
  const forced = assertNotForcedError("advanceMoveOutDemoStatus");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  const order: MoveOutStatus[] = [
    "Submitted",
    "Under Review",
    "Acknowledged",
    "Inspection Scheduled",
    "Completed",
  ];
  const idx = order.indexOf(notice.status as (typeof order)[number]);
  const nextStatus =
    idx >= 0 && idx < order.length - 1 ? order[idx + 1] : notice.status;
  if (nextStatus === notice.status) {
    return ok(notice, "mock");
  }

  const now = new Date().toISOString();
  const next: MoveOutNotice = {
    ...notice,
    status: nextStatus,
    updatedAt: now,
    timeline: [
      ...notice.timeline,
      {
        id: crypto.randomUUID(),
        status: nextStatus,
        at: now,
        note: `Status updated to ${nextStatus} (demo).`,
      },
    ],
  };
  saveStoredMoveOutNotice(next, auth.data.tenantScopeId);
  return ok(next, "mock");
}

export async function clearMoveOutNotice(): Promise<
  ServiceResult<{ cleared: true }>
> {
  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  clearStoredMoveOutNotice(auth.data.tenantScopeId);
  return ok({ cleared: true }, "mock");
}

export function getMoveOutContextDemoFixture(): MoveOutContext {
  return emptyMoveOutContext("Tenant", "");
}

function emptyMoveOutContext(
  displayName: string,
  email: string
): MoveOutContext {
  return {
    leaseNumber: "—",
    propertyName: "—",
    unitNumber: "—",
    leaseEndDate: "",
    requiredNoticeDays: 0,
    noticeRequirementLabel:
      "No lease is linked to this tenant account yet.",
    todayIso: new Date().toISOString().slice(0, 10),
    tenantContactName: displayName,
    tenantContactPhone: "",
    tenantContactEmail: email,
    checklist: [],
  };
}
