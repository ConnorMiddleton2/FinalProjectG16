import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import {
  generateTemporaryPassword,
  hashPassword,
  isHashedPassword,
  verifyPassword,
} from "@/lib/owner-password";
import { provisionPropertiesFromApplication } from "@/lib/owner-properties";
import { cookies } from "next/headers";

export const OWNER_COOKIE = "harborline_owner";

export type OwnerAccount = {
  id: string;
  email: string;
  /** scrypt hash (salt:hash) or legacy plaintext during migration */
  password: string;
  fullName: string;
  createdAt: string;
  mustChangePassword?: boolean;
};

export type OwnerApplicationProperty = {
  category: string;
  location: string;
  squareFeet: string;
};

export type OwnerApplicationStatus =
  | "pending"
  | "approved"
  | "declined"
  | "needs_info";

export type OwnerApplication = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  properties: OwnerApplicationProperty[];
  message: string;
  status: OwnerApplicationStatus;
  createdAt: string;
  /** Staff review audit */
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  reviewerDecision?: OwnerApplicationStatus;
};

const SEED_OWNERS: OwnerAccount[] = [
  {
    id: "00000000-0000-4000-8000-0000000000b0",
    email: "bobowner@building.com",
    password: hashPassword("12345"),
    fullName: "Bob Owner",
    createdAt: new Date().toISOString(),
    mustChangePassword: false,
  },
];

async function ensureSeedOwners() {
  const client = await createClient();
  const owners = await listSharedRecords<OwnerAccount>(
    client,
    COLLECTIONS.ownerAccounts
  );
  const bob = owners.find(
    (o) => o.email.toLowerCase() === "bobowner@building.com"
  );
  if (!bob) {
    for (const owner of SEED_OWNERS) {
      await upsertSharedRecord(
        client,
        COLLECTIONS.ownerAccounts,
        owner.id,
        owner as unknown as Record<string, unknown>
      );
    }
    return;
  }

  // Migrate legacy plaintext seed password to hash when still "12345"
  if (!isHashedPassword(bob.password) && bob.password === "12345") {
    const updated = { ...bob, password: hashPassword("12345") };
    await upsertSharedRecord(
      client,
      COLLECTIONS.ownerAccounts,
      bob.id,
      updated as unknown as Record<string, unknown>
    );
  }
}

export async function readOwners(): Promise<OwnerAccount[]> {
  await ensureSeedOwners();
  const client = await createClient();
  return listSharedRecords<OwnerAccount>(client, COLLECTIONS.ownerAccounts);
}

export async function readOwnerApplications(): Promise<OwnerApplication[]> {
  const client = await createClient();
  return listSharedRecords<OwnerApplication>(
    client,
    COLLECTIONS.ownerApplications
  );
}

export async function findOwner(email: string) {
  const owners = await readOwners();
  return (
    owners.find((o) => o.email.toLowerCase() === email.trim().toLowerCase()) ??
    null
  );
}

export async function saveOwnerAccount(account: OwnerAccount) {
  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerAccounts,
    account.id,
    account as unknown as Record<string, unknown>
  );
}

export async function createOwnerAccount(input: {
  email: string;
  password: string;
  fullName: string;
  mustChangePassword?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await findOwner(email);
  if (existing) {
    return { error: "An account with that email already exists." as const };
  }
  if (!email || !input.password) {
    return { error: "Email and password are required." as const };
  }

  const account: OwnerAccount = {
    id: crypto.randomUUID(),
    email,
    password: hashPassword(input.password),
    fullName: input.fullName.trim() || "Property Owner",
    createdAt: new Date().toISOString(),
    mustChangePassword: input.mustChangePassword ?? true,
  };

  await saveOwnerAccount(account);
  return { ok: true as const, email, account };
}

export async function submitOwnerApplication(input: {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  properties: OwnerApplicationProperty[];
  message: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!input.fullName.trim() || !email) {
    return { error: "Name and email are required." as const };
  }

  const properties = input.properties
    .map((p) => ({
      category: p.category.trim(),
      location: p.location.trim(),
      squareFeet: p.squareFeet.trim(),
    }))
    .filter((p) => p.location || p.squareFeet || p.category);

  if (properties.length === 0) {
    return {
      error: "Add at least one property with a location or square footage." as const,
    };
  }

  const missingLocation = properties.some((p) => !p.location);
  if (missingLocation) {
    return { error: "Each property needs a location." as const };
  }

  const apps = await readOwnerApplications();
  const openSameEmail = apps.find(
    (a) =>
      a.email === email &&
      (a.status === "pending" || a.status === "needs_info")
  );
  if (openSameEmail) {
    return {
      error: "You already have an open application with this email." as const,
      applicationId: openSameEmail.id,
    };
  }

  const application: OwnerApplication = {
    id: crypto.randomUUID(),
    fullName: input.fullName.trim(),
    email,
    phone: input.phone.trim(),
    companyName: input.companyName.trim(),
    properties,
    message: input.message.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApplications,
    application.id,
    application as unknown as Record<string, unknown>
  );
  return { ok: true as const, application };
}

/** Public status lookup — returns only the caller's application by email (+ optional id). */
export async function lookupOwnerApplications(input: {
  email: string;
  applicationId?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { error: "Email is required." as const };
  }

  const apps = await readOwnerApplications();
  let matches = apps.filter((a) => a.email === email);

  if (input.applicationId?.trim()) {
    matches = matches.filter((a) => a.id === input.applicationId!.trim());
  }

  // Newest first
  matches.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    ok: true as const,
    applications: matches.map((a) => ({
      id: a.id,
      status: a.status,
      fullName: a.fullName,
      companyName: a.companyName,
      createdAt: a.createdAt,
      reviewNotes: a.reviewNotes ?? "",
      reviewedAt: a.reviewedAt ?? "",
      propertyCount: a.properties.length,
    })),
  };
}

export async function getOpenOwnerApplications() {
  const apps = await readOwnerApplications();
  return apps.filter(
    (a) => a.status === "pending" || a.status === "needs_info"
  );
}

export async function getPendingOwnerApplications() {
  return getOpenOwnerApplications();
}

export async function countPendingOwnerApplications() {
  const pending = await getOpenOwnerApplications();
  return pending.length;
}

export async function getOwnerApplicationById(id: string) {
  const apps = await readOwnerApplications();
  return apps.find((a) => a.id === id) ?? null;
}

async function writeApplication(updated: OwnerApplication) {
  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApplications,
    updated.id,
    updated as unknown as Record<string, unknown>
  );
}

export async function updateOwnerApplicationStatus(
  id: string,
  status: OwnerApplicationStatus,
  audit?: { reviewedBy: string; reviewNotes?: string }
) {
  const app = await getOwnerApplicationById(id);
  if (!app) {
    return { error: "Application not found." as const };
  }
  const updated: OwnerApplication = {
    ...app,
    status,
    reviewedBy: audit?.reviewedBy ?? app.reviewedBy,
    reviewedAt: audit ? new Date().toISOString() : app.reviewedAt,
    reviewNotes: audit?.reviewNotes ?? app.reviewNotes,
    reviewerDecision: status,
  };
  await writeApplication(updated);
  return { ok: true as const, application: updated };
}

export async function approveOwnerApplication(input: {
  applicationId: string;
  password?: string;
  reviewedBy: string;
  reviewNotes?: string;
}) {
  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) {
    return { error: "Application not found." as const };
  }
  if (app.status !== "pending" && app.status !== "needs_info") {
    return { error: "This application is no longer open." as const };
  }

  const temporaryPassword =
    input.password?.trim() || generateTemporaryPassword();

  const created = await createOwnerAccount({
    email: app.email,
    password: temporaryPassword,
    fullName: app.fullName,
    mustChangePassword: true,
  });
  if ("error" in created) {
    return { error: created.error };
  }

  await provisionPropertiesFromApplication(app, created.account);

  const updated: OwnerApplication = {
    ...app,
    status: "approved",
    reviewedBy: input.reviewedBy,
    reviewedAt: new Date().toISOString(),
    reviewNotes: input.reviewNotes?.trim() || app.reviewNotes || "",
    reviewerDecision: "approved",
  };
  await writeApplication(updated);

  return {
    ok: true as const,
    email: created.email,
    /** One-time plaintext for secure out-of-band handoff — never stored. */
    temporaryPassword,
    fullName: app.fullName,
    propertiesProvisioned: app.properties.length,
  };
}

export async function declineOwnerApplication(input: {
  applicationId: string;
  reviewedBy: string;
  reviewNotes?: string;
}) {
  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) {
    return { error: "Application not found." as const };
  }
  if (app.status !== "pending" && app.status !== "needs_info") {
    return { error: "This application is no longer open." as const };
  }
  return updateOwnerApplicationStatus(input.applicationId, "declined", {
    reviewedBy: input.reviewedBy,
    reviewNotes: input.reviewNotes,
  });
}

export async function requestOwnerApplicationInfo(input: {
  applicationId: string;
  reviewedBy: string;
  reviewNotes: string;
}) {
  const notes = input.reviewNotes.trim();
  if (!notes) {
    return { error: "Add a note describing what information is needed." as const };
  }
  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) {
    return { error: "Application not found." as const };
  }
  if (app.status !== "pending" && app.status !== "needs_info") {
    return { error: "This application is no longer open." as const };
  }
  return updateOwnerApplicationStatus(input.applicationId, "needs_info", {
    reviewedBy: input.reviewedBy,
    reviewNotes: notes,
  });
}

export async function verifyOwnerLogin(email: string, password: string) {
  const owner = await findOwner(email);
  if (!owner || !verifyPassword(password, owner.password)) {
    return null;
  }

  // Migrate legacy plaintext to hash on successful login
  if (!isHashedPassword(owner.password)) {
    const migrated = {
      ...owner,
      password: hashPassword(password),
    };
    await saveOwnerAccount(migrated);
    return migrated;
  }

  return owner;
}

export async function changeOwnerPassword(input: {
  email: string;
  currentPassword: string;
  newPassword: string;
}) {
  const owner = await findOwner(input.email);
  if (!owner || !verifyPassword(input.currentPassword, owner.password)) {
    return { error: "Current password is incorrect." as const };
  }
  if (input.newPassword.trim().length < 8) {
    return { error: "New password must be at least 8 characters." as const };
  }

  const updated: OwnerAccount = {
    ...owner,
    password: hashPassword(input.newPassword.trim()),
    mustChangePassword: false,
  };
  await saveOwnerAccount(updated);
  return { ok: true as const };
}

export async function setOwnerSession(email: string) {
  const jar = await cookies();
  jar.set({
    name: OWNER_COOKIE,
    value: email.toLowerCase(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearOwnerSession() {
  const jar = await cookies();
  jar.delete(OWNER_COOKIE);
}

export async function getOwnerSessionEmail() {
  const jar = await cookies();
  return jar.get(OWNER_COOKIE)?.value ?? null;
}

export async function getCurrentOwner() {
  const email = await getOwnerSessionEmail();
  if (!email) return null;
  return findOwner(email);
}
