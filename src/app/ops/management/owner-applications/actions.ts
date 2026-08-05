"use server";

import { createOwnerAccount, findOwner, saveOwnerAccount } from "@/lib/owner-auth";
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
