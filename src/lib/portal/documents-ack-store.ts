import { portalStorageKey } from "@/lib/portal/storage-key";

const STORAGE_BASE = "harborline.portal.documentAck.v1";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

function readSet(tenantScopeId: string): Set<string> {
  if (!canUseStorage() || !tenantScopeId) return new Set();
  try {
    const raw = window.sessionStorage.getItem(
      portalStorageKey(STORAGE_BASE, tenantScopeId)
    );
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSet(tenantScopeId: string, ids: Set<string>) {
  if (!canUseStorage() || !tenantScopeId) return;
  window.sessionStorage.setItem(
    portalStorageKey(STORAGE_BASE, tenantScopeId),
    JSON.stringify([...ids])
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("harborline:document-ack-changed"));
  }
}

/** Whether this tenant has acknowledged a required document. */
export function isDocumentAcknowledged(
  documentId: string,
  tenantScopeId: string
): boolean {
  return readSet(tenantScopeId).has(documentId);
}

export function markDocumentAcknowledged(
  documentId: string,
  tenantScopeId: string
) {
  const set = readSet(tenantScopeId);
  set.add(documentId);
  writeSet(tenantScopeId, set);
}
