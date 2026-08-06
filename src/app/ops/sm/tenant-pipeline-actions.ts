"use server";

import { requireOpsModule } from "@/lib/team-auth";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { SmTenantApplication } from "@/lib/sales-marketing";
import type { SharedPropertyTenant } from "@/lib/management-contract";
import {
  findTenantAccount,
  postTenantPortalMessage,
  saveTenantAccount,
  type TenantAccount,
} from "@/lib/tenant-portal-accounts";
import { approveTenantMoveIn } from "@/app/ops/management/owner-applications/actions";

async function loadApp(applicationId: string) {
  const client = await createClient();
  const apps = await listSharedRecords<SmTenantApplication>(
    client,
    COLLECTIONS.tenantApplications
  );
  return apps.find((a) => a.id === applicationId) ?? null;
}

async function saveApp(app: SmTenantApplication) {
  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantApplications,
    app.id,
    app as unknown as Record<string, unknown>
  );
}

async function resolveAccount(
  app: SmTenantApplication
): Promise<TenantAccount | null> {
  const accountId = (app as { tenantAccountId?: string }).tenantAccountId;
  if (accountId) {
    const client = await createClient();
    const accounts = await listSharedRecords<TenantAccount>(
      client,
      COLLECTIONS.tenantAccounts
    );
    const byId = accounts.find((a) => a.id === accountId);
    if (byId) return byId;
  }
  return findTenantAccount(app.email);
}

/** Push vacant unit options to the applicant’s portal inbox. */
export async function sendAvailabilityToApplicant(input: {
  applicationId: string;
  propertyId?: string;
  message?: string;
}) {
  await requireOpsModule("sales-marketing");
  const app = await loadApp(input.applicationId);
  if (!app) return { error: "Application not found." as const };

  const client = await createClient();
  const units = await listSharedRecords<SharedPropertyTenant>(
    client,
    COLLECTIONS.propertyTenants
  );
  const propertyId = input.propertyId || app.propertyId || "";
  const vacant = units.filter((u) => {
    const isVacant = u.status === "vacant" || !u.name?.trim();
    if (!isVacant) return false;
    if (propertyId) return u.propertyId === propertyId;
    const name = (app.building || app.property || "").toLowerCase();
    if (!name) return true;
    return u.propertyName.toLowerCase().includes(name.split("·")[0].trim());
  });

  const availability = vacant.map((u) => ({
    unitId: u.id,
    propertyId: u.propertyId,
    propertyName: u.propertyName,
    unit: u.unit,
    floorPlan: u.floorPlan,
    sqft: u.sqft,
    askingRent: Number(u.askingRent || u.monthlyRent || 0),
  }));

  const account = await resolveAccount(app);
  if (!account) {
    return {
      error:
        "No tenant portal account for this applicant. They must start an application online first." as const,
    };
  }

  await postTenantPortalMessage({
    tenantAccountId: account.id,
    tenantEmail: account.email,
    fromRole: "sales_marketing",
    subject: `Availability · ${app.building || app.property}`,
    body:
      input.message?.trim() ||
      `Here are currently available units for ${app.building || app.property}. Select the unit you prefer in your portal, or discuss options on your tour.`,
    relatedApplicationId: app.id,
    availabilityJson: JSON.stringify(availability),
  });

  const next: SmTenantApplication = {
    ...app,
    smStatus: app.smStatus === "new" ? "contacted" : app.smStatus,
    communicated: true,
    lastContactAt: new Date().toISOString(),
    lastContactMethod: "email",
    status: "In review",
  };
  await saveApp(next);

  return { ok: true as const, unitCount: availability.length };
}

/**
 * Confirm application for a unit → lease packet pending (not yet moved in).
 */
export async function offerLeaseForApplication(input: {
  applicationId: string;
  propertyId: string;
  unitId: string;
  tenantName: string;
  tenantEmail: string;
}) {
  await requireOpsModule("sales-marketing");
  const app = await loadApp(input.applicationId);
  if (!app) return { error: "Application not found." as const };

  const client = await createClient();
  const units = await listSharedRecords<SharedPropertyTenant>(
    client,
    COLLECTIONS.propertyTenants
  );
  const unit = units.find((u) => u.id === input.unitId);
  if (!unit) return { error: "Unit not found." as const };
  const rent = Number(unit.askingRent || unit.monthlyRent || 0);

  const account = await resolveAccount(app);
  if (account) {
    await saveTenantAccount({
      ...account,
      status: "pending_lease",
      propertyId: input.propertyId,
      propertyName: unit.propertyName,
      unit: unit.unit,
      updatedAt: new Date().toISOString(),
    });
    await postTenantPortalMessage({
      tenantAccountId: account.id,
      tenantEmail: account.email,
      fromRole: "sales_marketing",
      subject: "Lease packet ready to sign",
      body: `Your application for ${unit.propertyName} · ${unit.unit} (${rent.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}/mo) was confirmed by Sales & Marketing. Please review and sign the lease packet in your portal. Move-in is not complete until you sign and S&M approves the signed packet.`,
      relatedApplicationId: app.id,
      availabilityJson: "",
    });
  }

  const next = {
    ...app,
    propertyId: input.propertyId,
    unitId: input.unitId,
    unitLabel: unit.unit,
    building: unit.propertyName,
    property: `${unit.propertyName} · ${unit.unit}`,
    proposedRent: rent,
    smStatus: "approved" as const,
    status: "In review" as const,
    leasePacketStatus: "sent",
    leaseOfferedAt: new Date().toISOString(),
  };
  await saveApp(next as SmTenantApplication);

  return {
    ok: true as const,
    monthlyRent: rent,
    unitLabel: unit.unit,
  };
}

/** After tenant signed lease — S&M final approve → official move-in. */
export async function confirmSignedLeaseAndMoveIn(input: {
  applicationId: string;
}) {
  await requireOpsModule("sales-marketing");
  const app = await loadApp(input.applicationId);
  if (!app) return { error: "Application not found." as const };

  const leaseStatus = (app as { leasePacketStatus?: string }).leasePacketStatus;
  if (leaseStatus !== "signed") {
    return {
      error:
        "Tenant must sign the lease packet in their portal before final approval." as const,
    };
  }
  if (!app.propertyId || !app.unitId) {
    return { error: "Application is missing property/unit assignment." as const };
  }

  const result = await approveTenantMoveIn({
    applicationId: app.id,
    propertyId: app.propertyId,
    unitId: app.unitId,
    tenantName: app.name,
    tenantEmail: app.email,
  });
  if ("error" in result) return result;

  const account = await resolveAccount(app);
  if (account) {
    await saveTenantAccount({
      ...account,
      status: "active",
      propertyId: app.propertyId,
      propertyName: app.building || app.property,
      unit: result.unitLabel,
      tenantRecordId: account.tenantRecordId || app.id,
      updatedAt: new Date().toISOString(),
    });
  }

  await saveApp({
    ...app,
    smStatus: "approved",
    status: "In review",
    proposedRent: result.monthlyRent,
    unitLabel: result.unitLabel,
    movedInAt: new Date().toISOString(),
    leasePacketStatus: "approved",
  } as SmTenantApplication);

  return result;
}
