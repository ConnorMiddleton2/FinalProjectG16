"use server";

import {
  createOwnerAccount,
  findOwner,
  getOwnerApplicationById,
  readOwnerApplications,
  saveOwnerAccount,
  type OwnerApplication,
} from "@/lib/owner-auth";
import { generateTemporaryPassword, hashPassword } from "@/lib/owner-password";
import type { PropertyUnitRentSchedule } from "@/lib/fair-market-rent";
import {
  moveInTenantAtUnitRent,
  onboardExistingTenantsFromApplication,
  publishUnitRentSchedules,
} from "@/lib/unit-rent-pipeline";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  deleteSharedRecord,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import {
  linkOwnerAccountToProperties,
  provisionPropertiesFromApplication,
} from "@/lib/owner-properties";
import {
  draftManagementAgreement,
  type OwnerContract,
} from "@/lib/management";
import { requireOpsModule } from "@/lib/team-auth";

/** Keep a single OwnerContract per application; delete extras. */
async function dedupeContractsForApplication(
  applicationId: string,
  preferredId?: string
): Promise<OwnerContract | null> {
  const client = await createClient();
  const all = await listSharedRecords<OwnerContract>(
    client,
    COLLECTIONS.ownerContracts
  );
  const matches = all.filter((c) => c.relatedApplicationId === applicationId);
  if (matches.length === 0) return null;

  const keep =
    matches.find((c) => c.id === preferredId) ||
    matches.find((c) => c.status === "fully_executed") ||
    matches.find((c) => c.status === "signed_by_owner") ||
    matches.find((c) => Boolean(c.sentAt)) ||
    [...matches].sort((a, b) =>
      (b.sentAt || b.createdAt).localeCompare(a.sentAt || a.createdAt)
    )[0];

  for (const dup of matches) {
    if (dup.id !== keep.id) {
      await deleteSharedRecord(client, COLLECTIONS.ownerContracts, dup.id);
    }
  }
  return keep;
}

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
    return { ok: true as const, email, temporaryPassword, account: existing };
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

  return {
    ok: true as const,
    email: created.email,
    temporaryPassword,
    account: created.account,
  };
}

/**
 * Manager signs & sends agreement once: provision managed properties, set
 * application to awaiting_signature, and post a single OwnerContract.
 */
export async function sendOwnerApplicationContractAction(input: {
  applicationId: string;
  managerSigner: string;
}) {
  await requireOpsModule("management");
  const signer = input.managerSigner.trim();
  if (!signer) {
    return { error: "Enter the manager signer name." as const };
  }

  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) return { error: "Application not found." as const };
  if (app.status === "approved" || app.status === "declined") {
    return { error: "This application is already closed." as const };
  }

  const alreadySent =
    Boolean(app.contractSentAt) ||
    Boolean(app.contractId) ||
    app.status === "awaiting_signature" ||
    app.mgmtStatus === "contract_sent" ||
    app.mgmtStatus === "owner_signed" ||
    app.mgmtStatus === "account_provisioned";

  const client = await createClient();
  const allContracts = await listSharedRecords<OwnerContract>(
    client,
    COLLECTIONS.ownerContracts
  );
  const forThisApp = allContracts.filter(
    (c) =>
      c.relatedApplicationId === app.id ||
      (app.contractId != null && c.id === app.contractId)
  );

  if (alreadySent || forThisApp.some((c) => Boolean(c.sentAt))) {
    await dedupeContractsForApplication(app.id, app.contractId);
    return {
      error:
        "Agreement already sent to the owner. It can only be sent once." as const,
    };
  }

  const terms = {
    feePercent: app.proposedFeePercent?.trim() || undefined,
    feeStructure: "percent_collections" as const,
    ownerApprovalThreshold: undefined as string | undefined,
  };

  let propertyIds = app.contractPropertyIds ?? [];
  if (propertyIds.length === 0) {
    const provisioned = await provisionPropertiesFromApplication(app, {
      terms,
    });
    propertyIds = provisioned.map((p) => p.id);
  }

  // One agreement per application — reuse any leftover row, delete extras
  const keep = await dedupeContractsForApplication(app.id, app.contractId);

  const body = draftManagementAgreement(app);
  const contractId = keep?.id || crypto.randomUUID();
  const propertyName =
    app.properties[0]?.propertyName ||
    app.properties[0]?.location ||
    app.companyName ||
    "Owner asset";
  const now = new Date().toISOString();

  const contract: OwnerContract = {
    id: contractId,
    ownerName: app.fullName,
    ownerEmail: app.email,
    propertyName,
    documentTitle: "Exclusive Property Management Agreement",
    body,
    status: "pending_owner_signature",
    createdAt: keep?.createdAt || now,
    sentAt: now,
    cpmcSignedAt: now,
    cpmcSignedBy: signer,
    relatedApplicationId: app.id,
  };

  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerContracts,
    contract.id,
    contract as unknown as Record<string, unknown>
  );

  const updated: OwnerApplication = {
    ...app,
    status: "awaiting_signature",
    reviewerDecision: "awaiting_signature",
    draftContract: body,
    contractId,
    contractSentAt: now,
    contractPropertyIds: propertyIds,
    mgmtStatus: "contract_sent",
    reviewedAt: now,
    reviewedBy: signer,
    accountMessage: `CPMC has signed and sent your Property Management Agreement (${new Date().toLocaleString()}). Open your application or Contracts to review and sign.`,
  };

  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApplications,
    updated.id,
    updated as unknown as Record<string, unknown>
  );

  return {
    ok: true as const,
    application: updated,
    contract,
    propertyCount: propertyIds.length,
  };
}

/**
 * After owner signs: mark application approved, link assets to owner account,
 * fully execute contract, and issue temp password if needed.
 */
export async function completeOwnerApplicationAfterSignature(input: {
  applicationId: string;
  contractId?: string;
  signatureName: string;
  email: string;
}) {
  const email = input.email.trim().toLowerCase();
  const signatureName = input.signatureName.trim();
  if (!email || signatureName.length < 2) {
    return { error: "Email and signature name are required." as const };
  }

  const app = await getOwnerApplicationById(input.applicationId);
  if (!app || app.email.toLowerCase() !== email) {
    return { error: "Application not found for that email." as const };
  }

  const preferredContractId = input.contractId || app.contractId;
  const kept = await dedupeContractsForApplication(
    app.id,
    preferredContractId
  );

  const client = await createClient();
  const contract =
    kept ||
    (preferredContractId
      ? (
          await listSharedRecords<OwnerContract>(
            client,
            COLLECTIONS.ownerContracts
          )
        ).find((c) => c.id === preferredContractId)
      : null);

  const signedAt = new Date().toISOString();

  // Ensure properties exist
  let propertyIds = app.contractPropertyIds ?? [];
  if (propertyIds.length === 0) {
    const provisioned = await provisionPropertiesFromApplication(app, {
      terms: {
        feePercent: app.proposedFeePercent?.trim() || undefined,
        feeStructure: "percent_collections",
      },
    });
    propertyIds = provisioned.map((p) => p.id);
  }

  let account = await findOwner(email);
  let temporaryPassword: string | undefined;
  if (!account) {
    temporaryPassword = generateTemporaryPassword();
    const created = await createOwnerAccount({
      email,
      password: temporaryPassword,
      fullName: app.fullName,
      mustChangePassword: true,
    });
    if ("error" in created) {
      return { error: created.error };
    }
    account = created.account;
  }

  await linkOwnerAccountToProperties(propertyIds, account, {
    signedAt,
    signatureName,
  });

  // Bring existing occupants onto the management tenant roster + AR
  const onboarded = await onboardExistingTenantsFromApplication({
    application: { ...app, contractPropertyIds: propertyIds },
    propertyIds,
  });

  if (contract) {
    await upsertSharedRecord(
      client,
      COLLECTIONS.ownerContracts,
      contract.id,
      {
        ...contract,
        status: "fully_executed",
        ownerSignedAt: signedAt,
        ownerSignatureName: signatureName,
      } as unknown as Record<string, unknown>
    );
  }

  const updated: OwnerApplication = {
    ...app,
    status: "approved",
    reviewerDecision: "approved",
    ownerSignedAt: signedAt,
    ownerSignatureName: signatureName,
    contractPropertyIds: propertyIds,
    mgmtStatus: "account_provisioned",
    credentialsIssuedAt: temporaryPassword ? signedAt : app.credentialsIssuedAt,
    loginRevealPassword: temporaryPassword || app.loginRevealPassword,
    accountMessage: temporaryPassword
      ? `Agreement signed ${new Date(signedAt).toLocaleString()}. Your assets are under CPMC management (${onboarded.tenantCount} tenants onboarded). Use the temporary password from CPMC to sign in at /owners if you do not already have access.`
      : `Agreement signed ${new Date(signedAt).toLocaleString()}. Your assets now appear on your owner dashboard (${onboarded.tenantCount} tenants onboarded for management).`,
  };

  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApplications,
    updated.id,
    updated as unknown as Record<string, unknown>
  );

  return {
    ok: true as const,
    application: updated,
    temporaryPassword,
    propertyCount: propertyIds.length,
    tenantsOnboarded: onboarded.tenantCount,
  };
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
    tenantId: result.tenantId,
    unitLabel: result.unit.unit,
  };
}

/** Remove duplicate agreements for an application (management UI). */
export async function dedupeOwnerApplicationContractsAction(input: {
  applicationId: string;
  preferredContractId?: string;
}) {
  await requireOpsModule("management");
  const kept = await dedupeContractsForApplication(
    input.applicationId,
    input.preferredContractId
  );
  return { ok: true as const, contract: kept };
}

/** Finish provisioning after owner already signed (legacy button). */
export async function finalizeOwnerApplicationAction(input: {
  applicationId: string;
  email: string;
  fullName: string;
}) {
  await requireOpsModule("management");
  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) return { error: "Application not found." as const };

  const result = await completeOwnerApplicationAfterSignature({
    applicationId: input.applicationId,
    contractId: app.contractId,
    signatureName: app.ownerSignatureName || input.fullName,
    email: input.email,
  });
  return result;
}
