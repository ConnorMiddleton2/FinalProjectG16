const STORAGE_KEY = "harborline.portal.notificationRead.v1";

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

function readMap(): Record<string, boolean> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, boolean>) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** true = read; default unread list starts unread */
export function isNotificationRead(id: string): boolean {
  const map = readMap();
  if (id in map) return map[id] === true;
  return !DEFAULT_UNREAD_IDS.includes(id);
}

export function markNotificationRead(id: string) {
  const map = readMap();
  map[id] = true;
  writeMap(map);
  notifyReadersChanged();
}

export function markNotificationUnread(id: string) {
  const map = readMap();
  map[id] = false;
  writeMap(map);
  notifyReadersChanged();
}

export function markAllNotificationsRead(ids: string[]) {
  const map = readMap();
  for (const id of ids) map[id] = true;
  writeMap(map);
  notifyReadersChanged();
}

function notifyReadersChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("harborline:notifications-changed"));
}

export function countUnreadNotifications(ids: string[]) {
  return ids.reduce(
    (sum, id) => sum + (isNotificationRead(id) ? 0 : 1),
    0
  );
}
