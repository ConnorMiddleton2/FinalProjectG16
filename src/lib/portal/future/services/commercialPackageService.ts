/**
 * Commercial leasing package service (use clause, TI, guarantor, sales reporting).
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/commercial-package
 *   PUT  /api/portal/future/commercial-package
 *   POST /api/portal/future/commercial-package/submit
 *   POST /api/portal/future/commercial-package/sales-report
 */

import type {
  CommercialPackage,
  SaveCommercialPackageInput,
} from "@/lib/portal/future/commercial-package-types";
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

const packagesByOwner = new Map<string, CommercialPackage>();

function emptyPackage(ownerUserId: string): CommercialPackage {
  const now = new Date().toISOString();
  return {
    ownerUserId,
    status: "draft",
    businessName: "",
    dbaName: "",
    naicsCode: "",
    useClause: "",
    exclusiveUse: "",
    tiAllowanceLabel: "$25 per square foot (demo seed)",
    tiNotes: "",
    tiRequestedAmount: "",
    guarantorRequired: true,
    guarantor: {
      fullName: "",
      email: "",
      phone: "",
      relationship: "Principal / owner",
      guaranteedAmountLabel: "",
    },
    salesReportingRequired: true,
    salesReportingFrequency: "monthly",
    percentageRentRate: "6%",
    salesBreakpointLabel: "$450,000 annual",
    lastSalesReportPeriod: "",
    lastSalesReportAmount: "",
    notes: "",
    lastUpdatedAt: now,
    submittedAt: null,
  };
}

function ensure(ownerUserId: string): CommercialPackage {
  if (!packagesByOwner.has(ownerUserId)) {
    packagesByOwner.set(ownerUserId, emptyPackage(ownerUserId));
  }
  return packagesByOwner.get(ownerUserId)!;
}

function clone(pkg: CommercialPackage): CommercialPackage {
  return {
    ...pkg,
    guarantor: { ...pkg.guarantor },
  };
}

export async function getCommercialPackage(
  ownerUserId: string
): Promise<ServiceResult<CommercialPackage>> {
  const forced = assertNotForcedError("getCommercialPackage");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    return ok(clone(ensure(ownerUserId)), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load the commercial package.", "network");
  }
}

export async function saveCommercialPackage(
  ownerUserId: string,
  input: SaveCommercialPackageInput
): Promise<ServiceResult<CommercialPackage>> {
  const forced = assertNotForcedError("saveCommercialPackage");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    if (!input.businessName.trim()) {
      return fail("Business name is required.", "validation");
    }
    if (!input.useClause.trim()) {
      return fail("Permitted use / use clause is required.", "validation");
    }
    if (input.guarantorRequired) {
      if (!input.guarantor.fullName.trim() || !input.guarantor.email.trim()) {
        return fail(
          "Guarantor name and email are required when a guarantor is required.",
          "validation"
        );
      }
    }
    if (
      input.salesReportingRequired &&
      input.salesReportingFrequency === "not_required"
    ) {
      return fail(
        "Choose a sales reporting frequency, or turn sales reporting off.",
        "validation"
      );
    }

    const current = ensure(ownerUserId);
    if (current.status === "accepted") {
      return fail("An accepted commercial package can no longer be edited.", "conflict");
    }

    const now = new Date().toISOString();
    const editingAfterSubmit =
      current.status === "submitted" ||
      current.status === "under_review" ||
      current.status === "needs_revision";

    const next: CommercialPackage = {
      ...current,
      ...input,
      guarantor: { ...input.guarantor },
      ownerUserId,
      status: editingAfterSubmit ? "needs_revision" : "draft",
      submittedAt: editingAfterSubmit ? null : current.submittedAt,
      lastUpdatedAt: now,
    };

    packagesByOwner.set(ownerUserId, next);
    return ok(clone(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not save the commercial package.", "network");
  }
}

export async function submitCommercialPackage(
  ownerUserId: string
): Promise<ServiceResult<CommercialPackage>> {
  const forced = assertNotForcedError("submitCommercialPackage");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    const current = ensure(ownerUserId);
    if (!current.businessName.trim() || !current.useClause.trim()) {
      return fail(
        "Save a business name and use clause before submitting.",
        "validation"
      );
    }
    if (
      current.guarantorRequired &&
      (!current.guarantor.fullName.trim() || !current.guarantor.email.trim())
    ) {
      return fail("Complete guarantor details before submitting.", "validation");
    }
    if (current.status === "accepted") {
      return ok(clone(current), "mock");
    }

    const now = new Date().toISOString();
    // Demo auto-moves to under_review so the flow is usable end-to-end.
    const next: CommercialPackage = {
      ...current,
      status: "under_review",
      submittedAt: now,
      lastUpdatedAt: now,
    };
    packagesByOwner.set(ownerUserId, next);
    // BACKEND_TODO: notify commercial leasing
    return ok(clone(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not submit the commercial package.", "network");
  }
}

export async function recordSalesReport(
  ownerUserId: string,
  input: { periodLabel: string; amountLabel: string }
): Promise<ServiceResult<CommercialPackage>> {
  const forced = assertNotForcedError("recordSalesReport");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!ownerUserId) {
      return fail("An applicant session is required.", "validation");
    }
    if (!input.periodLabel.trim() || !input.amountLabel.trim()) {
      return fail("Sales period and amount are required.", "validation");
    }
    const current = ensure(ownerUserId);
    if (!current.salesReportingRequired) {
      return fail("Sales reporting is not required for this package.", "conflict");
    }

    const now = new Date().toISOString();
    const next: CommercialPackage = {
      ...current,
      lastSalesReportPeriod: input.periodLabel.trim(),
      lastSalesReportAmount: input.amountLabel.trim(),
      lastUpdatedAt: now,
    };
    packagesByOwner.set(ownerUserId, next);
    // BACKEND_TODO: create percentage-rent charge when over breakpoint
    return ok(clone(next), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not record the sales report.", "network");
  }
}
