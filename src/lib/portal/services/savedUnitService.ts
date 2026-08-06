/**
 * Saved units service.
 *
 * @backend GET/POST/DELETE /api/portal/saved-units
 */

import { DEMO_APPLICANT_ID } from "@/lib/portal/mock/data";
import type { SavedUnit } from "@/lib/portal/models";
import {
  readSavedUnitIds,
  writeSavedUnitIds,
} from "@/lib/saved-units";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

function idsToSavedUnits(ids: string[]): SavedUnit[] {
  const now = new Date().toISOString();
  return ids.map((unitId) => ({
    id: `saved-${unitId}`,
    unitId,
    applicantId: DEMO_APPLICANT_ID,
    savedAt: now,
  }));
}

/** @backend GET /api/portal/saved-units */
export async function listSavedUnits(): Promise<ServiceResult<SavedUnit[]>> {
  return runMockService(() => idsToSavedUnits(readSavedUnitIds()), {
    minMs: 80,
    maxMs: 220,
    failureRate: 0.02,
    failureMessage: "Could not load saved units.",
  });
}

/** @backend POST /api/portal/saved-units */
export async function saveUnit(
  unitId: string
): Promise<ServiceResult<SavedUnit[]>> {
  return runMockService(() => {
    const next = Array.from(new Set([...readSavedUnitIds(), unitId]));
    writeSavedUnitIds(next);
    return idsToSavedUnits(next);
  }, {
    minMs: 120,
    maxMs: 320,
    failureRate: 0.03,
    failureMessage: "Could not save this unit.",
  });
}

/** @backend DELETE /api/portal/saved-units/:unitId */
export async function unsaveUnit(
  unitId: string
): Promise<ServiceResult<SavedUnit[]>> {
  return runMockService(() => {
    const next = readSavedUnitIds().filter((id) => id !== unitId);
    writeSavedUnitIds(next);
    return idsToSavedUnits(next);
  }, {
    minMs: 120,
    maxMs: 320,
    failureRate: 0.03,
    failureMessage: "Could not remove this saved unit.",
  });
}

/** @backend PUT /api/portal/saved-units (toggle) */
export async function toggleSavedUnit(
  unitId: string
): Promise<ServiceResult<{ saved: boolean; items: SavedUnit[] }>> {
  return runMockService(() => {
    const current = readSavedUnitIds();
    const exists = current.includes(unitId);
    const next = exists
      ? current.filter((id) => id !== unitId)
      : [...current, unitId];
    writeSavedUnitIds(next);
    return { saved: !exists, items: idsToSavedUnits(next) };
  }, {
    minMs: 120,
    maxMs: 320,
    failureRate: 0.03,
    failureMessage: "Could not update saved units.",
  });
}
