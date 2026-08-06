"use server";

import { revalidatePath } from "next/cache";
import {
  createOwnerAccount,
  findOwner,
  saveOwnerAccount,
  sendContractForOwnerSignature,
} from "@/lib/owner-auth";
import { generateTemporaryPassword, hashPassword } from "@/lib/owner-password";

/** Create or reset an owner account with a temporary password (hashed). */
export async function provisionOwnerTempPassword(input: {
  email: string;
  fullName: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { error: "Owner email is required." as const };
  }

  const temporaryPassword = generateTemporaryPassword();
  const existing = await findOwner(email);

  if (existing) {
    await saveOwnerAccount({
      ...existing,
      password: hashPassword(temporaryPassword),
      fullName: input.fullName.trim() || existing.fullName,
      mustChangePassword: true,
    });
    return { ok: true as const, email, temporaryPassword };
  }

  const created = await createOwnerAccount({
    email,
    password: temporaryPassword,
    fullName: input.fullName.trim() || "Property Owner",
    mustChangePassword: true,
  });
  if ("error" in created) {
    return { error: created.error };
  }

  return { ok: true as const, email: created.email, temporaryPassword };
}

/**
 * Same provisioning path as Properties → applications: creates managed_properties
 * and moves the application to awaiting_signature for /owners/status.
 */
export async function sendManagementContractOffer(input: {
  applicationId: string;
  reviewedBy: string;
  reviewNotes?: string;
  feePercent?: string;
}) {
  const result = await sendContractForOwnerSignature({
    applicationId: input.applicationId,
    reviewedBy: input.reviewedBy.trim() || "Harborline Management",
    reviewNotes: input.reviewNotes,
    terms: {
      feePercent: input.feePercent?.trim() || "4",
      feeStructure: "percent_collections",
    },
  });
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/ops/management/owner-applications");
  revalidatePath("/ops/properties");
  revalidatePath("/owners/status");

  return {
    ok: true as const,
    application: result.application,
    propertiesProvisioned: result.propertiesProvisioned,
    email: result.email,
    fullName: result.fullName,
  };
}
