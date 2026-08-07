import type { MoveOutNoticeRecord } from "@/lib/portal/move-out-types";
import { portalStorageKey } from "@/lib/portal/storage-key";

const STORAGE_BASE = "cpmc.portal.moveOutNotice.v1";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

export function loadStoredMoveOutNotice(
  tenantScopeId: string
): MoveOutNoticeRecord | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(
      portalStorageKey(STORAGE_BASE, tenantScopeId)
    );
    if (!raw) return null;
    return JSON.parse(raw) as MoveOutNoticeRecord;
  } catch {
    return null;
  }
}

export function saveStoredMoveOutNotice(
  notice: MoveOutNoticeRecord,
  tenantScopeId: string
) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(
    portalStorageKey(STORAGE_BASE, tenantScopeId),
    JSON.stringify(notice)
  );
}

export function clearStoredMoveOutNotice(tenantScopeId: string) {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(
    portalStorageKey(STORAGE_BASE, tenantScopeId)
  );
}
