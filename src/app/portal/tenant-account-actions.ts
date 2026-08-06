"use server";

import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { SmTenantApplication } from "@/lib/sales-marketing";
import {
  getTenantPortalSession,
  postTenantPortalMessage,
  saveTenantAccount,
  type TenantPortalMessage,
} from "@/lib/tenant-portal-accounts";
import { revalidatePath } from "next/cache";

export async function listMyPortalMessages() {
  const account = await getTenantPortalSession();
  if (!account) return [];
  const client = await createClient();
  const all = await listSharedRecords<TenantPortalMessage>(
    client,
    COLLECTIONS.tenantPortalMessages
  );
  return all
    .filter(
      (m) =>
        m.tenantAccountId === account.id ||
        m.tenantEmail.toLowerCase() === account.email.toLowerCase()
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function listMyApplications() {
  const account = await getTenantPortalSession();
  if (!account) return [];
  const client = await createClient();
  const apps = await listSharedRecords<SmTenantApplication>(
    client,
    COLLECTIONS.tenantApplications
  );
  return apps
    .filter(
      (a) =>
        a.email.toLowerCase() === account.email.toLowerCase() ||
        (a as { tenantAccountId?: string }).tenantAccountId === account.id
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function selectUnitFromAvailability(input: {
  applicationId: string;
  unitId: string;
  propertyId: string;
  propertyName: string;
  unitLabel: string;
  askingRent: number;
}) {
  const account = await getTenantPortalSession();
  if (!account) return { error: "Sign in required." as const };

  const client = await createClient();
  const apps = await listSharedRecords<SmTenantApplication>(
    client,
    COLLECTIONS.tenantApplications
  );
  const app = apps.find((a) => a.id === input.applicationId);
  if (!app) return { error: "Application not found." as const };

  const next = {
    ...app,
    propertyId: input.propertyId,
    unitId: input.unitId,
    unitLabel: input.unitLabel,
    building: input.propertyName,
    property: `${input.propertyName} · ${input.unitLabel}`,
    proposedRent: input.askingRent,
    status: "In review" as const,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantApplications,
    app.id,
    next as unknown as Record<string, unknown>
  );

  await saveTenantAccount({
    ...account,
    propertyId: input.propertyId,
    propertyName: input.propertyName,
    unit: input.unitLabel,
    updatedAt: new Date().toISOString(),
  });

  await postTenantPortalMessage({
    tenantAccountId: account.id,
    tenantEmail: account.email,
    fromRole: "tenant",
    subject: `Unit selected · ${input.unitLabel}`,
    body: `I selected ${input.propertyName} · ${input.unitLabel} at $${input.askingRent.toLocaleString()}/mo.`,
    relatedApplicationId: app.id,
    availabilityJson: "",
  });

  revalidatePath("/portal");
  return { ok: true as const };
}

export async function signLeasePacketAction(input: {
  applicationId: string;
  fullLegalName: string;
  acknowledge: boolean;
}) {
  const account = await getTenantPortalSession();
  if (!account) return { error: "Sign in required." as const };
  if (!input.acknowledge || !input.fullLegalName.trim()) {
    return {
      error: "Enter your full legal name and acknowledge the lease terms." as const,
    };
  }

  const client = await createClient();
  const apps = await listSharedRecords<SmTenantApplication>(
    client,
    COLLECTIONS.tenantApplications
  );
  const app = apps.find((a) => a.id === input.applicationId);
  if (!app) return { error: "Application not found." as const };

  const leaseStatus = (app as { leasePacketStatus?: string }).leasePacketStatus;
  if (leaseStatus !== "sent" && leaseStatus !== "signed") {
    return {
      error: "No lease packet is waiting for your signature yet." as const,
    };
  }

  const next = {
    ...app,
    leasePacketStatus: "signed",
    leaseSignedAt: new Date().toISOString(),
    leaseSignedName: input.fullLegalName.trim(),
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantApplications,
    app.id,
    next as unknown as Record<string, unknown>
  );

  await saveTenantAccount({
    ...account,
    status: "pending_lease",
    updatedAt: new Date().toISOString(),
  });

  await postTenantPortalMessage({
    tenantAccountId: account.id,
    tenantEmail: account.email,
    fromRole: "tenant",
    subject: "Lease packet signed",
    body: `${input.fullLegalName.trim()} signed the lease packet. Awaiting Sales & Marketing final confirmation.`,
    relatedApplicationId: app.id,
    availabilityJson: "",
  });

  revalidatePath("/portal");
  return { ok: true as const };
}
