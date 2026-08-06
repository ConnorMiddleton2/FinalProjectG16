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

export async function prospectStartApplication(
  _prev: ProspectApplyState,
  formData: FormData
): Promise<ProspectApplyState> {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") || "").trim();
  const lookingFor = String(formData.get("lookingFor") || "").trim();
  const propertyInterest = String(formData.get("propertyInterest") || "").trim();
  const propertyId = String(formData.get("propertyId") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const employment = String(formData.get("employment") || "").trim();
  const idDocument = String(formData.get("idDocument") || "").trim();
  const guarantorName = String(formData.get("guarantorName") || "").trim();
  const guarantorPhone = String(formData.get("guarantorPhone") || "").trim();

  if (!fullName || !email || !password) {
    return { error: "Name, email, and password are required." };
  }

  const needsGuarantor = requiresGuarantor(dateOfBirth);
  const age = ageFromDob(dateOfBirth);

  if (age != null && age >= 21 && !idDocument.trim()) {
    return {
      error: "Applicants 21+ must provide a valid ID document reference.",
    };
  }
  if (age != null && age >= 21 && !employment.trim()) {
    return {
      error: "Applicants 21+ must provide proof of employment details.",
    };
  }
  if (needsGuarantor && (!guarantorName || !guarantorPhone)) {
    return {
      error: "Applicants under 21 must include a guarantor name and phone.",
    };
  }

  let account = await findTenantAccount(email);
  if (!account) {
    const created = await registerTenantAccount({
      email,
      password,
      fullName,
      phone,
      dateOfBirth,
      lookingFor,
    });
    if ("error" in created) return { error: created.error };
    account = created.account;
  } else {
    const verified = await verifyTenantPortalLogin(email, password);
    if (!verified) {
      return {
        error:
          "That email already has an account. Use the correct password, or sign in first.",
      };
    }
    account = verified;
  }

  const applicationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const application = {
    id: applicationId,
    property: propertyInterest || lookingFor || "General inquiry",
    propertyId,
    name: fullName,
    email,
    phone,
    notes: [
      notes,
      lookingFor ? `Looking for: ${lookingFor}` : "",
      dateOfBirth ? `DOB: ${dateOfBirth}` : "",
      employment ? `Employment: ${employment}` : "",
      idDocument ? `ID: ${idDocument}` : "",
      needsGuarantor
        ? `Guarantor: ${guarantorName} · ${guarantorPhone}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    status: "Submitted" as const,
    createdAt: now.slice(0, 10),
    smStatus: "reviewing",
    tenantAccountId: account.id,
    dateOfBirth,
    lookingFor,
    requiresGuarantor: needsGuarantor,
    guarantorName,
    guarantorPhone,
    employmentProof: employment,
    idDocumentRef: idDocument,
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

  const updated = {
    ...account,
    fullName,
    phone,
    dateOfBirth,
    lookingFor,
    status: "pending_application" as const,
    applicationIds: [...new Set([...account.applicationIds, applicationId])],
    preferredPropertyIds: propertyId
      ? [...new Set([...account.preferredPropertyIds, propertyId])]
      : account.preferredPropertyIds,
    updatedAt: now,
  };
  await saveTenantAccount(updated);
  await setTenantPortalSession(updated);

  redirect(`${PORTAL_HOME_PATH}?welcome=application`);
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
  redirect("/portal/start");
}
