"use server";

import {
  createOwnerAccount,
  findOwner,
  readOwners,
  saveOwnerAccount,
  type OwnerAccount,
} from "@/lib/owner-auth";
import { generateTemporaryPassword, hashPassword } from "@/lib/owner-password";
import { requireOpsModule } from "@/lib/team-auth";

/** Reset owner login password and store plaintext reveal for Management. */
export async function resetOwnerAccountPassword(input: {
  ownerId: string;
  email: string;
}) {
  await requireOpsModule("management");
  const email = input.email.trim().toLowerCase();
  const existing = await findOwner(email);
  if (!existing || existing.id !== input.ownerId) {
    return { error: "Owner account not found." as const };
  }

  const temporaryPassword = generateTemporaryPassword();
  await saveOwnerAccount({
    ...existing,
    password: hashPassword(temporaryPassword),
    passwordReveal: temporaryPassword,
    mustChangePassword: true,
  });

  return {
    ok: true as const,
    email,
    temporaryPassword,
    accountId: existing.id,
  };
}

/** Set an explicit password (support / demo) and keep it visible to Management. */
export async function setOwnerAccountPassword(input: {
  ownerId: string;
  email: string;
  password: string;
  mustChangePassword?: boolean;
}) {
  await requireOpsModule("management");
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." as const };
  }
  const existing = await findOwner(email);
  if (!existing || existing.id !== input.ownerId) {
    return { error: "Owner account not found." as const };
  }

  await saveOwnerAccount({
    ...existing,
    password: hashPassword(password),
    passwordReveal: password,
    mustChangePassword: input.mustChangePassword ?? false,
  });

  return { ok: true as const, email, password };
}

/** Update owner profile fields Management may need for support. */
export async function updateOwnerAccountProfile(input: {
  ownerId: string;
  fullName: string;
  phone?: string;
  companyName?: string;
  notes?: string;
}) {
  await requireOpsModule("management");
  const owners = await readOwners();
  const existing = owners.find((o) => o.id === input.ownerId);
  if (!existing) {
    return { error: "Owner account not found." as const };
  }

  const next: OwnerAccount = {
    ...existing,
    fullName: input.fullName.trim() || existing.fullName,
    phone: (input.phone ?? existing.phone ?? "").trim(),
    companyName: (input.companyName ?? existing.companyName ?? "").trim(),
    notes: (input.notes ?? existing.notes ?? "").trim(),
  };
  await saveOwnerAccount(next);
  return { ok: true as const, account: next };
}

/** Create a new owner account from Management. */
export async function createOwnerAccountFromManagement(input: {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  companyName?: string;
}) {
  await requireOpsModule("management");
  const password = input.password?.trim() || generateTemporaryPassword();
  const created = await createOwnerAccount({
    email: input.email,
    password,
    fullName: input.fullName,
    mustChangePassword: !input.password?.trim(),
  });
  if ("error" in created) {
    return { error: created.error };
  }

  if (input.phone || input.companyName) {
    await saveOwnerAccount({
      ...created.account,
      phone: input.phone?.trim() || "",
      companyName: input.companyName?.trim() || "",
    });
  }

  return {
    ok: true as const,
    email: created.email,
    password,
    accountId: created.account.id,
  };
}
