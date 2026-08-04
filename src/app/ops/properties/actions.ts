"use server";

import { revalidatePath } from "next/cache";
import {
  approveOwnerApplication,
  declineOwnerApplication,
} from "@/lib/owner-auth";
import { hasTeamAccess } from "@/lib/team-auth";

export type StaffApplicationState = {
  error?: string;
  success?: string;
};

export async function createAccountFromApplication(
  _prev: StaffApplicationState,
  formData: FormData
): Promise<StaffApplicationState> {
  if (!(await hasTeamAccess())) {
    return { error: "Team access required." };
  }

  const applicationId = String(formData.get("applicationId") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await approveOwnerApplication({ applicationId, password });
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/ops/properties");
  revalidatePath("/ops/properties/applications");

  return {
    success: `Account created for ${result.fullName} (${result.email}). Temporary password: ${result.password}`,
  };
}

export async function declineApplicationAction(
  _prev: StaffApplicationState,
  formData: FormData
): Promise<StaffApplicationState> {
  if (!(await hasTeamAccess())) {
    return { error: "Team access required." };
  }

  const applicationId = String(formData.get("applicationId") ?? "");
  const result = await declineOwnerApplication(applicationId);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/ops/properties");
  revalidatePath("/ops/properties/applications");
  return { success: "Application declined." };
}
