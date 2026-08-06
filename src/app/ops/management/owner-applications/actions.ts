"use server";

import {
  createOwnerAccount,
  findOwner,
  readOwnerApplications,
  saveOwnerAccount,
  type OwnerApplication,
} from "@/lib/owner-auth";
import { generateTemporaryPassword, hashPassword } from "@/lib/owner-password";
import type { PropertyUnitRentSchedule } from "@/lib/fair-market-rent";
import {
  moveInTenantAtUnitRent,
  publishUnitRentSchedules,
} from "@/lib/unit-rent-pipeline";
import { createClient } from "@/lib/supabase/server";
import { COLLECTIONS, upsertSharedRecord } from "@/lib/shared-store";

/** Create or reset an owner account with a temporary password (hashed). */
export async function provisionOwnerTempPassword(input: {
  email: string;
  fullName: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { error: "Owner email is required." as const };
  }

  const temporaryPassword = generateTemporaryPassword();
  const existing = await findOwner(email);

  if (existing) {
    await saveOwnerAccount({
      ...existing,
      password: hashPassword(temporaryPassword),
      passwordReveal: temporaryPassword,
      fullName: input.fullName.trim() || existing.fullName,
      mustChangePassword: true,
    });
    return { ok: true as const, email, temporaryPassword };
  }

  const created = await createOwnerAccount({
    email,
    password: temporaryPassword,
    fullName: input.fullName.trim() || "Property Owner",
    mustChangePassword: true,
  });
  if ("error" in created) {
    return { error: created.error };
  }

  return { ok: true as const, email: created.email, temporaryPassword };
}

export async function publishOwnerAppUnitRents(input: {
  applicationId: string;
  schedules: PropertyUnitRentSchedule[];
}) {
  const apps = await readOwnerApplications();
  const application = apps.find((a) => a.id === input.applicationId);
  if (!application) {
    return { error: "Application not found." as const };
  }

  const result = await publishUnitRentSchedules({
    application,
    schedules: input.schedules,
  });
  if ("error" in result) {
    return { error: result.error };
  }

  const next: OwnerApplication = {
    ...application,
    unitRentSchedules: result.schedules,
    rentScheduleConfirmedAt: new Date().toISOString(),
    contractPropertyIds: result.propertyIds,
    mgmtStatus:
      application.mgmtStatus === "new" || !application.mgmtStatus
        ? "diligence"
        : application.mgmtStatus,
  };

  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApplications,
    next.id,
    next as unknown as Record<string, unknown>
  );

  return {
    ok: true as const,
    unitCount: result.unitCount,
    propertyIds: result.propertyIds,
    schedules: result.schedules,
  };
}

export async function approveTenantMoveIn(input: {
  applicationId: string;
  propertyId: string;
  unitId: string;
  tenantName: string;
  tenantEmail: string;
}) {
  const result = await moveInTenantAtUnitRent({
    propertyId: input.propertyId,
    unitId: input.unitId,
    tenantName: input.tenantName,
    tenantEmail: input.tenantEmail,
    applicationId: input.applicationId,
  });
  if ("error" in result) {
    return { error: result.error };
  }
  return {
    ok: true as const,
    monthlyRent: result.monthlyRent,
    receivableId: result.receivableId,
    unitLabel: result.unit.unit,
  };
}
