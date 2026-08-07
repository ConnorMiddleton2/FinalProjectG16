"use server";

import { redirect } from "next/navigation";
import {
  lookupOwnerApplications,
  setOwnerSession,
  signOwnerApplicationContract,
  type ApplicationStatusSummary,
} from "@/lib/owner-auth";
import { signOwnerProposedContract } from "@/lib/owner-application-portal";

export type { ApplicationStatusSummary };

export type StatusLookupState = {
  error?: string;
  email?: string;
  applications?: ApplicationStatusSummary[];
  /** Email used on last successful lookup — needed for sign form */
  lookupEmail?: string;
};

export async function lookupApplicationStatus(
  _prev: StatusLookupState,
  formData: FormData
): Promise<StatusLookupState> {
  const email = String(formData.get("email") ?? "");
  const result = await lookupOwnerApplications({
    email,
    applicationId: String(formData.get("applicationId") ?? "") || undefined,
  });

  if ("error" in result) {
    return { error: result.error, lookupEmail: email, email };
  }

  if (result.applications.length === 0) {
    return {
      error: "No applications found for that email (and ID, if provided).",
      lookupEmail: email,
      email,
    };
  }

  return {
    applications: result.applications,
    lookupEmail: email.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
  };
}

export type SignContractState = {
  error?: string;
  success?: string;
  application?: ApplicationStatusSummary;
};

export async function signApplicationContractAction(
  _prev: SignContractState,
  formData: FormData
): Promise<SignContractState> {
  const email = String(formData.get("email") ?? "");
  const result = await signOwnerApplicationContract({
    email,
    applicationId: String(formData.get("applicationId") ?? ""),
    signatureName: String(formData.get("signatureName") ?? ""),
    acknowledged: formData.get("acknowledged") === "on",
  });

  if ("error" in result) {
    return { error: result.error };
  }

  await setOwnerSession(email.trim().toLowerCase());
  redirect("/owners/dashboard?agreement=signed");
}

/** Sign a CPMC-generated agreement from Management (owner_contracts). */
export async function signApplicationContract(
  _prev: SignContractState,
  formData: FormData
): Promise<SignContractState> {
  const email = String(formData.get("email") ?? "");
  const result = await signOwnerProposedContract({
    contractId: String(formData.get("contractId") ?? ""),
    email,
    applicationId: String(formData.get("applicationId") ?? ""),
    signatureName: String(formData.get("signatureName") ?? ""),
  });

  if ("error" in result) {
    return { error: result.error };
  }

  await setOwnerSession(email.trim().toLowerCase());
  const params = new URLSearchParams({ agreement: "signed" });
  if (result.temporaryPassword) {
    params.set("tempPassword", result.temporaryPassword);
  }
  redirect(`/owners/dashboard?${params.toString()}`);
}
