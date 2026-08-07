import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  deleteSharedRecord,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import {
  generateTemporaryPassword,
  hashPassword,
  isHashedPassword,
  verifyPassword,
} from "@/lib/owner-password";
import {
  getManagedPropertiesByIds,
  linkOwnerAccountToProperties,
  provisionPropertiesFromApplication,
  type ContractTermsInput,
} from "@/lib/owner-properties";
import { onboardExistingTenantsFromApplication } from "@/lib/unit-rent-pipeline";
import { buildAgreementSections } from "@/lib/owner-contracts";
import {
  normalizeOwnerApplicationProperty,
  propertyHasMinimumDetail,
  propertyLocationLabel,
  type OwnerApplicationProperty,
} from "@/lib/owner-application-intake";
import type { PropertyUnitRentSchedule } from "@/lib/fair-market-rent";
import { cookies } from "next/headers";

export type { OwnerApplicationProperty } from "@/lib/owner-application-intake";
export { propertyLocationLabel, propertySfLabel } from "@/lib/owner-application-intake";

export const OWNER_COOKIE = "cpmc_owner";

export type OwnerAccount = {
  id: string;
  email: string;
  /** scrypt hash (salt:hash) or legacy plaintext during migration */
  password: string;
  /**
   * Plaintext copy for Management support (demo / class project).
   * Cleared when the owner changes their password themselves.
   */
  passwordReveal?: string;
  fullName: string;
  createdAt: string;
  mustChangePassword?: boolean;
  phone?: string;
  companyName?: string;
  notes?: string;
};

export type OwnerApplicationStatus =
  | "pending"
  | "approved"
  | "declined"
  | "needs_info"
  | "awaiting_signature";

export type OwnerApplication = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  /** Legal entity type (LLC, LP, Corp, Individual, etc.). */
  entityType?: string;
  mailingAddress?: string;
  taxIdOrEin?: string;
  preferredContactMethod?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  communicationPreference?: string;
  /** Checklist notes: deed, W-9, COI, rent roll, leases, etc. */
  documentsReadyNotes?: string;
  ownershipProofAvailable?: boolean;
  rentRollAvailable?: boolean;
  leasesAvailable?: boolean;
  insuranceDocsAvailable?: boolean;
  bankingReady?: boolean;
  properties: OwnerApplicationProperty[];
  message: string;
  status: OwnerApplicationStatus;
  createdAt: string;
  /** Management outreach / diligence (optional, filled by ops). */
  mgmtStatus?:
    | "new"
    | "contacted"
    | "meeting_requested"
    | "inspection_scheduled"
    | "diligence"
    | "contract_drafted"
    | "contract_sent"
    | "owner_signed"
    | "account_provisioned"
    | "closed";
  communicated?: boolean;
  lastContactAt?: string;
  lastContactMethod?: "call" | "text" | "email";
  accountMessage?: string;
  meetingRequestSentAt?: string;
  inspected?: boolean;
  inspectionDate?: string;
  inspectionDocuments?: string[];
  assetDetails?: string;
  metWithOwner?: boolean;
  meetingsCount?: number;
  ownerDesiredTerms?: string;
  negotiationTerms?: string;
  paymentTerms?: string;
  meetingMinutesFiles?: string[];
  meetingMinutesNotes?: string;
  inspectionNotes?: string;
  marketResearch?: string;
  proposedFeePercent?: string;
  proposedTermYears?: string;
  exclusiveManagement?: boolean;
  draftContract?: string;
  contractSentAt?: string;
  contractId?: string;
  tempPasswordIssuedAt?: string;
  /** Staff review audit */
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  reviewerDecision?: OwnerApplicationStatus;
  /** Provisioned managed_properties ids sent for owner signature */
  contractPropertyIds?: string[];
  ownerSignedAt?: string;
  ownerSignatureName?: string;
  /** Plaintext temp password for Check Application Status until password change */
  loginRevealPassword?: string;
  credentialsIssuedAt?: string;
  /** Fair-market unit rent schedules built after inspection. */
  unitRentSchedules?: PropertyUnitRentSchedule[];
  rentScheduleConfirmedAt?: string;
};

export type AgreementSectionSummary = {
  title: string;
  paragraphs: string[];
};

export type ApplicationContractSummary = {
  propertyId: string;
  propertyName: string;
  sections: AgreementSectionSummary[];
};

export type ApplicationStatusSummary = {
  id: string;
  status: OwnerApplicationStatus;
  fullName: string;
  companyName: string;
  createdAt: string;
  reviewNotes: string;
  reviewedAt: string;
  propertyCount: number;
  contracts?: ApplicationContractSummary[];
  temporaryPassword?: string;
  ownerEmail?: string;
  signedAt?: string;
  mgmtStatus?: string;
  contractSent?: boolean;
  accountMessage?: string;
};

const SEED_OWNERS: OwnerAccount[] = [
  {
    id: "00000000-0000-4000-8000-0000000000b0",
    email: "bobowner@building.com",
    password: hashPassword("12345"),
    passwordReveal: "12345",
    fullName: "Bob Owner",
    createdAt: new Date().toISOString(),
    mustChangePassword: false,
  },
];

async function ensureSeedOwners() {
  const client = await createClient();
  const owners = await listSharedRecords<OwnerAccount>(
    client,
    COLLECTIONS.ownerAccounts
  );
  const bob = owners.find(
    (o) => o.email.toLowerCase() === "bobowner@building.com"
  );
  if (!bob) {
    for (const owner of SEED_OWNERS) {
      await upsertSharedRecord(
        client,
        COLLECTIONS.ownerAccounts,
        owner.id,
        owner as unknown as Record<string, unknown>
      );
    }
    return;
  }

  // Migrate legacy plaintext seed password to hash when still "12345"
  if (!isHashedPassword(bob.password) && bob.password === "12345") {
    const updated = {
      ...bob,
      password: hashPassword("12345"),
      passwordReveal: bob.passwordReveal || "12345",
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.ownerAccounts,
      bob.id,
      updated as unknown as Record<string, unknown>
    );
  } else if (!bob.passwordReveal) {
    const updated = { ...bob, passwordReveal: "12345" };
    await upsertSharedRecord(
      client,
      COLLECTIONS.ownerAccounts,
      bob.id,
      updated as unknown as Record<string, unknown>
    );
  }
}

export async function readOwners(): Promise<OwnerAccount[]> {
  await ensureSeedOwners();
  const client = await createClient();
  return listSharedRecords<OwnerAccount>(client, COLLECTIONS.ownerAccounts);
}

export async function readOwnerApplications(): Promise<OwnerApplication[]> {
  const client = await createClient();
  return listSharedRecords<OwnerApplication>(
    client,
    COLLECTIONS.ownerApplications
  );
}

export async function findOwner(email: string) {
  const owners = await readOwners();
  return (
    owners.find((o) => o.email.toLowerCase() === email.trim().toLowerCase()) ??
    null
  );
}

export async function saveOwnerAccount(account: OwnerAccount) {
  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerAccounts,
    account.id,
    account as unknown as Record<string, unknown>
  );
}

export async function deleteOwnerAccount(ownerId: string) {
  const client = await createClient();
  await deleteSharedRecord(client, COLLECTIONS.ownerAccounts, ownerId);
}

export async function createOwnerAccount(input: {
  email: string;
  password: string;
  fullName: string;
  mustChangePassword?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await findOwner(email);
  if (existing) {
    return { error: "An account with that email already exists." as const };
  }
  if (!email || !input.password) {
    return { error: "Email and password are required." as const };
  }
  if (input.password.trim().length < 8) {
    return { error: "Password must be at least 8 characters." as const };
  }

  const account: OwnerAccount = {
    id: crypto.randomUUID(),
    email,
    password: hashPassword(input.password.trim()),
    passwordReveal: input.password.trim(),
    fullName: input.fullName.trim() || "Property Owner",
    createdAt: new Date().toISOString(),
    mustChangePassword: input.mustChangePassword ?? true,
  };

  await saveOwnerAccount(account);
  return { ok: true as const, email, account };
}

/** Self-serve signup from the owner portal (email + password). */
export async function registerOwnerAccount(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  return createOwnerAccount({
    ...input,
    mustChangePassword: false,
  });
}

export async function submitOwnerApplication(input: {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  entityType?: string;
  mailingAddress?: string;
  taxIdOrEin?: string;
  preferredContactMethod?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  communicationPreference?: string;
  documentsReadyNotes?: string;
  ownershipProofAvailable?: boolean;
  rentRollAvailable?: boolean;
  leasesAvailable?: boolean;
  insuranceDocsAvailable?: boolean;
  bankingReady?: boolean;
  properties: Array<Partial<OwnerApplicationProperty> & Record<string, unknown>>;
  message: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!input.fullName.trim() || !email) {
    return { error: "Name and email are required." as const };
  }

  const properties = input.properties
    .map((p) => normalizeOwnerApplicationProperty(p))
    .filter(propertyHasMinimumDetail);

  if (properties.length === 0) {
    return {
      error:
        "Add at least one commercial property with a name or street address." as const,
    };
  }

  const missingAddress = properties.some(
    (p) => !p.streetAddress.trim() && !p.location?.trim()
  );
  if (missingAddress) {
    return {
      error: "Each property needs a street address (or full location)." as const,
    };
  }

  const missingType = properties.some((p) => !p.category);
  if (missingType) {
    return {
      error: "Select a commercial property type for each asset." as const,
    };
  }

  const apps = await readOwnerApplications();
  // Owners may submit multiple applications (additional assets over time).
  void apps;

  const application: OwnerApplication = {
    id: crypto.randomUUID(),
    fullName: input.fullName.trim(),
    email,
    phone: input.phone.trim(),
    companyName: input.companyName.trim(),
    entityType: (input.entityType ?? "").trim(),
    mailingAddress: (input.mailingAddress ?? "").trim(),
    taxIdOrEin: (input.taxIdOrEin ?? "").trim(),
    preferredContactMethod: (input.preferredContactMethod ?? "").trim(),
    emergencyContactName: (input.emergencyContactName ?? "").trim(),
    emergencyContactPhone: (input.emergencyContactPhone ?? "").trim(),
    communicationPreference: (input.communicationPreference ?? "").trim(),
    documentsReadyNotes: (input.documentsReadyNotes ?? "").trim(),
    ownershipProofAvailable: Boolean(input.ownershipProofAvailable),
    rentRollAvailable: Boolean(input.rentRollAvailable),
    leasesAvailable: Boolean(input.leasesAvailable),
    insuranceDocsAvailable: Boolean(input.insuranceDocsAvailable),
    bankingReady: Boolean(input.bankingReady),
    properties,
    message: input.message.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
    mgmtStatus: "new",
  };

  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApplications,
    application.id,
    application as unknown as Record<string, unknown>
  );
  return { ok: true as const, application };
}

/** Public status lookup — returns only the caller's application by email (+ optional id). */
export async function lookupOwnerApplications(input: {
  email: string;
  applicationId?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { error: "Email is required." as const };
  }

  const apps = await readOwnerApplications();
  let matches = apps.filter((a) => a.email === email);

  if (input.applicationId?.trim()) {
    matches = matches.filter((a) => a.id === input.applicationId!.trim());
  }

  // Newest first
  matches.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const applications: ApplicationStatusSummary[] = [];
  for (const a of matches) {
    const summary: ApplicationStatusSummary = {
      id: a.id,
      status: a.status,
      fullName: a.fullName,
      companyName: a.companyName,
      createdAt: a.createdAt,
      reviewNotes: a.reviewNotes ?? "",
      reviewedAt: a.reviewedAt ?? "",
      propertyCount: a.properties.length,
      ownerEmail: a.email,
      signedAt: a.ownerSignedAt,
      mgmtStatus: a.mgmtStatus ?? "new",
      contractSent: Boolean(
        a.contractId ||
          a.contractSentAt ||
          (a.contractPropertyIds?.length ?? 0) > 0 ||
          a.status === "awaiting_signature"
      ),
      accountMessage: a.accountMessage ?? "",
    };

    if (
      (a.status === "awaiting_signature" || a.status === "approved") &&
      a.contractPropertyIds?.length
    ) {
      const properties = await getManagedPropertiesByIds(a.contractPropertyIds);
      summary.contracts = properties.map((p) => ({
        propertyId: p.id,
        propertyName: p.propertyName || "Management agreement",
        sections: buildAgreementSections(p),
      }));
    }

    if (a.status === "approved" && a.loginRevealPassword) {
      summary.temporaryPassword = a.loginRevealPassword;
    }

    applications.push(summary);
  }

  return {
    ok: true as const,
    applications,
  };
}

export async function getOpenOwnerApplications() {
  const apps = await readOwnerApplications();
  return apps.filter(
    (a) => a.status === "pending" || a.status === "needs_info"
  );
}

export async function getAwaitingSignatureApplications() {
  const apps = await readOwnerApplications();
  return apps
    .filter((a) => a.status === "awaiting_signature")
    .sort(
      (a, b) =>
        new Date(b.reviewedAt || b.createdAt).getTime() -
        new Date(a.reviewedAt || a.createdAt).getTime()
    );
}

export async function getPendingOwnerApplications() {
  return getOpenOwnerApplications();
}

export async function countPendingOwnerApplications() {
  const pending = await getOpenOwnerApplications();
  return pending.length;
}

export async function getOwnerApplicationById(id: string) {
  const apps = await readOwnerApplications();
  return apps.find((a) => a.id === id) ?? null;
}

async function writeApplication(updated: OwnerApplication) {
  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApplications,
    updated.id,
    updated as unknown as Record<string, unknown>
  );
}

export async function updateOwnerApplicationStatus(
  id: string,
  status: OwnerApplicationStatus,
  audit?: { reviewedBy: string; reviewNotes?: string }
) {
  const app = await getOwnerApplicationById(id);
  if (!app) {
    return { error: "Application not found." as const };
  }
  const updated: OwnerApplication = {
    ...app,
    status,
    reviewedBy: audit?.reviewedBy ?? app.reviewedBy,
    reviewedAt: audit ? new Date().toISOString() : app.reviewedAt,
    reviewNotes: audit?.reviewNotes ?? app.reviewNotes,
    reviewerDecision: status,
  };
  await writeApplication(updated);
  return { ok: true as const, application: updated };
}

export async function sendContractForOwnerSignature(input: {
  applicationId: string;
  reviewedBy: string;
  reviewNotes?: string;
  terms?: ContractTermsInput;
}) {
  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) {
    return { error: "Application not found." as const };
  }
  if (app.status !== "pending" && app.status !== "needs_info") {
    return { error: "This application is no longer open for sending." as const };
  }

  const provisioned = await provisionPropertiesFromApplication(app, {
    terms: input.terms,
  });

  const updated: OwnerApplication = {
    ...app,
    status: "awaiting_signature",
    reviewedBy: input.reviewedBy,
    reviewedAt: new Date().toISOString(),
    reviewNotes: input.reviewNotes?.trim() || app.reviewNotes || "",
    reviewerDecision: "awaiting_signature",
    contractPropertyIds: provisioned.map((p) => p.id),
  };
  await writeApplication(updated);

  return {
    ok: true as const,
    application: updated,
    propertiesProvisioned: provisioned.length,
    fullName: app.fullName,
    email: app.email,
  };
}

export async function signOwnerApplicationContract(input: {
  email: string;
  applicationId: string;
  signatureName: string;
  acknowledged: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const signatureName = input.signatureName.trim();
  if (!email || !input.applicationId.trim()) {
    return { error: "Email and application ID are required." as const };
  }
  if (!input.acknowledged) {
    return {
      error: "Confirm that you have read and agree to the agreement." as const,
    };
  }
  if (signatureName.length < 2) {
    return { error: "Type your full legal name to sign." as const };
  }

  const app = await getOwnerApplicationById(input.applicationId.trim());
  if (!app || app.email !== email) {
    return { error: "Application not found for that email." as const };
  }
  if (app.status !== "awaiting_signature") {
    return {
      error:
        "This application is not waiting for a signature. Check status again." as const,
    };
  }
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

  const signedAt = new Date().toISOString();
  let temporaryPassword: string | undefined;
  let account = await findOwner(email);
  if (!account) {
    temporaryPassword = generateTemporaryPassword();
    const created = await createOwnerAccount({
      email: app.email,
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

  await onboardExistingTenantsFromApplication({
    application: { ...app, contractPropertyIds: propertyIds },
    propertyIds,
  });

  const updated: OwnerApplication = {
    ...app,
    status: "approved",
    reviewerDecision: "approved",
    ownerSignedAt: signedAt,
    ownerSignatureName: signatureName,
    contractPropertyIds: propertyIds,
    mgmtStatus: "account_provisioned",
    loginRevealPassword: temporaryPassword || app.loginRevealPassword,
    credentialsIssuedAt: temporaryPassword
      ? signedAt
      : app.credentialsIssuedAt,
    accountMessage: temporaryPassword
      ? `Agreement signed ${new Date(signedAt).toLocaleString()}. Use the temporary password below to sign in at /owners.`
      : `Agreement signed ${new Date(signedAt).toLocaleString()}. Your assets now appear on your owner dashboard.`,
  };
  await writeApplication(updated);

  // Keep OwnerContract in sync when Management sent one
  if (app.contractId) {
    const client = await createClient();
    const contracts = await listSharedRecords<{
      id: string;
      status: string;
      relatedApplicationId?: string;
    }>(client, COLLECTIONS.ownerContracts);
    const contract = contracts.find((c) => c.id === app.contractId);
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
  }

  const properties = await getManagedPropertiesByIds(propertyIds);
  const summary: ApplicationStatusSummary = {
    id: updated.id,
    status: updated.status,
    fullName: updated.fullName,
    companyName: updated.companyName,
    createdAt: updated.createdAt,
    reviewNotes: updated.reviewNotes ?? "",
    reviewedAt: updated.reviewedAt ?? "",
    propertyCount: updated.properties.length,
    ownerEmail: updated.email,
    signedAt,
    temporaryPassword,
    contracts: properties.map((p) => ({
      propertyId: p.id,
      propertyName: p.propertyName || "Management agreement",
      sections: buildAgreementSections(p),
    })),
  };

  return {
    ok: true as const,
    application: summary,
    temporaryPassword,
    email: account.email,
  };
}

export async function clearLoginRevealPasswordForEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const apps = await readOwnerApplications();
  const withReveal = apps.filter(
    (a) => a.email === normalized && Boolean(a.loginRevealPassword)
  );
  for (const app of withReveal) {
    await writeApplication({ ...app, loginRevealPassword: "" });
  }
}

export async function approveOwnerApplication(input: {
  applicationId: string;
  password?: string;
  reviewedBy: string;
  reviewNotes?: string;
}) {
  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) {
    return { error: "Application not found." as const };
  }
  if (app.status !== "pending" && app.status !== "needs_info") {
    return { error: "This application is no longer open." as const };
  }

  const temporaryPassword =
    input.password?.trim() || generateTemporaryPassword();

  const created = await createOwnerAccount({
    email: app.email,
    password: temporaryPassword,
    fullName: app.fullName,
    mustChangePassword: true,
  });
  if ("error" in created) {
    return { error: created.error };
  }

  const provisioned = await provisionPropertiesFromApplication(app, {
    owner: created.account,
  });
  const propertyIds = provisioned.map((p) => p.id);
  const signedAt = new Date().toISOString();
  await linkOwnerAccountToProperties(propertyIds, created.account, {
    signedAt,
    signatureName: app.fullName,
  });
  await onboardExistingTenantsFromApplication({
    application: { ...app, contractPropertyIds: propertyIds },
    propertyIds,
  });

  const updated: OwnerApplication = {
    ...app,
    status: "approved",
    reviewedBy: input.reviewedBy,
    reviewedAt: signedAt,
    reviewNotes: input.reviewNotes?.trim() || app.reviewNotes || "",
    reviewerDecision: "approved",
    contractPropertyIds: propertyIds,
    ownerSignedAt: signedAt,
    mgmtStatus: "account_provisioned",
    loginRevealPassword: temporaryPassword,
    credentialsIssuedAt: signedAt,
  };
  await writeApplication(updated);

  return {
    ok: true as const,
    email: created.email,
    temporaryPassword,
    fullName: app.fullName,
    propertiesProvisioned: app.properties.length,
  };
}

export async function declineOwnerApplication(input: {
  applicationId: string;
  reviewedBy: string;
  reviewNotes?: string;
}) {
  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) {
    return { error: "Application not found." as const };
  }
  if (app.status !== "pending" && app.status !== "needs_info") {
    return { error: "This application is no longer open." as const };
  }
  return updateOwnerApplicationStatus(input.applicationId, "declined", {
    reviewedBy: input.reviewedBy,
    reviewNotes: input.reviewNotes,
  });
}

export async function requestOwnerApplicationInfo(input: {
  applicationId: string;
  reviewedBy: string;
  reviewNotes: string;
}) {
  const notes = input.reviewNotes.trim();
  if (!notes) {
    return { error: "Add a note describing what information is needed." as const };
  }
  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) {
    return { error: "Application not found." as const };
  }
  if (app.status !== "pending" && app.status !== "needs_info") {
    return { error: "This application is no longer open." as const };
  }
  return updateOwnerApplicationStatus(input.applicationId, "needs_info", {
    reviewedBy: input.reviewedBy,
    reviewNotes: notes,
  });
}

export async function verifyOwnerLogin(email: string, password: string) {
  const owner = await findOwner(email);
  if (!owner || !verifyPassword(password, owner.password)) {
    return null;
  }

  // Migrate legacy plaintext to hash on successful login
  if (!isHashedPassword(owner.password)) {
    const migrated = {
      ...owner,
      password: hashPassword(password),
      passwordReveal: owner.passwordReveal || password,
    };
    await saveOwnerAccount(migrated);
    return migrated;
  }

  return owner;
}

export async function changeOwnerPassword(input: {
  email: string;
  currentPassword: string;
  newPassword: string;
}) {
  const owner = await findOwner(input.email);
  if (!owner || !verifyPassword(input.currentPassword, owner.password)) {
    return { error: "Current password is incorrect." as const };
  }
  if (input.newPassword.trim().length < 8) {
    return { error: "New password must be at least 8 characters." as const };
  }

  const updated: OwnerAccount = {
    ...owner,
    password: hashPassword(input.newPassword.trim()),
    passwordReveal: undefined,
    mustChangePassword: false,
  };
  await saveOwnerAccount(updated);
  await clearLoginRevealPasswordForEmail(owner.email);
  return { ok: true as const };
}

export async function setOwnerSession(email: string) {
  const jar = await cookies();
  // Owner and tenant portal sessions must not overlap.
  jar.delete("cpmc_tenant_portal");
  jar.delete("cpmc_portal_tenant_v2");
  jar.delete("cpmc_portal_tenant_ui_v2");
  jar.set({
    name: OWNER_COOKIE,
    value: email.toLowerCase(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearOwnerSession() {
  const jar = await cookies();
  jar.delete(OWNER_COOKIE);
}

export async function getOwnerSessionEmail() {
  const jar = await cookies();
  return jar.get(OWNER_COOKIE)?.value ?? null;
}

export async function getCurrentOwner() {
  const email = await getOwnerSessionEmail();
  if (!email) return null;
  return findOwner(email);
}
