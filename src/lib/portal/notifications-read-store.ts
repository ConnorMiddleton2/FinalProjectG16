import { portalStorageKey } from "@/lib/portal/storage-key";

const STORAGE_BASE = "harborline.portal.notificationRead.v1";

/** Default unread set for first visit — mirrors announcements read pattern. */
const DEFAULT_UNREAD_IDS = [
  "notif-1",
  "notif-4",
  "notif-5",
  "notif-6",
  "notif-7",
];

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

function storageKey(tenantScopeId: string) {
  return portalStorageKey(STORAGE_BASE, tenantScopeId);
}

function readMap(tenantScopeId: string): Record<string, boolean> {
  if (!canUseStorage() || !tenantScopeId) return {};
  try {
    const raw = window.sessionStorage.getItem(storageKey(tenantScopeId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeMap(tenantScopeId: string, map: Record<string, boolean>) {
  if (!canUseStorage() || !tenantScopeId) return;
  window.sessionStorage.setItem(storageKey(tenantScopeId), JSON.stringify(map));
}

/** true = read; default unread list starts unread */
export function isNotificationRead(
  id: string,
  tenantScopeId: string
): boolean {
  const map = readMap(tenantScopeId);
  if (id in map) return map[id] === true;
  return !DEFAULT_UNREAD_IDS.includes(id);
}

export function markNotificationRead(id: string, tenantScopeId: string) {
  const map = readMap(tenantScopeId);
  map[id] = true;
  writeMap(tenantScopeId, map);
  notifyReadersChanged();
}

export function markNotificationUnread(id: string, tenantScopeId: string) {
  const map = readMap(tenantScopeId);
  map[id] = false;
  writeMap(tenantScopeId, map);
  notifyReadersChanged();
}

export function markAllNotificationsRead(
  ids: string[],
  tenantScopeId: string
) {
  const map = readMap(tenantScopeId);
  for (const id of ids) map[id] = true;
  writeMap(tenantScopeId, map);
  notifyReadersChanged();
}

function notifyReadersChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("harborline:notifications-changed"));
}

export function countUnreadNotifications(
  ids: string[],
  tenantScopeId: string
) {
  return ids.reduce(
    (sum, id) => sum + (isNotificationRead(id, tenantScopeId) ? 0 : 1),
    0
  );
}

export function notificationReadStoragePrefix() {
  return `${STORAGE_BASE}::`;
}
