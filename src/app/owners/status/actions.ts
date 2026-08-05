"use server";

import { lookupOwnerApplications } from "@/lib/owner-auth";

export type ApplicationStatusSummary = {
  id: string;
  status: string;
  fullName: string;
  companyName: string;
  createdAt: string;
  reviewNotes: string;
  reviewedAt: string;
  propertyCount: number;
};

export type StatusLookupState = {
  error?: string;
  applications?: ApplicationStatusSummary[];
};

export async function lookupApplicationStatus(
  _prev: StatusLookupState,
  formData: FormData
): Promise<StatusLookupState> {
  const result = await lookupOwnerApplications({
    email: String(formData.get("email") ?? ""),
    applicationId: String(formData.get("applicationId") ?? "") || undefined,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  if (result.applications.length === 0) {
    return {
      error: "No applications found for that email (and ID, if provided).",
    };
  }

  return { applications: result.applications };
}
