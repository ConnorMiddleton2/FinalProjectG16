import { getMockMaintenanceRequests } from "@/lib/portal/maintenance-mock";
import {
  appendTenantUpdate,
  cancelMaintenanceRequest as cancelStored,
  createDetailFromSubmission,
  resolveMaintenanceDetail,
  upsertStoredMaintenanceDetail,
} from "@/lib/portal/maintenance-detail-store";
import type {
  MaintenanceFormValues,
  MaintenanceRequest,
  MaintenanceRequestDetail,
  MaintenanceSubmissionResult,
} from "@/lib/portal/models";
import {
  denyCrossTenant,
  sessionOwnsDemoFixtures,
} from "@/lib/portal/tenant-scope";
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

/**
 * Maintenance request service.
 *
 * BACKEND_TODO:
 *   GET    /api/tenant/maintenance
 *   GET    /api/tenant/maintenance/:id
 *   POST   /api/tenant/maintenance
 *   POST   /api/tenant/maintenance/:id/updates
 *   POST   /api/tenant/maintenance/:id/cancel
 */

export async function listMaintenanceRequests(): Promise<
  ServiceResult<MaintenanceRequest[]>
> {
  const forced = assertNotForcedError("listMaintenanceRequests");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    // BACKEND_TODO: live list for authenticated tenant only
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return ok([], "mock");
    }
    return ok(getMockMaintenanceRequests(), "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load maintenance requests.",
      "network"
    );
  }
}

export async function getMaintenanceRequest(
  id: string
): Promise<ServiceResult<MaintenanceRequestDetail | null>> {
  const forced = assertNotForcedError("getMaintenanceRequest");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(350);
    // BACKEND_TODO: live detail; enforce tenant ownership server-side
    if (!sessionOwnsDemoFixtures(auth.data)) {
      return denyCrossTenant();
    }
    const detail = resolveMaintenanceDetail(id);
    return ok(detail, "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load this maintenance request.",
      "network"
    );
  }
}

export async function createMaintenanceRequest(
  values: MaintenanceFormValues
): Promise<ServiceResult<MaintenanceSubmissionResult>> {
  const forced = assertNotForcedError("createMaintenanceRequest");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(900);
    // BACKEND_TODO: POST multipart/form or signed upload URLs for attachments
    const submittedAt = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const requestNumber = `MR-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `maint-${crypto.randomUUID().slice(0, 8)}`;
    const result: MaintenanceSubmissionResult = {
      id,
      requestNumber,
      submittedAt,
      values,
    };
    upsertStoredMaintenanceDetail(
      createDetailFromSubmission({ id, result })
    );
    return ok(result, "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not submit your maintenance request.",
      "network"
    );
  }
}

export async function addMaintenanceUpdate(
  id: string,
  message: string
): Promise<ServiceResult<MaintenanceRequestDetail>> {
  const forced = assertNotForcedError("addMaintenanceUpdate");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  if (!sessionOwnsDemoFixtures(auth.data)) {
    return denyCrossTenant();
  }

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const existing = resolveMaintenanceDetail(id);
    if (!existing) {
      return fail("Maintenance request not found.", "not_found");
    }
    const updated = appendTenantUpdate(existing, message);
    upsertStoredMaintenanceDetail(updated);
    return ok(updated, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not add your update.", "network");
  }
}

export async function cancelMaintenanceRequest(
  id: string
): Promise<ServiceResult<MaintenanceRequestDetail>> {
  const forced = assertNotForcedError("cancelMaintenanceRequest");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  if (!sessionOwnsDemoFixtures(auth.data)) {
    return denyCrossTenant();
  }

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    const existing = resolveMaintenanceDetail(id);
    if (!existing) {
      return fail("Maintenance request not found.", "not_found");
    }
    const updated = cancelStored(existing);
    upsertStoredMaintenanceDetail(updated);
    return ok(updated, "mock");
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not cancel this maintenance request.",
      "network"
    );
  }
}

export function getMaintenanceRequestsDemoFixture(): MaintenanceRequest[] {
  return getMockMaintenanceRequests();
}
