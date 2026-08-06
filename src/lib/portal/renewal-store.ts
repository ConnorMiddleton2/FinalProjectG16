import type { RenewalRequestRecord } from "@/lib/portal/renewal-types";
import { portalStorageKey } from "@/lib/portal/storage-key";

const STORAGE_BASE = "harborline.portal.renewalRequest.v1";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

export function loadStoredRenewalRequest(
  tenantScopeId: string
): RenewalRequestRecord | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(
      portalStorageKey(STORAGE_BASE, tenantScopeId)
    );
    if (!raw) return null;
    return JSON.parse(raw) as RenewalRequestRecord;
  } catch {
    return null;
  }
}

export function saveStoredRenewalRequest(
  request: RenewalRequestRecord,
  tenantScopeId: string
) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(
    portalStorageKey(STORAGE_BASE, tenantScopeId),
    JSON.stringify(request)
  );
}

export function clearStoredRenewalRequest(tenantScopeId: string) {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(
    portalStorageKey(STORAGE_BASE, tenantScopeId)
  );
}
