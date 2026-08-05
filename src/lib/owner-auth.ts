import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";

export const OWNER_COOKIE = "harborline_owner";

export type OwnerAccount = {
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

const DATA_DIR = path.join(process.cwd(), "data");
const OWNERS_FILE = path.join(DATA_DIR, "owners.json");
const APPLICATIONS_FILE = path.join(DATA_DIR, "owner-applications.json");

const SEED_OWNERS: OwnerAccount[] = [
  {
    email: "bobowner@building.com",
    password: "12345",
    fullName: "Bob Owner",
    createdAt: new Date().toISOString(),
  },
];

async function ensureOwnersFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(OWNERS_FILE);
  } catch {
    await fs.writeFile(OWNERS_FILE, JSON.stringify(SEED_OWNERS, null, 2), "utf8");
  }
}

async function ensureApplicationsFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(APPLICATIONS_FILE);
  } catch {
    await fs.writeFile(APPLICATIONS_FILE, "[]", "utf8");
  }
}

export async function readOwners(): Promise<OwnerAccount[]> {
  await ensureOwnersFile();
  const raw = await fs.readFile(OWNERS_FILE, "utf8");
  const parsed = JSON.parse(raw) as OwnerAccount[];

  const hasBob = parsed.some(
    (o) => o.email.toLowerCase() === "bobowner@building.com"
  );
  if (!hasBob) {
    const next = [...SEED_OWNERS, ...parsed];
    await fs.writeFile(OWNERS_FILE, JSON.stringify(next, null, 2), "utf8");
    return next;
  }
  return parsed;
}

async function writeOwners(owners: OwnerAccount[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(OWNERS_FILE, JSON.stringify(owners, null, 2), "utf8");
}

export async function readOwnerApplications(): Promise<OwnerApplication[]> {
  await ensureApplicationsFile();
  const raw = await fs.readFile(APPLICATIONS_FILE, "utf8");
  return JSON.parse(raw) as OwnerApplication[];
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
  const apps = await readOwnerApplications();
  const index = apps.findIndex((a) => a.id === id);
  if (index < 0) {
    return { error: "Application not found." as const };
  }
  apps[index] = { ...apps[index], status };
  await writeOwnerApplications(apps);
  return { ok: true as const, application: apps[index] };
}

/**
 * Staff review action: create login credentials and mark the application approved.
 */
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

async function writeOwnerApplications(apps: OwnerApplication[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(APPLICATIONS_FILE, JSON.stringify(apps, null, 2), "utf8");
}

export async function findOwner(email: string) {
  const owners = await readOwners();
  return (
    owners.find((o) => o.email.toLowerCase() === email.trim().toLowerCase()) ??
    null
  );
}

/** Staff-only: create an owner account after reviewing an application */
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

  const owners = await readOwners();
  owners.push({
    email,
    password: input.password,
    fullName: input.fullName.trim() || "Property Owner",
    createdAt: new Date().toISOString(),
  });
  await writeOwners(owners);
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

  apps.unshift(application);
  await writeOwnerApplications(apps);
  return { ok: true as const, application };
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
