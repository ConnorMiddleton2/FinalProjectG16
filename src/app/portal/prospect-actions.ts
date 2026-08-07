"use server";

import {
  ageFromDob,
  registerTenantAccount,
  requiresGuarantor,
  saveTenantAccount,
  setTenantPortalSession,
  verifyTenantPortalLogin,
  clearTenantPortalSession,
  findTenantAccount,
  getTenantPortalSession,
  type TenantAccount,
} from "@/lib/tenant-portal-accounts";
import { createClient } from "@/lib/supabase/server";
import { COLLECTIONS, upsertSharedRecord } from "@/lib/shared-store";
import { redirect } from "next/navigation";
import { PORTAL_HOME_PATH } from "@/lib/portal/auth";

export type ProspectApplyState = {
  error?: string;
  ok?: boolean;
  applicationId?: string;
};

function readApplyFields(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    dateOfBirth: String(formData.get("dateOfBirth") || "").trim(),
    lookingFor: String(formData.get("lookingFor") || "").trim(),
    propertyInterest: String(formData.get("propertyInterest") || "").trim(),
    propertyId: String(formData.get("propertyId") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    moveInTiming: String(formData.get("moveInTiming") || "").trim(),
    householdSize: String(formData.get("householdSize") || "").trim(),
    employment: String(formData.get("employment") || "").trim(),
    idDocument: String(formData.get("idDocument") || "").trim(),
    guarantorName: String(formData.get("guarantorName") || "").trim(),
    guarantorPhone: String(formData.get("guarantorPhone") || "").trim(),
  };
}

function validateAgeDocs(fields: ReturnType<typeof readApplyFields>) {
  const needsGuarantor = requiresGuarantor(fields.dateOfBirth);
  const age = ageFromDob(fields.dateOfBirth);

  if (age != null && age >= 21 && !fields.idDocument.trim()) {
    return {
      error: "Applicants 21+ must provide a valid ID document reference.",
    } as const;
  }
  if (age != null && age >= 21 && !fields.employment.trim()) {
    return {
      error: "Applicants 21+ must provide proof of employment details.",
    } as const;
  }
  if (needsGuarantor && (!fields.guarantorName || !fields.guarantorPhone)) {
    return {
      error: "Applicants under 21 must include a guarantor name and phone.",
    } as const;
  }
  return {
    needsGuarantor,
    age,
  } as const;
}

/** Always creates a NEW application row (multiple apps per account/property allowed). */
async function createTenantApplicationForAccount(
  account: TenantAccount,
  fields: ReturnType<typeof readApplyFields>,
  needsGuarantor: boolean
) {
  const applicationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const application = {
    id: applicationId,
    property: fields.propertyInterest || fields.lookingFor || "General inquiry",
    propertyId: fields.propertyId,
    name: fields.fullName || account.fullName,
    email: fields.email || account.email,
    phone: fields.phone || account.phone,
    notes: [
      fields.notes,
      fields.lookingFor ? `Looking for: ${fields.lookingFor}` : "",
      fields.moveInTiming ? `Move-in timing: ${fields.moveInTiming}` : "",
      fields.householdSize ? `Household / company: ${fields.householdSize}` : "",
      fields.dateOfBirth ? `DOB: ${fields.dateOfBirth}` : "",
      fields.employment ? `Employment: ${fields.employment}` : "",
      fields.idDocument ? `ID: ${fields.idDocument}` : "",
      needsGuarantor
        ? `Guarantor: ${fields.guarantorName} · ${fields.guarantorPhone}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    status: "Submitted" as const,
    createdAt: now.slice(0, 10),
    smStatus: "reviewing",
    tenantAccountId: account.id,
    dateOfBirth: fields.dateOfBirth || account.dateOfBirth,
    lookingFor: fields.lookingFor || account.lookingFor,
    requiresGuarantor: needsGuarantor,
    guarantorName: fields.guarantorName,
    guarantorPhone: fields.guarantorPhone,
    employmentProof: fields.employment,
    idDocumentRef: fields.idDocument,
    documentsComplete: false,
    leasePacketStatus: "not_sent",
  };

  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantApplications,
    applicationId,
    application as unknown as Record<string, unknown>
  );

  const updated: TenantAccount = {
    ...account,
    fullName: fields.fullName || account.fullName,
    phone: fields.phone || account.phone,
    dateOfBirth: fields.dateOfBirth || account.dateOfBirth,
    lookingFor: fields.lookingFor || account.lookingFor,
    status:
      account.status === "active" ? account.status : "pending_application",
    applicationIds: [...new Set([...account.applicationIds, applicationId])],
    preferredPropertyIds: fields.propertyId
      ? [...new Set([...account.preferredPropertyIds, fields.propertyId])]
      : account.preferredPropertyIds,
    updatedAt: now,
  };
  await saveTenantAccount(updated);
  await setTenantPortalSession(updated);

  return { applicationId, account: updated };
}

export async function prospectStartApplication(
  _prev: ProspectApplyState,
  formData: FormData
): Promise<ProspectApplyState> {
  const fields = readApplyFields(formData);

  if (!fields.fullName || !fields.email || !fields.password) {
    return { error: "Name, email, and password are required." };
  }

  const ageCheck = validateAgeDocs(fields);
  if ("error" in ageCheck) return { error: ageCheck.error };
  const { needsGuarantor } = ageCheck;

  let account = await findTenantAccount(fields.email);
  if (!account) {
    const created = await registerTenantAccount({
      email: fields.email,
      password: fields.password,
      fullName: fields.fullName,
      phone: fields.phone,
      dateOfBirth: fields.dateOfBirth,
      lookingFor: fields.lookingFor,
    });
    if ("error" in created) return { error: created.error };
    account = created.account;
  } else {
    const verified = await verifyTenantPortalLogin(
      fields.email,
      fields.password
    );
    if (!verified) {
      return {
        error:
          "That email already has an account. Use the correct password, or sign in and start another application from your portal.",
      };
    }
    account = verified;
  }

  const created = await createTenantApplicationForAccount(
    account,
    fields,
    needsGuarantor
  );
  return { ok: true, applicationId: created.applicationId };
}

/**
 * Signed-in applicant starts another application (same or different property).
 * Does not require re-entering password; always creates a new application row.
 */
export async function prospectStartAdditionalApplication(
  _prev: ProspectApplyState,
  formData: FormData
): Promise<ProspectApplyState> {
  const session = await getTenantPortalSession();
  if (!session) {
    return {
      error: "Sign in to your tenant account to start another application.",
    };
  }

  const fields = readApplyFields(formData);
  const fullName = fields.fullName || session.fullName;
  const email = session.email;
  const phone = fields.phone || session.phone;
  const dateOfBirth = fields.dateOfBirth || session.dateOfBirth;

  if (!fullName) {
    return { error: "Full name is required." };
  }
  if (!fields.lookingFor && !fields.propertyInterest) {
    return { error: "Tell us what you are looking for, or pick a property." };
  }

  const merged = {
    ...fields,
    fullName,
    email,
    phone,
    dateOfBirth,
    password: "",
  };
  const ageCheck = validateAgeDocs(merged);
  if ("error" in ageCheck) return { error: ageCheck.error };

  const created = await createTenantApplicationForAccount(
    session,
    merged,
    ageCheck.needsGuarantor
  );
  return { ok: true, applicationId: created.applicationId };
}

export async function tenantPortalLoginAction(
  _prev: { error?: string },
  formData: FormData
) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const account = await verifyTenantPortalLogin(email, password);
  if (!account) {
    return { error: "Invalid email or password." };
  }
  await setTenantPortalSession(account);
  redirect(PORTAL_HOME_PATH);
}

export async function tenantPortalLogoutAction() {
  await clearTenantPortalSession();
  const { clearOwnerSession } = await import("@/lib/owner-auth");
  await clearOwnerSession();
  const { clearPortalDemoCookies } = await import(
    "@/lib/portal/portal-demo-auth-server"
  );
  await clearPortalDemoCookies();
  redirect("/portal/start");
}
