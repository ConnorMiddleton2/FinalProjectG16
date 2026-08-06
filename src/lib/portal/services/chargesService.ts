/**
 * Additional lease charges service (utilities, CAM, parking, fees).
 *
 * BACKEND_TODO:
 *   GET  /api/tenant/charges
 *   POST /api/tenant/charges/:id/pay
 */

import {
  getChargesForTenant,
  setChargesForTenant,
} from "@/lib/portal/charges-store";
import type { AdditionalCharge } from "@/lib/portal/charges-types";
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

export async function listAdditionalCharges(): Promise<
  ServiceResult<AdditionalCharge[]>
> {
  const forced = assertNotForcedError("listAdditionalCharges");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    const charges = getChargesForTenant(auth.data.tenantScopeId).sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate)
    );
    return ok(charges, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load additional charges.", "network");
  }
}

export async function payAdditionalCharge(
  chargeId: string
): Promise<ServiceResult<AdditionalCharge>> {
  const forced = assertNotForcedError("payAdditionalCharge");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const charges = getChargesForTenant(auth.data.tenantScopeId);
    const current = charges.find((c) => c.id === chargeId);
    if (!current) {
      return fail("That charge could not be found.", "not_found");
    }
    if (current.status === "paid") {
      return fail("That charge is already paid.", "conflict");
    }
    const updated: AdditionalCharge = { ...current, status: "paid" };
    setChargesForTenant(
      auth.data.tenantScopeId,
      charges.map((c) => (c.id === chargeId ? updated : c))
    );
    // BACKEND_TODO: create ledger payment + receipt
    return ok(updated, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not pay that charge.", "network");
  }
}
