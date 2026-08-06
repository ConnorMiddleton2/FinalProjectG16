"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changeOwnerPassword,
  getCurrentOwner,
} from "@/lib/owner-auth";
import { decideOwnerApproval } from "@/lib/owner-approvals";

export type OwnerDashState = {
  error?: string;
  success?: string;
};

export async function ownerDecideApproval(
  _prev: OwnerDashState,
  formData: FormData
): Promise<OwnerDashState> {
  const owner = await getCurrentOwner();
  if (!owner) {
    return { error: "Sign in required." };
  }

  const approvalId = String(formData.get("approvalId") ?? "");
  const decision = String(formData.get("decision") ?? "") as
    | "approved"
    | "rejected";
  const comment = String(formData.get("comment") ?? "");

  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Invalid decision." };
  }

  const result = await decideOwnerApproval({
    approvalId,
    ownerEmail: owner.email,
    decision,
    comment,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/owners/dashboard");
  revalidatePath("/owners/dashboard/approvals");
  return {
    success:
      decision === "approved"
        ? "Expenditure approved."
        : "Expenditure rejected.",
  };
}

export async function ownerChangePassword(
  _prev: OwnerDashState,
  formData: FormData
): Promise<OwnerDashState> {
  const owner = await getCurrentOwner();
  if (!owner) {
    return { error: "Sign in required." };
  }

  const result = await changeOwnerPassword({
    email: owner.email,
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  });

  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/owners/dashboard");
  return { success: "Password updated." };
}

export async function requireOwnerOrRedirect() {
  const owner = await getCurrentOwner();
  if (!owner) {
    redirect("/owners");
  }
  return owner;
}
