import { portalStorageKey } from "@/lib/portal/storage-key";

const STORAGE_BASE = "cpmc.portal.announcementRead.v1";

/** Default unread set for first visit — a few items start unread. */
const DEFAULT_UNREAD_IDS = ["ann-1", "ann-4", "ann-8", "ann-5", "ann-13"];

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

/** true = read, false/missing with default unread list = unread */
export function isAnnouncementRead(
  id: string,
  tenantScopeId: string
): boolean {
  const map = readMap(tenantScopeId);
  if (id in map) return map[id] === true;
  return !DEFAULT_UNREAD_IDS.includes(id);
}

export function markAnnouncementRead(id: string, tenantScopeId: string) {
  const map = readMap(tenantScopeId);
  map[id] = true;
  writeMap(tenantScopeId, map);
}

export function markAnnouncementUnread(id: string, tenantScopeId: string) {
  const map = readMap(tenantScopeId);
  map[id] = false;
  writeMap(tenantScopeId, map);
}

export function markAllAnnouncementsRead(
  ids: string[],
  tenantScopeId: string
) {
  const map = readMap(tenantScopeId);
  for (const id of ids) map[id] = true;
  writeMap(tenantScopeId, map);
}
