/**
 * Future-tenant in-portal notifications (no email/SMS/push).
 *
 * Types: tour_confirmed, tour_changed, application_submitted, document_requested,
 * application_status_updated, new_message, lease_offer_available,
 * offer_deadline_approaching, move_in_task_due.
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/notifications
 *   POST /api/portal/future/notifications/:id/read
 *   POST /api/portal/future/notifications/read-all
 */

import { getMockFutureNotifications } from "@/lib/portal/future/mock-data";
import type { FutureNotification } from "@/lib/portal/future/models";
import {
  assertNotForcedError,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

const notificationsByOwner = new Map<string, FutureNotification[]>();

function getOwnerNotifications(ownerUserId: string): FutureNotification[] {
  if (!notificationsByOwner.has(ownerUserId)) {
    notificationsByOwner.set(
      ownerUserId,
      getMockFutureNotifications(ownerUserId).map((n) => ({ ...n }))
    );
  }
  return notificationsByOwner.get(ownerUserId)!;
}

export async function list(
  ownerUserId: string
): Promise<ServiceResult<FutureNotification[]>> {
  const forced = assertNotForcedError("listFutureNotifications");
  if (forced) return forced;

  try {
    await simulateLatency(350);
    if (!ownerUserId) {
      return fail("An owner user id is required.", "validation");
    }
    // BACKEND_TODO: list notifications for auth.uid() only
    const items = getOwnerNotifications(ownerUserId)
      .filter((n) => n.ownerUserId === ownerUserId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return ok(items, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load notifications.", "network");
  }
}

export async function markRead(
  ownerUserId: string,
  id: string
): Promise<ServiceResult<{ id: string }>> {
  const forced = assertNotForcedError("markFutureNotificationRead");
  if (forced) return forced;

  try {
    const items = getOwnerNotifications(ownerUserId);
    const found = items.find(
      (n) => n.id === id && n.ownerUserId === ownerUserId
    );
    if (!found) {
      return fail("That notification could not be found.", "not_found");
    }
    notificationsByOwner.set(
      ownerUserId,
      items.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    // BACKEND_TODO: persist read state server-side
    return ok({ id }, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not update notification.");
  }
}

export async function markAllRead(
  ownerUserId: string
): Promise<ServiceResult<{ count: number }>> {
  const forced = assertNotForcedError("markAllFutureNotificationsRead");
  if (forced) return forced;

  try {
    const items = getOwnerNotifications(ownerUserId);
    let count = 0;
    const next = items.map((n) => {
      if (n.ownerUserId !== ownerUserId) return n;
      if (!n.read) count += 1;
      return { ...n, read: true };
    });
    notificationsByOwner.set(ownerUserId, next);
    // BACKEND_TODO: mark-all-read RPC for applicant inbox
    return ok({ count }, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not mark notifications as read.");
  }
}
