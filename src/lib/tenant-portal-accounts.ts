/**
 * Prospect / tenant portal accounts (separate from ops tenants roster).
 */
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import { hashPassword, verifyPassword, isHashedPassword } from "@/lib/owner-password";
import { cookies } from "next/headers";

export { ageFromDob, requiresGuarantor } from "@/lib/tenant-age";

export const TENANT_PORTAL_COOKIE = "harborline_tenant_portal";

export type TenantAccountStatus =
  | "prospect"
  | "pending_application"
  | "pending_lease"
  | "active"
  | "inactive";

export type TenantAccount = {
  id: string;
  email: string;
  password: string;
  passwordReveal?: string;
  fullName: string;
  phone: string;
  dateOfBirth: string;
  lookingFor: string;
  preferredPropertyIds: string[];
  status: TenantAccountStatus;
  applicationIds: string[];
  /** Linked ops tenant record when fully approved. */
  tenantRecordId: string;
  propertyId: string;
  propertyName: string;
  unit: string;
  createdAt: string;
  updatedAt: string;
};

export type TenantPortalMessage = {
  id: string;
  tenantAccountId: string;
  tenantEmail: string;
  fromRole: "sales_marketing" | "tenant" | "system";
  subject: string;
  body: string;
  relatedApplicationId: string;
  /** Optional unit availability payload for selection. */
  availabilityJson: string;
  createdAt: string;
  readAt: string;
};

export async function readTenantAccounts(): Promise<TenantAccount[]> {
  const client = await createClient();
  return listSharedRecords<TenantAccount>(client, COLLECTIONS.tenantAccounts);
}

export async function findTenantAccount(email: string) {
  const accounts = await readTenantAccounts();
  return (
    accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase()) ??
    null
  );
}

export async function saveTenantAccount(account: TenantAccount) {
  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantAccounts,
    account.id,
    account as unknown as Record<string, unknown>
  );
}

export async function registerTenantAccount(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  lookingFor?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || input.password.trim().length < 8) {
    return {
      error: "Email and a password of at least 8 characters are required." as const,
    };
  }
  const existing = await findTenantAccount(email);
  if (existing) {
    return { error: "An account with that email already exists. Sign in instead." as const };
  }
  const now = new Date().toISOString();
  const account: TenantAccount = {
    id: crypto.randomUUID(),
    email,
    password: hashPassword(input.password.trim()),
    passwordReveal: input.password.trim(),
    fullName: input.fullName.trim() || "Tenant",
    phone: (input.phone || "").trim(),
    dateOfBirth: (input.dateOfBirth || "").trim(),
    lookingFor: (input.lookingFor || "").trim(),
    preferredPropertyIds: [],
    status: "prospect",
    applicationIds: [],
    tenantRecordId: "",
    propertyId: "",
    propertyName: "",
    unit: "",
    createdAt: now,
    updatedAt: now,
  };
  await saveTenantAccount(account);
  return { ok: true as const, account };
}

export async function verifyTenantPortalLogin(email: string, password: string) {
  const account = await findTenantAccount(email);
  if (!account || !verifyPassword(password, account.password)) {
    return null;
  }
  if (!isHashedPassword(account.password)) {
    const migrated = {
      ...account,
      password: hashPassword(password),
      passwordReveal: account.passwordReveal || password,
      updatedAt: new Date().toISOString(),
    };
    await saveTenantAccount(migrated);
    return migrated;
  }
  return account;
}

export async function setTenantPortalSession(account: TenantAccount) {
  const jar = await cookies();
  jar.set(TENANT_PORTAL_COOKIE, account.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearTenantPortalSession() {
  const jar = await cookies();
  jar.delete(TENANT_PORTAL_COOKIE);
}

export async function getTenantPortalSession(): Promise<TenantAccount | null> {
  const jar = await cookies();
  const id = jar.get(TENANT_PORTAL_COOKIE)?.value;
  if (!id) return null;
  const accounts = await readTenantAccounts();
  return accounts.find((a) => a.id === id) ?? null;
}

export async function postTenantPortalMessage(
  msg: Omit<TenantPortalMessage, "id" | "createdAt" | "readAt"> & {
    id?: string;
  }
) {
  const client = await createClient();
  const row: TenantPortalMessage = {
    id: msg.id || crypto.randomUUID(),
    tenantAccountId: msg.tenantAccountId,
    tenantEmail: msg.tenantEmail,
    fromRole: msg.fromRole,
    subject: msg.subject,
    body: msg.body,
    relatedApplicationId: msg.relatedApplicationId || "",
    availabilityJson: msg.availabilityJson || "",
    createdAt: new Date().toISOString(),
    readAt: "",
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantPortalMessages,
    row.id,
    row as unknown as Record<string, unknown>
  );
  return row;
}
