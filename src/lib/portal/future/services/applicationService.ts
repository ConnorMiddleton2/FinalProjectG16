/**
 * Rental application draft / submit / withdraw service.
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/applications/current
 *   PUT  /api/portal/future/applications/draft
 *   POST /api/portal/future/applications/submit
 *   POST /api/portal/future/applications/:id/withdraw
 * Enforce ownerUserId from the authenticated session — never from the client alone.
 */

import {
  DEMO_FUTURE_OWNER_USER_ID,
  findUnitById,
  getSeedDemoApplication,
} from "@/lib/portal/future/mock-data";
import type {
  ApplicationWizardStep,
  RentalApplication,
} from "@/lib/portal/future/models";
import {
  assertNotForcedError,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

const applicationsByOwner = new Map<string, RentalApplication>();

function cloneApp(app: RentalApplication): RentalApplication {
  return structuredClone(app);
}

function getStored(ownerUserId: string): RentalApplication | undefined {
  return applicationsByOwner.get(ownerUserId);
}

/** Status-page demo seed only — never used by getDraft (keeps Apply editable). */
function ensureStatusSeed(ownerUserId: string): RentalApplication | null {
  const existing = getStored(ownerUserId);
  if (existing) return existing;
  if (ownerUserId === DEMO_FUTURE_OWNER_USER_ID) {
    const seeded = getSeedDemoApplication(ownerUserId);
    applicationsByOwner.set(ownerUserId, seeded);
    return seeded;
  }
  return null;
}

function emptyDraft(ownerUserId: string): RentalApplication {
  const now = new Date().toISOString();
  return {
    id: `app-${ownerUserId}-draft`,
    applicationNumber: "",
    ownerUserId,
    applicantName: "",
    propertyId: "",
    propertyName: "",
    unitId: "",
    unitLabel: "",
    status: "Draft",
    currentStep: "1",
    submittedAt: null,
    lastUpdatedAt: now,
    nextRequiredAction: "Continue your application.",
    confirmationNumber: null,
    coApplicants: [],
    documents: [],
    feePayment: null,
    draftPayload: {},
    certifiedAt: null,
  };
}

export async function getApplication(
  ownerUserId: string
): Promise<ServiceResult<RentalApplication | null>> {
  const forced = assertNotForcedError("getApplication");
  if (forced) return forced;

  try {
    await simulateLatency();
    if (!ownerUserId) {
      return fail("An owner user id is required.", "validation");
    }
    // BACKEND_TODO: fetch application where owner = auth.uid()
    const app = ensureStatusSeed(ownerUserId);
    return ok(app ? cloneApp(app) : null, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load your application.", "network");
  }
}

export async function getDraft(
  ownerUserId: string
): Promise<ServiceResult<RentalApplication>> {
  const forced = assertNotForcedError("getDraft");
  if (forced) return forced;

  try {
    await simulateLatency();
    if (!ownerUserId) {
      return fail("An owner user id is required.", "validation");
    }
    const existing = getStored(ownerUserId);
    if (existing) {
      return ok(cloneApp(existing), "mock");
    }
    // Always create an editable draft for Apply — do not seed Under Review here.
    const draft = emptyDraft(ownerUserId);
    applicationsByOwner.set(ownerUserId, draft);
    return ok(cloneApp(draft), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load your draft.", "network");
  }
}

export type SaveDraftInput = {
  ownerUserId: string;
  currentStep?: ApplicationWizardStep;
  unitId?: string;
  applicantName?: string;
  draftPayload?: Record<string, unknown>;
  coApplicants?: RentalApplication["coApplicants"];
  documents?: RentalApplication["documents"];
  feePayment?: RentalApplication["feePayment"];
};

export async function saveDraft(
  input: SaveDraftInput
): Promise<ServiceResult<RentalApplication>> {
  const forced = assertNotForcedError("saveDraft");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!input.ownerUserId) {
      return fail("An owner user id is required.", "validation");
    }

    const existing =
      getStored(input.ownerUserId) ?? emptyDraft(input.ownerUserId);

    const editableStatuses = new Set([
      "Draft",
      "Payment Pending",
      "Documents Required",
      "Additional Information Requested",
    ]);
    if (!editableStatuses.has(existing.status)) {
      return fail(
        "This application is locked and can no longer be edited as a draft.",
        "conflict"
      );
    }

    const now = new Date().toISOString();
    let propertyId = existing.propertyId;
    let propertyName = existing.propertyName;
    let unitId = existing.unitId;
    let unitLabel = existing.unitLabel;

    if (input.unitId) {
      const unit = findUnitById(input.unitId);
      if (!unit) {
        return fail("That unit could not be found.", "not_found");
      }
      unitId = unit.id;
      unitLabel = unit.unitLabel;
      propertyId = unit.propertyId;
      propertyName = unit.propertyName;
    }

    const next: RentalApplication = {
      ...existing,
      propertyId,
      propertyName,
      unitId,
      unitLabel,
      applicantName: input.applicantName ?? existing.applicantName,
      currentStep: input.currentStep ?? existing.currentStep,
      draftPayload: input.draftPayload ?? existing.draftPayload,
      coApplicants: input.coApplicants ?? existing.coApplicants,
      documents: input.documents ?? existing.documents,
      feePayment: input.feePayment ?? existing.feePayment,
      lastUpdatedAt: now,
      status: existing.status === "Draft" ? "Draft" : existing.status,
      nextRequiredAction:
        existing.status === "Draft"
          ? "Continue your application."
          : existing.nextRequiredAction,
    };

    applicationsByOwner.set(input.ownerUserId, next);
    // BACKEND_TODO: upsert draft server-side; never log sensitive draft fields
    return ok(cloneApp(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not save your draft.", "network");
  }
}

export async function submitApplication(
  ownerUserId: string
): Promise<ServiceResult<RentalApplication>> {
  const forced = assertNotForcedError("submitApplication");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const existing = getStored(ownerUserId);
    if (!existing) {
      return fail("No application draft found to submit.", "not_found");
    }
    if (existing.status !== "Draft" && existing.status !== "Payment Pending") {
      return fail("This application has already been submitted.", "conflict");
    }
    if (!existing.unitId) {
      return fail("Select a unit before submitting.", "validation");
    }

    const now = new Date().toISOString();
    const confirmationNumber = `CONF-HL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const next: RentalApplication = {
      ...existing,
      status: "Submitted",
      currentStep: "16",
      submittedAt: now,
      lastUpdatedAt: now,
      confirmationNumber,
      applicationNumber:
        existing.applicationNumber ||
        `HL-APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      certifiedAt: existing.certifiedAt ?? now,
      nextRequiredAction:
        "Harborline has received your application and will begin review shortly.",
    };

    applicationsByOwner.set(ownerUserId, next);
    // BACKEND_TODO: submit to leasing CRM + trigger screening workflow
    return ok(cloneApp(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not submit your application.", "network");
  }
}

export async function withdrawApplication(
  ownerUserId: string
): Promise<ServiceResult<RentalApplication>> {
  const forced = assertNotForcedError("withdrawApplication");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const existing = getStored(ownerUserId) ?? ensureStatusSeed(ownerUserId);
    if (!existing) {
      return fail("No application found to withdraw.", "not_found");
    }
    if (
      existing.status === "Withdrawn" ||
      existing.status === "Lease Accepted" ||
      existing.status === "Denied"
    ) {
      return fail("This application cannot be withdrawn.", "conflict");
    }

    const now = new Date().toISOString();
    const next: RentalApplication = {
      ...existing,
      status: "Withdrawn",
      lastUpdatedAt: now,
      nextRequiredAction: "Application withdrawn. Contact leasing if you need help.",
    };
    applicationsByOwner.set(ownerUserId, next);
    // BACKEND_TODO: mark withdrawn in backend; notify leasing
    return ok(cloneApp(next), "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not withdraw your application.",
      "network"
    );
  }
}
