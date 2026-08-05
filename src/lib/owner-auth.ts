import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import { cookies } from "next/headers";

export const OWNER_COOKIE = "harborline_owner";

export type OwnerAccount = {
  id: string;
  email: string;
  password: string;
  fullName: string;
  createdAt: string;
};

export type OwnerApplicationProperty = {
  category: string;
  location: string;
  squareFeet: string;
};

export type OwnerApplication = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  properties: OwnerApplicationProperty[];
  message: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
};

const SEED_OWNERS: OwnerAccount[] = [
  {
    id: "00000000-0000-4000-8000-0000000000b0",
    email: "bobowner@building.com",
    password: "12345",
    fullName: "Bob Owner",
    createdAt: new Date().toISOString(),
  },
];

async function ensureSeedOwners() {
  const client = await createClient();
  const owners = await listSharedRecords<OwnerAccount>(
    client,
    COLLECTIONS.ownerAccounts
  );
  const hasBob = owners.some(
    (o) => o.email.toLowerCase() === "bobowner@building.com"
  );
  if (!hasBob) {
    for (const owner of SEED_OWNERS) {
      await upsertSharedRecord(
        client,
        COLLECTIONS.ownerAccounts,
        owner.id,
        owner as unknown as Record<string, unknown>
      );
    }
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

export async function createOwnerAccount(input: {
  email: string;
  password: string;
  fullName: string;
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
    password: input.password,
    fullName: input.fullName.trim() || "Property Owner",
    createdAt: new Date().toISOString(),
  };

  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerAccounts,
    account.id,
    account as unknown as Record<string, unknown>
  );
  return { ok: true as const, email };
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
  const pendingSameEmail = apps.find(
    (a) => a.email === email && a.status === "pending"
  );
  if (pendingSameEmail) {
    return {
      error: "You already have a pending application with this email." as const,
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

export async function getPendingOwnerApplications() {
  const apps = await readOwnerApplications();
  return apps.filter((a) => a.status === "pending");
}

export async function countPendingOwnerApplications() {
  const pending = await getPendingOwnerApplications();
  return pending.length;
}

export async function getOwnerApplicationById(id: string) {
  const apps = await readOwnerApplications();
  return apps.find((a) => a.id === id) ?? null;
}

export async function updateOwnerApplicationStatus(
  id: string,
  status: OwnerApplication["status"]
) {
  const app = await getOwnerApplicationById(id);
  if (!app) {
    return { error: "Application not found." as const };
  }
  const updated = { ...app, status };
  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApplications,
    id,
    updated as unknown as Record<string, unknown>
  );
  return { ok: true as const, application: updated };
}

export async function approveOwnerApplication(input: {
  applicationId: string;
  password: string;
}) {
  const app = await getOwnerApplicationById(input.applicationId);
  if (!app) {
    return { error: "Application not found." as const };
  }
  if (app.status !== "pending") {
    return { error: "This application is no longer pending." as const };
  }
  if (!input.password.trim()) {
    return { error: "Choose a temporary password for the owner." as const };
  }

  const created = await createOwnerAccount({
    email: app.email,
    password: input.password.trim(),
    fullName: app.fullName,
  });
  if ("error" in created) {
    return { error: created.error };
  }

  await updateOwnerApplicationStatus(app.id, "approved");
  return {
    ok: true as const,
    email: created.email,
    password: input.password.trim(),
    fullName: app.fullName,
  };
}

export async function declineOwnerApplication(applicationId: string) {
  const app = await getOwnerApplicationById(applicationId);
  if (!app) {
    return { error: "Application not found." as const };
  }
  if (app.status !== "pending") {
    return { error: "This application is no longer pending." as const };
  }
  return updateOwnerApplicationStatus(applicationId, "declined");
}

export async function verifyOwnerLogin(email: string, password: string) {
  const owner = await findOwner(email);
  if (!owner || owner.password !== password) {
    return null;
  }
  return owner;
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
