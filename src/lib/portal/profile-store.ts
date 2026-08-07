import type { TenantProfile } from "@/lib/portal/profile-types";
import { portalStorageKey } from "@/lib/portal/storage-key";

const STORAGE_BASE = "cpmc.portal.tenantProfile.v1";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

export function loadStoredProfile(tenantScopeId: string): TenantProfile | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(
      portalStorageKey(STORAGE_BASE, tenantScopeId)
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TenantProfile>;
    if (!parsed.legalName || !parsed.tenantId) return null;
    return {
      ...parsed,
      occupancyClass: parsed.occupancyClass ?? "personal",
      propertyType: parsed.propertyType ?? "other",
    } as TenantProfile;
  } catch {
    return null;
  }
}

export function saveStoredProfile(
  profile: TenantProfile,
  tenantScopeId: string
) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(
    portalStorageKey(STORAGE_BASE, tenantScopeId),
    JSON.stringify(profile)
  );
}
