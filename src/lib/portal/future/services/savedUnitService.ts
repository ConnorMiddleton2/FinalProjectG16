/**
 * Saved units (works signed-out via sessionStorage).
 *
 * Storage key: harborline.portal.futureSavedUnits.v1
 *
 * BACKEND_TODO:
 *   When authenticated, sync saved units to the applicant account.
 *   GET/PUT /api/portal/future/saved-units
 */

import { findUnitById } from "@/lib/portal/future/mock-data";
import type { AvailableUnit, SavedUnit } from "@/lib/portal/future/models";
import {
  assertNotForcedError,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

export const FUTURE_SAVED_UNITS_STORAGE_KEY =
  "harborline.portal.futureSavedUnits.v1";

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

function readSaved(): SavedUnit[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(FUTURE_SAVED_UNITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedUnit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSaved(items: SavedUnit[]): void {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(
    FUTURE_SAVED_UNITS_STORAGE_KEY,
    JSON.stringify(items)
  );
  window.dispatchEvent(new Event("harborline:future-saved-units-changed"));
}

export type SavedUnitWithDetails = SavedUnit & {
  unit: AvailableUnit | null;
};

export async function getSavedUnits(): Promise<
  ServiceResult<SavedUnitWithDetails[]>
> {
  const forced = assertNotForcedError("getSavedUnits");
  if (forced) return forced;

  try {
    await simulateLatency(250);
    const saved = readSaved();
    const enriched = saved.map((item) => ({
      ...item,
      unit: findUnitById(item.unitId) ?? null,
    }));
    return ok(enriched, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load saved units.", "network");
  }
}

export async function saveUnit(
  unitId: string
): Promise<ServiceResult<SavedUnit[]>> {
  const forced = assertNotForcedError("saveUnit");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!findUnitById(unitId)) {
      return fail("That unit could not be found.", "not_found");
    }
    const existing = readSaved();
    if (existing.some((item) => item.unitId === unitId)) {
      return ok(existing, "mock");
    }
    const next: SavedUnit[] = [
      { unitId, savedAt: new Date().toISOString() },
      ...existing,
    ];
    writeSaved(next);
    // BACKEND_TODO: persist to applicant profile when signed in
    return ok(next, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not save that unit.", "network");
  }
}

export async function removeSavedUnit(
  unitId: string
): Promise<ServiceResult<SavedUnit[]>> {
  const forced = assertNotForcedError("removeSavedUnit");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const next = readSaved().filter((item) => item.unitId !== unitId);
    writeSaved(next);
    // BACKEND_TODO: delete remote saved-unit row when signed in
    return ok(next, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not remove that saved unit.", "network");
  }
}

export function getSavedUnitIdsSync(): string[] {
  return readSaved().map((item) => item.unitId);
}
