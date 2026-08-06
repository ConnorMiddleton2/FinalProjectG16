/**
 * Co-applicant and occupant party service.
 *
 * @backend GET /api/portal/applications/:id/parties
 * Never return invitee private sections to the primary applicant UI.
 */

import {
  MOCK_CO_APPLICANTS,
  MOCK_OCCUPANTS,
} from "@/lib/portal/mock/data";
import type { CoApplicant, Occupant } from "@/lib/portal/models";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

export type ApplicationParties = {
  coApplicants: CoApplicant[];
  occupants: Occupant[];
};

/** @backend GET /api/portal/applications/:applicationId/parties */
export async function listApplicationParties(
  applicationId: string
): Promise<ServiceResult<ApplicationParties>> {
  return runMockService(() => {
    return {
      coApplicants: MOCK_CO_APPLICANTS.filter(
        (item) => item.applicationId === applicationId
      ).map((item) => ({ ...item })),
      occupants: MOCK_OCCUPANTS.filter(
        (item) => item.applicationId === applicationId
      ).map((item) => ({ ...item })),
    };
  }, {
    minMs: 140,
    maxMs: 360,
    failureRate: 0.03,
    failureMessage: "Could not load co-applicants and occupants.",
  });
}

/** @backend GET /api/portal/applications/:applicationId/co-applicants */
export async function listCoApplicants(
  applicationId: string
): Promise<ServiceResult<CoApplicant[]>> {
  const parties = await listApplicationParties(applicationId);
  if (!parties.ok) return parties;
  return { ok: true, data: parties.data.coApplicants };
}

/** @backend GET /api/portal/applications/:applicationId/occupants */
export async function listOccupants(
  applicationId: string
): Promise<ServiceResult<Occupant[]>> {
  const parties = await listApplicationParties(applicationId);
  if (!parties.ok) return parties;
  return { ok: true, data: parties.data.occupants };
}
