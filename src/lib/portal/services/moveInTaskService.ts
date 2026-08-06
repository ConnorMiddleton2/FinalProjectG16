/**
 * Move-in task service.
 *
 * @backend GET /api/portal/move-in/tasks
 * @backend PATCH /api/portal/move-in/tasks/:id
 * Do not modify Current Tenant Portal implementation from this service.
 */

import { MOCK_MOVE_IN_TASKS } from "@/lib/portal/mock/data";
import { PortalServiceError } from "@/lib/portal/mock/delay";
import type { MoveInTask, MoveInTaskId } from "@/lib/portal/models";
import {
  readMoveInOnboarding,
  toggleMoveInTask,
  writeMoveInOnboarding,
} from "@/lib/move-in-onboarding";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

function fromOnboarding(): MoveInTask[] {
  const onboarding = readMoveInOnboarding();
  return onboarding.tasks.map((task) => ({
    id: task.id,
    onboardingId: onboarding.id,
    title: task.title,
    description: task.description,
    deadline: task.deadline,
    requiredDocuments: task.requiredDocuments.map((document) => ({
      ...document,
    })),
    status: task.status,
    completedAt: task.completedAt,
    helpHref: task.helpHref,
    helpLabel: task.helpLabel,
  }));
}

function collectTasks(): MoveInTask[] {
  try {
    const fromStore = fromOnboarding();
    if (fromStore.length > 0) return fromStore;
  } catch {
    // Fall through to mock catalog.
  }
  return MOCK_MOVE_IN_TASKS.map((task) => ({
    ...task,
    requiredDocuments: task.requiredDocuments.map((document) => ({
      ...document,
    })),
  }));
}

/** @backend GET /api/portal/move-in/tasks */
export async function listMoveInTasks(): Promise<ServiceResult<MoveInTask[]>> {
  return runMockService(() => collectTasks(), {
    minMs: 140,
    maxMs: 360,
    failureRate: 0.03,
    failureMessage: "Could not load move-in tasks.",
  });
}

/** @backend GET /api/portal/move-in/tasks/:id */
export async function getMoveInTask(
  taskId: MoveInTaskId
): Promise<ServiceResult<MoveInTask>> {
  return runMockService(() => {
    const task = collectTasks().find((item) => item.id === taskId);
    if (!task) {
      throw new PortalServiceError("Move-in task not found.", "NOT_FOUND", 404);
    }
    return task;
  }, {
    minMs: 100,
    maxMs: 260,
    failureRate: 0.02,
    failureMessage: "Could not load move-in task.",
  });
}

/** @backend PATCH /api/portal/move-in/tasks/:id */
export async function setMoveInTaskCompleted(
  taskId: MoveInTaskId,
  completed: boolean
): Promise<ServiceResult<MoveInTask>> {
  return runMockService(() => {
    const onboarding = readMoveInOnboarding();
    const next = toggleMoveInTask(onboarding, taskId, completed);
    writeMoveInOnboarding(next);
    const task = next.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new PortalServiceError("Move-in task not found.", "NOT_FOUND", 404);
    }
    return {
      id: task.id,
      onboardingId: next.id,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      requiredDocuments: task.requiredDocuments.map((document) => ({
        ...document,
      })),
      status: task.status,
      completedAt: task.completedAt,
      helpHref: task.helpHref,
      helpLabel: task.helpLabel,
    };
  }, {
    minMs: 160,
    maxMs: 400,
    failureRate: 0.04,
    failureMessage: "Could not update move-in task.",
  });
}
