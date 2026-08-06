/**
 * Insurance / COI service for current tenants.
 *
 * BACKEND_TODO:
 *   GET  /api/tenant/insurance
 *   POST /api/tenant/insurance/coi
 */

import {
  getInsurancePoliciesForTenant,
  setInsurancePoliciesForTenant,
} from "@/lib/portal/insurance-store";
import type {
  InsurancePolicy,
  InsuranceUploadInput,
} from "@/lib/portal/insurance-types";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
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

export async function listInsurancePolicies(): Promise<
  ServiceResult<InsurancePolicy[]>
> {
  const forced = assertNotForcedError("listInsurancePolicies");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    return ok(getInsurancePoliciesForTenant(auth.data.tenantScopeId), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load insurance records.", "network");
  }
}

export async function uploadCertificateOfInsurance(
  input: InsuranceUploadInput
): Promise<ServiceResult<InsurancePolicy>> {
  const forced = assertNotForcedError("uploadCertificateOfInsurance");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);

    if (!input.carrier.trim() || !input.policyNumber.trim()) {
      return fail("Carrier and policy number are required.", "validation");
    }
    if (!input.expirationDate || !input.effectiveDate) {
      return fail("Effective and expiration dates are required.", "validation");
    }
    if (input.expirationDate <= input.effectiveDate) {
      return fail(
        "Expiration date must be after the effective date.",
        "validation"
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    let status: InsurancePolicy["status"] = "under_review";
    if (input.expirationDate < today) status = "expired";
    else if (input.expirationDate <= addDays(today, 45))
      status = "expiring_soon";
    else status = "valid";

    const policy: InsurancePolicy = {
      id: `ins-${crypto.randomUUID().slice(0, 8)}`,
      occupancyClass: input.occupancyClass,
      policyType: input.policyType.trim() || "Certificate of insurance",
      carrier: input.carrier.trim(),
      policyNumber: input.policyNumber.trim(),
      coverageAmount: input.coverageAmount.trim() || "See certificate",
      effectiveDate: input.effectiveDate,
      expirationDate: input.expirationDate,
      status,
      documentLabel:
        input.documentLabel.trim() ||
        `Certificate-${input.policyNumber.trim().replace(/\s+/g, "")}.pdf`,
      notes: "Uploaded by tenant — pending Harborline review (demo).",
    };

    const existing = getInsurancePoliciesForTenant(auth.data.tenantScopeId);
    // Replace a matching missing/expired slot of the same type when possible.
    const idx = existing.findIndex(
      (p) =>
        p.policyType.toLowerCase() === policy.policyType.toLowerCase() &&
        (p.status === "missing" || p.status === "expired")
    );
    const next =
      idx >= 0
        ? existing.map((p, i) => (i === idx ? policy : p))
        : [policy, ...existing];
    setInsurancePoliciesForTenant(auth.data.tenantScopeId, next);

    // BACKEND_TODO: persist COI file to storage + notify compliance
    return ok(policy, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not upload certificate.", "network");
  }
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
