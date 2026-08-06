import { getMockAnnouncements } from "@/lib/portal/announcements-mock";
import {
  isAnnouncementRead,
  markAllAnnouncementsRead,
  markAnnouncementRead,
  markAnnouncementUnread,
} from "@/lib/portal/announcements-read-store";
import type { Announcement } from "@/lib/portal/models";
import { sessionOwnsDemoFixtures } from "@/lib/portal/tenant-scope";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

export type AnnouncementWithRead = Announcement & { read: boolean };

/**
 * Property announcements service.
 *
 * BACKEND_TODO:
 *   GET  /api/tenant/announcements
 *   POST /api/tenant/announcements/:id/read
 *   POST /api/tenant/announcements/read-all
 */

export async function listAnnouncements(): Promise<
  ServiceResult<AnnouncementWithRead[]>
> {
  const forced = assertNotForcedError("listAnnouncements");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    // BACKEND_TODO: property-scoped feed for session tenant membership
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok([], "mock");
    }
    const items = getMockAnnouncements().map((item) => ({
      ...item,
      read: isAnnouncementRead(item.id),
    }));
    return ok(items, "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load announcements.",
      "network"
    );
  }
}

export async function markAnnouncementAsRead(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  const forced = assertNotForcedError("markAnnouncementAsRead");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    markAnnouncementRead(id);
    return ok({ id }, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not mark announcement as read.");
  }
}

export async function markAnnouncementAsUnread(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  const forced = assertNotForcedError("markAnnouncementAsUnread");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    markAnnouncementUnread(id);
    return ok({ id }, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not mark announcement as unread.");
  }
}

export async function markAllAnnouncementsAsRead(
  ids: string[]
): Promise<ServiceResult<{ count: number }>> {
  const forced = assertNotForcedError("markAllAnnouncementsAsRead");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    markAllAnnouncementsRead(ids);
    return ok({ count: ids.length }, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not mark announcements as read.");
  }
}

export function getAnnouncementsDemoFixture(): Announcement[] {
  return getMockAnnouncements();
}
