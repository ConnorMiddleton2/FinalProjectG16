/**
 * Applicant profile service.
 *
 * @backend GET/PUT /api/portal/applicants/me
 * Persist via auth-linked applicant records; stop using localStorage.
 */

import {
  emptyApplicantProfile,
  readApplicantProfile,
  writeApplicantProfile,
  type ApplicantProfile,
} from "@/lib/applicant-profile";
import { DEMO_APPLICANT_ID, MOCK_APPLICANT } from "@/lib/portal/mock/data";
import type { Applicant } from "@/lib/portal/models";
import {
  runMockService,
  unwrapServiceResult,
  type ServiceResult,
} from "@/lib/portal/services/types";

function fromProfile(profile: ApplicantProfile): Applicant {
  const hasContent = Boolean(profile.fullName || profile.email || profile.phone);
  if (!hasContent) return { ...MOCK_APPLICANT };

  return {
    id: DEMO_APPLICANT_ID,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    preferredContact: profile.preferredContact,
    streetAddress: profile.streetAddress,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
    desiredMoveInDate: profile.desiredMoveInDate,
    preferredProperty: profile.preferredProperty,
    preferredUnitType: profile.preferredUnitType,
    updatedAt: profile.updatedAt || new Date().toISOString(),
  };
}

function toProfile(applicant: Applicant): ApplicantProfile {
  return {
    fullName: applicant.fullName,
    email: applicant.email,
    phone: applicant.phone,
    preferredContact: applicant.preferredContact,
    streetAddress: applicant.streetAddress,
    city: applicant.city,
    state: applicant.state,
    zip: applicant.zip,
    desiredMoveInDate: applicant.desiredMoveInDate,
    preferredProperty: applicant.preferredProperty,
    preferredUnitType:
      (applicant.preferredUnitType as ApplicantProfile["preferredUnitType"]) ||
      "",
    updatedAt: applicant.updatedAt || new Date().toISOString(),
  };
}

/** @backend GET /api/portal/applicants/me */
export async function getApplicant(): Promise<ServiceResult<Applicant>> {
  return runMockService(() => fromProfile(readApplicantProfile()), {
    minMs: 120,
    maxMs: 320,
    failureRate: 0.02,
    failureMessage: "Could not load applicant profile.",
  });
}

/** @backend PUT /api/portal/applicants/me */
export async function updateApplicant(
  patch: Partial<Omit<Applicant, "id">>
): Promise<ServiceResult<Applicant>> {
  return runMockService(() => {
    const current = fromProfile(readApplicantProfile());
    const next: Applicant = {
      ...current,
      ...patch,
      id: DEMO_APPLICANT_ID,
      updatedAt: new Date().toISOString(),
    };
    writeApplicantProfile(toProfile(next));
    return next;
  }, {
    minMs: 200,
    maxMs: 480,
    failureRate: 0.04,
    failureMessage: "Could not save applicant profile.",
  });
}

/** Convenience helper that throws on failure. */
export async function requireApplicant(): Promise<Applicant> {
  return unwrapServiceResult(await getApplicant());
}

export function createEmptyApplicant(): Applicant {
  return fromProfile(emptyApplicantProfile());
}
