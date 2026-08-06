const STORAGE_KEY = "harborline.portal.announcementRead.v1";

/** Default unread set for first visit — a few items start unread. */
const DEFAULT_UNREAD_IDS = ["ann-1", "ann-4", "ann-8", "ann-5"];

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

/** true = read, false/missing with default unread list = unread */
export function isAnnouncementRead(id: string): boolean {
  const map = readMap();
  if (id in map) return map[id] === true;
  return !DEFAULT_UNREAD_IDS.includes(id);
}

export function markAnnouncementRead(id: string) {
  const map = readMap();
  map[id] = true;
  writeMap(map);
}

export function markAnnouncementUnread(id: string) {
  const map = readMap();
  map[id] = false;
  writeMap(map);
}

export function markAllAnnouncementsRead(ids: string[]) {
  const map = readMap();
  for (const id of ids) map[id] = true;
  writeMap(map);
}
