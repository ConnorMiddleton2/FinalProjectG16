"use server";

import { lookupOwnerApplications } from "@/lib/owner-auth";
import { signOwnerProposedContract } from "@/lib/owner-application-portal";

export type ApplicationStatusSummary = {
  id: string;
  status: string;
  fullName: string;
  companyName: string;
  createdAt: string;
  reviewNotes: string;
  reviewedAt: string;
  propertyCount: number;
  mgmtStatus: string;
  contractSent: boolean;
  accountMessage: string;
};

export type StatusLookupState = {
  error?: string;
  email?: string;
  applications?: ApplicationStatusSummary[];
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
    return { error: result.error, email };
  }

  if (result.applications.length === 0) {
    return {
      error: "No applications found for that email (and ID, if provided).",
      email,
    };
  }

  return { applications: result.applications, email: email.trim().toLowerCase() };
}

export type SignContractState = {
  error?: string;
  success?: string;
};

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
