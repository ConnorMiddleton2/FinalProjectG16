/**
 * Applicant screening service (consent + ID/income uploads).
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/screening
 *   POST /api/portal/future/screening/consent
 *   POST /api/portal/future/screening/documents
 *   POST /api/portal/future/screening/submit
 */

import type {
  ScreeningConsentInput,
  ScreeningPackage,
  ScreeningUploadInput,
} from "@/lib/portal/future/screening-types";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

const packagesByOwner = new Map<string, ScreeningPackage>();

function emptyPackage(ownerUserId: string): ScreeningPackage {
  const now = new Date().toISOString();
  return {
    ownerUserId,
    occupancyClass: "personal",
    status: "not_started",
    consentGiven: false,
    consentAt: null,
    idDocument: null,
    incomeDocument: null,
    notes: "Complete consent and uploads to start Harborline screening.",
    lastUpdatedAt: now,
  };
}

function ensure(ownerUserId: string): ScreeningPackage {
  if (!packagesByOwner.has(ownerUserId)) {
    packagesByOwner.set(ownerUserId, emptyPackage(ownerUserId));
  }
  return packagesByOwner.get(ownerUserId)!;
}

function clone(pkg: ScreeningPackage): ScreeningPackage {
  return {
    ...pkg,
    idDocument: pkg.idDocument ? { ...pkg.idDocument } : null,
    incomeDocument: pkg.incomeDocument ? { ...pkg.incomeDocument } : null,
  };
}

function recomputeStatus(pkg: ScreeningPackage): ScreeningPackage["status"] {
  if (pkg.status === "clear" || pkg.status === "failed") return pkg.status;
  if (
    pkg.consentGiven &&
    pkg.idDocument &&
    pkg.incomeDocument &&
    pkg.status === "submitted"
  ) {
    return "submitted";
  }
  if (pkg.consentGiven || pkg.idDocument || pkg.incomeDocument) {
    return "in_progress";
  }
  return "not_started";
}

export async function getScreeningPackage(
  ownerUserId: string
): Promise<ServiceResult<ScreeningPackage>> {
  const forced = assertNotForcedError("getScreeningPackage");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    return ok(clone(ensure(ownerUserId)), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load screening status.", "network");
  }
}

export async function saveScreeningConsent(
  ownerUserId: string,
  input: ScreeningConsentInput
): Promise<ServiceResult<ScreeningPackage>> {
  const forced = assertNotForcedError("saveScreeningConsent");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    if (!input.consentGiven) {
      return fail("You must consent to screening to continue.", "validation");
    }
    const current = ensure(ownerUserId);
    if (current.status === "clear" || current.status === "failed") {
      return fail("Screening is already finalized.", "conflict");
    }
    const now = new Date().toISOString();
    const next: ScreeningPackage = {
      ...current,
      occupancyClass: input.occupancyClass,
      consentGiven: true,
      consentAt: now,
      lastUpdatedAt: now,
      notes: "Consent recorded. Upload identification and income documents next.",
    };
    next.status = recomputeStatus(next);
    packagesByOwner.set(ownerUserId, next);
    return ok(clone(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not save screening consent.", "network");
  }
}

export async function uploadScreeningDocument(
  ownerUserId: string,
  input: ScreeningUploadInput
): Promise<ServiceResult<ScreeningPackage>> {
  const forced = assertNotForcedError("uploadScreeningDocument");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    if (!input.label.trim()) {
      return fail("Provide a document file name.", "validation");
    }
    const current = ensure(ownerUserId);
    if (!current.consentGiven) {
      return fail(
        "Record screening consent before uploading documents.",
        "validation"
      );
    }
    if (current.status === "clear" || current.status === "failed") {
      return fail("Screening is already finalized.", "conflict");
    }

    const doc = {
      id: `scr-doc-${crypto.randomUUID().slice(0, 8)}`,
      kind: input.kind,
      label: input.label.trim(),
      uploadedAt: new Date().toISOString(),
    };

    const next: ScreeningPackage = {
      ...current,
      lastUpdatedAt: doc.uploadedAt,
      notes:
        "Document uploaded. Submit when identification and income are both attached.",
    };
    if (input.kind === "government_id") next.idDocument = doc;
    else next.incomeDocument = doc;
    next.status = recomputeStatus(next);
    packagesByOwner.set(ownerUserId, next);
    return ok(clone(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not upload screening document.", "network");
  }
}

export async function submitScreening(
  ownerUserId: string
): Promise<ServiceResult<ScreeningPackage>> {
  const forced = assertNotForcedError("submitScreening");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    const current = ensure(ownerUserId);
    if (!current.consentGiven) {
      return fail("Consent is required before submitting.", "validation");
    }
    if (!current.idDocument || !current.incomeDocument) {
      return fail(
        "Upload both government identification and income proof before submitting.",
        "validation"
      );
    }
    if (current.status === "submitted" || current.status === "clear") {
      return ok(clone(current), "mock");
    }

    const now = new Date().toISOString();
    // Demo auto-clears after submit so the flow is fully usable.
    const next: ScreeningPackage = {
      ...current,
      status: "clear",
      lastUpdatedAt: now,
      notes:
        "Screening submitted and cleared in demo mode. Harborline leasing can proceed.",
    };
    packagesByOwner.set(ownerUserId, next);
    // BACKEND_TODO: hand off to screening vendor
    return ok(clone(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not submit screening.", "network");
  }
}
