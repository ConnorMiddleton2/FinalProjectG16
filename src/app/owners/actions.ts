"use server";

import { redirect } from "next/navigation";
import {
  clearOwnerSession,
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

export async function ownerApply(
  _prev: OwnerAuthState,
  formData: FormData
): Promise<OwnerAuthState> {
  let properties: OwnerApplicationProperty[] = [];
  try {
    const raw = String(formData.get("propertiesJson") ?? "[]");
    properties = JSON.parse(raw) as OwnerApplicationProperty[];
  } catch {
    return { error: "Could not read property list. Please try again." };
  }

  const result = await submitOwnerApplication({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    properties,
    message: String(formData.get("message") ?? ""),
  });

  if ("error" in result) {
    return { error: result.error };
  }

  return {
    success:
      "Application submitted. Harborline will review it and create your owner account if approved.",
  };
}

export async function ownerLogout() {
  await clearOwnerSession();
  redirect("/");
}
