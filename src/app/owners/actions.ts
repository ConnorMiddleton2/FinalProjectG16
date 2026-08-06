"use server";

import { redirect } from "next/navigation";
import {
  clearOwnerSession,
  getCurrentOwner,
  registerOwnerAccount,
  setOwnerSession,
  submitOwnerApplication,
  verifyOwnerLogin,
  type OwnerApplicationProperty,
} from "@/lib/owner-auth";

export type OwnerAuthState = {
  error?: string;
  success?: string;
};

export async function ownerLogin(
  _prev: OwnerAuthState,
  formData: FormData
): Promise<OwnerAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const owner = await verifyOwnerLogin(email, password);
  if (!owner) {
    return { error: "Invalid email or password." };
  }

  await setOwnerSession(owner.email);
  redirect("/owners/dashboard");
}

export async function ownerRegister(
  _prev: OwnerAuthState,
  formData: FormData
): Promise<OwnerAuthState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!fullName) {
    return { error: "Full name is required." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const created = await registerOwnerAccount({ fullName, email, password });
  if ("error" in created) {
    return { error: created.error };
  }

  await setOwnerSession(created.email);
  redirect("/owners/dashboard");
}

function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

export async function ownerApply(
  _prev: OwnerAuthState,
  formData: FormData
): Promise<OwnerAuthState> {
  const owner = await getCurrentOwner();
  if (!owner) {
    return { error: "Sign in to submit an application." };
  }

  let properties: OwnerApplicationProperty[] = [];
  try {
    const raw = String(formData.get("propertiesJson") ?? "[]");
    properties = JSON.parse(raw) as OwnerApplicationProperty[];
  } catch {
    return { error: "Could not read property list. Please try again." };
  }

  const result = await submitOwnerApplication({
    fullName: String(formData.get("fullName") ?? "") || owner.fullName,
    email: owner.email,
    phone: String(formData.get("phone") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    entityType: String(formData.get("entityType") ?? ""),
    mailingAddress: String(formData.get("mailingAddress") ?? ""),
    taxIdOrEin: String(formData.get("taxIdOrEin") ?? ""),
    preferredContactMethod: String(formData.get("preferredContactMethod") ?? ""),
    emergencyContactName: String(formData.get("emergencyContactName") ?? ""),
    emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? ""),
    communicationPreference: String(
      formData.get("communicationPreference") ?? ""
    ),
    documentsReadyNotes: String(formData.get("documentsReadyNotes") ?? ""),
    ownershipProofAvailable: checkbox(formData, "ownershipProofAvailable"),
    rentRollAvailable: checkbox(formData, "rentRollAvailable"),
    leasesAvailable: checkbox(formData, "leasesAvailable"),
    insuranceDocsAvailable: checkbox(formData, "insuranceDocsAvailable"),
    bankingReady: checkbox(formData, "bankingReady"),
    properties,
    message: String(formData.get("message") ?? ""),
  });

  if ("error" in result) {
    return { error: result.error };
  }

  redirect("/owners/dashboard");
}

export async function ownerLogout() {
  await clearOwnerSession();
  redirect("/");
}
