import { portalStorageKey } from "@/lib/portal/storage-key";
import {
  buildDefaultFutureOnboarding,
  recomputeFutureOnboarding,
} from "@/lib/portal/future-tenant-mock";
import type { FutureTenantOnboarding } from "@/lib/portal/future-tenant-types";

const STORAGE_BASE = "harborline.portal.futureOnboarding.v1";

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

export function loadFutureOnboarding(
  ownerUserId: string
): FutureTenantOnboarding | null {
  if (!canUseStorage() || !ownerUserId) return null;
  try {
    const raw = window.sessionStorage.getItem(
      portalStorageKey(STORAGE_BASE, ownerUserId)
    );
    if (!raw) return null;
    return JSON.parse(raw) as FutureTenantOnboarding;
  } catch {
    return null;
  }
}

export function saveFutureOnboarding(data: FutureTenantOnboarding) {
  if (!canUseStorage()) return;
  const next = recomputeFutureOnboarding(data);
  window.sessionStorage.setItem(
    portalStorageKey(STORAGE_BASE, next.ownerUserId),
    JSON.stringify(next)
  );
  window.dispatchEvent(new Event("harborline:future-onboarding-changed"));
  return next;
}

export function getOrCreateFutureOnboarding(input: {
  ownerUserId: string;
  ownerEmail: string;
  displayName: string;
  propertyLabel: string;
  unit: string;
  invitationCode: string;
}): FutureTenantOnboarding {
  const existing = loadFutureOnboarding(input.ownerUserId);
  if (existing) {
    return recomputeFutureOnboarding(existing);
  }
  const created = buildDefaultFutureOnboarding(input);
  saveFutureOnboarding(created);
  return created;
}

export function markFutureTenantConverted(ownerUserId: string) {
  const existing = loadFutureOnboarding(ownerUserId);
  if (!existing) return null;
  const next = saveFutureOnboarding({
    ...existing,
    lifecycle: "current",
  });
  return next;
}
