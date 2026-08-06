/**
 * Rental application service.
 *
 * @backend GET/POST /api/portal/applications
 * @backend GET /api/portal/applications/:id
 */

import {
  readApplicantApplications,
  type ApplicantApplicationSummary,
} from "@/lib/applicant-profile";
import { MOCK_APPLICATIONS } from "@/lib/portal/mock/data";
import { PortalServiceError } from "@/lib/portal/mock/delay";
import type { Application, ApplicationStatus } from "@/lib/portal/models";
import {
  readRentalApplicationDraft,
  readSubmittedApplications,
} from "@/lib/rental-application";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

function mapSummaryStatus(
  status: ApplicantApplicationSummary["status"]
): ApplicationStatus {
  switch (status) {
    case "Draft":
      return "Draft";
    case "In review":
      return "Under Review";
    case "Approved":
      return "Approved";
    case "Declined":
      return "Denied";
    case "Withdrawn":
      return "Withdrawn";
    default:
      return "Submitted";
  }
}

function fromSummary(summary: ApplicantApplicationSummary): Application {
  return {
    id: summary.id,
    applicantId: "applicant-alex-demo",
    unitId: "",
    property: summary.property,
    floorPlan: summary.floorPlan,
    desiredMoveInDate: "",
    leaseTerm: "",
    status: mapSummaryStatus(summary.status),
    confirmationNumber: "",
    applicantFullName: "",
    email: "",
    phone: "",
    submittedAt: summary.submittedAt,
    updatedAt: summary.submittedAt,
    isDraft: summary.status === "Draft",
  };
}

function collectApplications(): Application[] {
  const fromSummaries = readApplicantApplications().map(fromSummary);
  const submissions = readSubmittedApplications().map((item) => {
    const match = MOCK_APPLICATIONS.find(
      (app) => app.id === item.applicationId
    );
    return {
      id: item.applicationId,
      applicantId: "applicant-alex-demo",
      unitId: match?.unitId ?? "",
      property: item.property,
      floorPlan: item.floorPlan,
      desiredMoveInDate: match?.desiredMoveInDate ?? "",
      leaseTerm: match?.leaseTerm ?? "",
      status: (match?.status ?? "Submitted") as ApplicationStatus,
      confirmationNumber: item.confirmationNumber,
      applicantFullName: item.applicantFullName,
      email: item.email,
      phone: match?.phone ?? "",
      submittedAt: item.submittedAt,
      updatedAt: item.submittedAt,
      isDraft: false,
    } satisfies Application;
  });

  const draft = readRentalApplicationDraft();
  const draftApp: Application | null = draft
    ? {
        id: draft.id,
        applicantId: "applicant-alex-demo",
        unitId: draft.unitId,
        property: draft.property,
        floorPlan: draft.floorPlan,
        desiredMoveInDate: draft.desiredMoveInDate,
        leaseTerm: draft.leaseTerm,
        status: "Draft",
        confirmationNumber: "",
        applicantFullName: draft.applicantFullName,
        email: draft.email,
        phone: draft.phone,
        submittedAt: "",
        updatedAt: new Date().toISOString(),
        isDraft: true,
      }
    : null;

  const byId = new Map<string, Application>();
  for (const item of MOCK_APPLICATIONS) byId.set(item.id, { ...item });
  for (const item of fromSummaries) byId.set(item.id, item);
  for (const item of submissions) byId.set(item.id, item);
  if (draftApp) byId.set(draftApp.id, draftApp);
  return Array.from(byId.values());
}

/** @backend GET /api/portal/applications */
export async function listApplications(): Promise<ServiceResult<Application[]>> {
  return runMockService(() => collectApplications(), {
    minMs: 160,
    maxMs: 420,
    failureRate: 0.03,
    failureMessage: "Could not load applications.",
  });
}

/** @backend GET /api/portal/applications/:id */
export async function getApplication(
  applicationId: string
): Promise<ServiceResult<Application>> {
  return runMockService(() => {
    const found = collectApplications().find((item) => item.id === applicationId);
    if (!found) {
      throw new PortalServiceError("Application not found.", "NOT_FOUND", 404);
    }
    return found;
  }, {
    minMs: 120,
    maxMs: 300,
    failureRate: 0.02,
    failureMessage: "Could not load application.",
  });
}
