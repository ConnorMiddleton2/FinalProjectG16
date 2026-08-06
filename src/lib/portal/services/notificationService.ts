import { getMockPortalNotifications } from "@/lib/portal/notifications-mock";
import {
  countUnreadNotifications,
  isNotificationRead,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/lib/portal/notifications-read-store";
import type { Notification, PortalNotificationWithRead } from "@/lib/portal/models";
import { sessionOwnsDemoFixtures } from "@/lib/portal/tenant-scope";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

/**
 * In-portal notification center service.
 * Does not send email, SMS, or push.
 *
 * BACKEND_TODO:
 *   GET  /api/tenant/notifications
 *   POST /api/tenant/notifications/:id/read
 *   POST /api/tenant/notifications/read-all
 */

export async function listNotifications(): Promise<
  ServiceResult<PortalNotificationWithRead[]>
> {
  const forced = assertNotForcedError("listNotifications");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(350);
    // BACKEND_TODO: live in-app notifications for auth.uid() only
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok([], "mock");
    }
    const scopeId = auth.data.tenantScopeId;
    const items = getMockPortalNotifications()
      .map((item) => ({
        ...item,
        read: isNotificationRead(item.id, scopeId),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return ok(items, "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load notifications.",
      "network"
    );
  }
}

export async function getUnreadNotificationCount(): Promise<
  ServiceResult<number>
> {
  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  try {
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok(0, "mock");
    }
    const ids = getMockPortalNotifications().map((n) => n.id);
    return ok(
      countUnreadNotifications(ids, auth.data.tenantScopeId),
      "mock"
    );
  } catch (err) {
    return failFromUnknown(err, "Could not load unread count.");
  }
}

export async function markNotificationAsRead(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  markNotificationRead(id, auth.data.tenantScopeId);
  return ok({ id }, "mock");
}

export async function markNotificationAsUnread(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  markNotificationUnread(id, auth.data.tenantScopeId);
  return ok({ id }, "mock");
}

export async function markAllNotificationsAsRead(
  ids: string[]
): Promise<ServiceResult<{ count: number }>> {
  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  markAllNotificationsRead(ids, auth.data.tenantScopeId);
  return ok({ count: ids.length }, "mock");
}

export function getNotificationsDemoFixture(): Notification[] {
  return getMockPortalNotifications();
}
