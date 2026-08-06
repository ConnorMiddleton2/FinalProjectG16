/**
 * Move-in onboarding checklist service.
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/onboarding/tasks
 *   POST /api/portal/future/onboarding/tasks/:id/toggle
 * When all required tasks complete + lease start confirmed, coordinate role
 * transition to the current-tenant portal (do not mutate current-tenant pages here).
 */

import { getMockMoveInTasks } from "@/lib/portal/future/mock-data";
import type { MoveInTask, MoveInTaskId } from "@/lib/portal/future/models";
import {
  assertNotForcedError,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

const tasksByOwner = new Map<string, MoveInTask[]>();

function getOwnerTasks(ownerUserId: string): MoveInTask[] {
  if (!tasksByOwner.has(ownerUserId)) {
    tasksByOwner.set(
      ownerUserId,
      getMockMoveInTasks(ownerUserId).map((t) => ({ ...t }))
    );
  }
  return tasksByOwner.get(ownerUserId)!;
}

export async function getTasks(
  ownerUserId: string
): Promise<ServiceResult<MoveInTask[]>> {
  const forced = assertNotForcedError("getTasks");
  if (forced) return forced;

  try {
    await simulateLatency();
    if (!ownerUserId) {
      return fail("An owner user id is required.", "validation");
    }
    // BACKEND_TODO: load checklist for authenticated approved applicant only
    return ok(
      getOwnerTasks(ownerUserId).filter((t) => t.ownerUserId === ownerUserId),
      "mock"
    );
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load move-in tasks.",
      "network"
    );
  }
}

export async function toggleTask(
  ownerUserId: string,
  taskId: MoveInTaskId,
  complete?: boolean
): Promise<ServiceResult<MoveInTask[]>> {
  const forced = assertNotForcedError("toggleTask");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const tasks = getOwnerTasks(ownerUserId);
    const current = tasks.find(
      (t) => t.id === taskId && t.ownerUserId === ownerUserId
    );
    if (!current) {
      return fail("That task could not be found.", "not_found");
    }

    const nextComplete =
      typeof complete === "boolean" ? complete : !current.complete;
    const next = tasks.map((t) =>
      t.id === taskId ? { ...t, complete: nextComplete } : t
    );
    tasksByOwner.set(ownerUserId, next);
    // BACKEND_TODO: persist completion; gate role conversion on required tasks
    return ok(next, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not update that task.", "network");
  }
}
