"use server";

import {
  lookupOwnerApplications,
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
  const result = await signOwnerApplicationContract({
    email: String(formData.get("email") ?? ""),
    applicationId: String(formData.get("applicationId") ?? ""),
    signatureName: String(formData.get("signatureName") ?? ""),
    acknowledged: formData.get("acknowledged") === "on",
  });

  if ("error" in result) {
    return { error: result.error };
  }

  return {
    success:
      "Agreement signed. Your temporary password is below — use it to sign in, then change it on your dashboard.",
    application: result.application,
  };
}

/** Sign a Harborline-generated agreement from Management (owner_contracts). */
export async function signApplicationContract(
  _prev: SignContractState,
  formData: FormData
): Promise<SignContractState> {
  const result = await signOwnerProposedContract({
    contractId: String(formData.get("contractId") ?? ""),
    email: String(formData.get("email") ?? ""),
    applicationId: String(formData.get("applicationId") ?? ""),
    signatureName: String(formData.get("signatureName") ?? ""),
  });

  if ("error" in result) {
    return { error: result.error };
  }

  return {
    success:
      "Contract signed and returned to Harborline. They will finish provisioning your account.",
  };
}
