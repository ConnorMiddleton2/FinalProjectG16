import { getMockConversations } from "@/lib/portal/messages-mock";
import type { PortalConversation } from "@/lib/portal/messages-types";
import { portalStorageKey } from "@/lib/portal/storage-key";

const STORAGE_BASE = "harborline.portal.messages.v1";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

export function loadStoredConversations(
  tenantScopeId: string
): PortalConversation[] | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(
      portalStorageKey(STORAGE_BASE, tenantScopeId)
    );
    if (!raw) return null;
    return JSON.parse(raw) as PortalConversation[];
  } catch {
    return null;
  }
}

export function saveStoredConversations(
  conversations: PortalConversation[],
  tenantScopeId: string
) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(
    portalStorageKey(STORAGE_BASE, tenantScopeId),
    JSON.stringify(conversations)
  );
}

export function getInitialConversations(
  tenantScopeId: string,
  includeDemoFixtures: boolean
): PortalConversation[] {
  const stored = loadStoredConversations(tenantScopeId);
  if (stored) return stored;
  return includeDemoFixtures ? getMockConversations() : [];
}
