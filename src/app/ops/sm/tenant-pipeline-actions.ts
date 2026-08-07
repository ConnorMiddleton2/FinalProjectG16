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

/** Push 1–5 vacant unit options to the applicant’s portal inbox. */
export async function sendAvailabilityToApplicant(input: {
  applicationId: string;
  propertyId?: string;
  /** Explicit vacant unit roster ids to offer (required, 1–5). */
  unitIds: string[];
  message?: string;
}) {
  await requireOpsModule("sales-marketing");
  const app = await loadApp(input.applicationId);
  if (!app) return { error: "Application not found." as const };

  const requested = [
    ...new Set(
      (input.unitIds || []).map((id) => String(id || "").trim()).filter(Boolean)
    ),
  ];
  if (requested.length < 1 || requested.length > 5) {
    return {
      error: "Select between 1 and 5 vacant units to send." as const,
    };
  }

  const client = await createClient();
  const units = await listSharedRecords<SharedPropertyTenant>(
    client,
    COLLECTIONS.propertyTenants
  );
  const propertyId = input.propertyId || app.propertyId || "";
  const byId = new Map(units.map((u) => [u.id, u]));
  const selectedUnits: SharedPropertyTenant[] = [];
  for (const id of requested) {
    const u = byId.get(id);
    if (!u) {
      return { error: `Unit not found (${id}).` as const };
    }
    const isVacant = u.status === "vacant" || !u.name?.trim();
    if (!isVacant) {
      return {
        error: `${u.unit || "Unit"} is no longer vacant.` as const,
      };
    }
    if (propertyId && u.propertyId !== propertyId) {
      return {
        error: `${u.unit || "Unit"} is not on the application property.` as const,
      };
    }
    selectedUnits.push(u);
  }

  const availability = selectedUnits.map((u) => ({
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

  const propertyLabel =
    selectedUnits[0]?.propertyName || app.building || app.property;
  await postTenantPortalMessage({
    tenantAccountId: account.id,
    tenantEmail: account.email,
    fromRole: "sales_marketing",
    subject: `Availability · ${propertyLabel}`,
    body:
      input.message?.trim() ||
      `Sales & Marketing selected ${availability.length} available option${availability.length === 1 ? "" : "s"} at ${propertyLabel}. Choose exactly one unit in your portal to continue.`,
    relatedApplicationId: app.id,
    availabilityJson: JSON.stringify(availability),
  });

  const next: SmTenantApplication = {
    ...app,
    propertyId: propertyId || selectedUnits[0]?.propertyId || app.propertyId,
    availabilityOfferedUnitIds: selectedUnits.map((u) => u.id),
    availabilityOfferedAt: new Date().toISOString(),
    // Clear prior applicant pick so they must choose from this new offer
    unitSelectedFromAvailabilityAt: "",
    unitId: undefined,
    unitLabel: undefined,
    proposedRent: undefined,
    smStatus: app.smStatus === "new" ? "contacted" : app.smStatus,
    communicated: true,
    lastContactAt: new Date().toISOString(),
    lastContactMethod: "email",
    status: "In review",
  };
  await saveApp(next);

  return { ok: true as const, unitCount: availability.length };
}

/** Ask the applicant to complete an additional information form in their portal. */
export async function requestAdditionalApplicantForms(input: {
  applicationId: string;
  message?: string;
}) {
  await requireOpsModule("sales-marketing");
  const app = await loadApp(input.applicationId);
  if (!app) return { error: "Application not found." as const };

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
    subject: "Additional information requested",
    body:
      input.message?.trim() ||
      `Sales & Marketing needs a few more details to continue your application for ${app.building || app.property}. Please complete the follow-up form in your portal (employment update, references, preferred move-in, and any tour notes).`,
    relatedApplicationId: app.id,
    availabilityJson: JSON.stringify({
      type: "additional_forms",
      requestedAt: new Date().toISOString(),
    }),
  });

  await saveApp({
    ...app,
    documentsComplete: false,
    additionalFormsRequestedAt: new Date().toISOString(),
    smStatus: app.smStatus === "new" ? "contacted" : app.smStatus,
    communicated: true,
    lastContactAt: new Date().toISOString(),
    lastContactMethod: "email",
    status: "In review",
  } as SmTenantApplication);

  return { ok: true as const };
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

  const propertyName = app.building || app.property;
  const account = await resolveAccount(app);
  if (account) {
    await saveTenantAccount({
      ...account,
      status: "active",
      propertyId: app.propertyId,
      propertyName,
      unit: result.unitLabel,
      monthlyRent: result.monthlyRent,
      tenantRecordId: result.tenantId,
      updatedAt: new Date().toISOString(),
    });

    await postTenantPortalMessage({
      tenantAccountId: account.id,
      tenantEmail: account.email,
      fromRole: "sales_marketing",
      subject: "Lease approved — you are a current tenant",
      body: [
        `Welcome! Sales & Marketing approved your lease at ${propertyName}${result.unitLabel ? ` · ${result.unitLabel}` : ""}.`,
        result.monthlyRent
          ? `Monthly rent: $${Number(result.monthlyRent).toLocaleString()}/mo.`
          : "",
        "Your applicant checklist is complete. Open the tenant portal home for rent, maintenance, and lease tools for this building.",
      ]
        .filter(Boolean)
        .join("\n"),
      relatedApplicationId: app.id,
      availabilityJson: "",
    });
  }

  await saveApp({
    ...app,
    smStatus: "approved",
    status: "Completed",
    proposedRent: result.monthlyRent,
    unitLabel: result.unitLabel,
    movedInAt: new Date().toISOString(),
    leasePacketStatus: "approved",
  } as SmTenantApplication);

  return result;
}
