"use server";

import {
  createOwnerAccount,
  deleteOwnerAccount,
  readOwnerApplications,
  readOwners,
  saveOwnerAccount,
  type OwnerAccount,
  type OwnerApplication,
} from "@/lib/owner-auth";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { generateTemporaryPassword, hashPassword } from "@/lib/owner-password";
import { requireOpsModule } from "@/lib/team-auth";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";

async function syncLinkedPropertyContacts(input: {
  ownerId: string;
  previousEmail: string;
  email: string;
  fullName: string;
  clearLink?: boolean;
}) {
  const client = await createClient();
  const properties = await listSharedRecords<ManagementContractDraft>(
    client,
    COLLECTIONS.managedProperties
  );
  const prev = input.previousEmail.toLowerCase();
  const nextEmail = input.email.toLowerCase();

  for (const property of properties) {
    const linkedById = property.ownerAccountId === input.ownerId;
    const linkedByEmail =
      (property.ownerEmail || "").toLowerCase() === prev ||
      (property.ownerEmail || "").toLowerCase() === nextEmail;
    if (!linkedById && !linkedByEmail) continue;

    const updated: ManagementContractDraft = {
      ...property,
      ownerAccountId: input.clearLink ? "" : input.ownerId,
      ownerEmail: input.clearLink ? property.ownerEmail || "" : input.email,
      ownerContactName: input.clearLink
        ? property.ownerContactName
        : input.fullName || property.ownerContactName,
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.managedProperties,
      updated.id,
      updated as unknown as Record<string, unknown>
    );
  }
}

async function syncApplicationEmails(input: {
  previousEmail: string;
  email: string;
  fullName?: string;
}) {
  const prev = input.previousEmail.toLowerCase();
  const next = input.email.toLowerCase();
  if (prev === next && !input.fullName) return;

  const apps = await readOwnerApplications();
  const client = await createClient();
  for (const app of apps) {
    if (app.email.toLowerCase() !== prev) continue;
    const updated: OwnerApplication = {
      ...app,
      email: next,
      ...(input.fullName ? { fullName: input.fullName } : {}),
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.ownerApplications,
      updated.id,
      updated as unknown as Record<string, unknown>
    );
  }
}

/** Reset owner login password and store plaintext reveal for Management. */
export async function resetOwnerAccountPassword(input: {
  ownerId: string;
  email: string;
}) {
  await requireOpsModule("management");
  const owners = await readOwners();
  const existing = owners.find((o) => o.id === input.ownerId);
  if (!existing) {
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
    email: existing.email,
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
  const password = input.password.trim();
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." as const };
  }
  const owners = await readOwners();
  const existing = owners.find((o) => o.id === input.ownerId);
  if (!existing) {
    return { error: "Owner account not found." as const };
  }

  await saveOwnerAccount({
    ...existing,
    password: hashPassword(password),
    passwordReveal: password,
    mustChangePassword: input.mustChangePassword ?? false,
  });

  return { ok: true as const, email: existing.email, password };
}

/** Update owner profile fields Management may need for support. */
export async function updateOwnerAccountProfile(input: {
  ownerId: string;
  fullName: string;
  email?: string;
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

  const nextEmail = (input.email ?? existing.email).trim().toLowerCase();
  if (!nextEmail || !nextEmail.includes("@")) {
    return { error: "A valid login email is required." as const };
  }

  const emailTaken = owners.find(
    (o) => o.id !== existing.id && o.email.toLowerCase() === nextEmail
  );
  if (emailTaken) {
    return { error: "Another owner account already uses that email." as const };
  }

  const next: OwnerAccount = {
    ...existing,
    email: nextEmail,
    fullName: input.fullName.trim() || existing.fullName,
    phone: (input.phone ?? existing.phone ?? "").trim(),
    companyName: (input.companyName ?? existing.companyName ?? "").trim(),
    notes: (input.notes ?? existing.notes ?? "").trim(),
  };
  await saveOwnerAccount(next);

  const emailChanged = existing.email.toLowerCase() !== nextEmail;
  if (emailChanged || next.fullName !== existing.fullName) {
    await syncLinkedPropertyContacts({
      ownerId: next.id,
      previousEmail: existing.email,
      email: next.email,
      fullName: next.fullName,
    });
  }
  if (emailChanged) {
    await syncApplicationEmails({
      previousEmail: existing.email,
      email: next.email,
      fullName: next.fullName,
    });
  }

  return { ok: true as const, account: next };
}

/** Permanently remove an owner login. Properties stay; portal link is cleared. */
export async function deleteOwnerAccountFromManagement(input: {
  ownerId: string;
}) {
  await requireOpsModule("management");
  const owners = await readOwners();
  const existing = owners.find((o) => o.id === input.ownerId);
  if (!existing) {
    return { error: "Owner account not found." as const };
  }

  await syncLinkedPropertyContacts({
    ownerId: existing.id,
    previousEmail: existing.email,
    email: existing.email,
    fullName: existing.fullName,
    clearLink: true,
  });
  await deleteOwnerAccount(existing.id);

  return {
    ok: true as const,
    email: existing.email,
    fullName: existing.fullName,
  };
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
