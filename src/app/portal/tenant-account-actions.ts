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

  if (app.leasePacketStatus === "sent" || app.leasePacketStatus === "signed") {
    return {
      error: "A lease packet is already in progress for this application." as const,
    };
  }
  if (app.unitSelectedFromAvailabilityAt && app.unitId) {
    return {
      error:
        "You already selected a unit for this offer. Contact Sales & Marketing if you need a different option." as const,
    };
  }

  const offered = app.availabilityOfferedUnitIds || [];
  if (!offered.length) {
    return {
      error: "No availability offer is waiting for your selection." as const,
    };
  }
  if (!offered.includes(input.unitId)) {
    return {
      error:
        "That unit was not included in the options Sales & Marketing sent. Pick one of the listed choices." as const,
    };
  }

  const roster = await listSharedRecords<{
    id: string;
    status: string;
    name: string;
  }>(client, COLLECTIONS.propertyTenants);
  const unit = roster.find((u) => u.id === input.unitId);
  if (!unit || (unit.status !== "vacant" && unit.name?.trim())) {
    return {
      error: "That unit is no longer available. Ask Sales & Marketing for updated options." as const,
    };
  }

  const next = {
    ...app,
    propertyId: input.propertyId,
    unitId: input.unitId,
    unitLabel: input.unitLabel,
    building: input.propertyName,
    property: `${input.propertyName} · ${input.unitLabel}`,
    proposedRent: input.askingRent,
    unitSelectedFromAvailabilityAt: new Date().toISOString(),
    preLeaseFormStatus: "pending" as const,
    leasePacketStatus: "not_sent" as const,
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
    status: "pending_application",
    updatedAt: new Date().toISOString(),
  });

  await postTenantPortalMessage({
    tenantAccountId: account.id,
    tenantEmail: account.email,
    fromRole: "tenant",
    subject: `Unit selected · ${input.unitLabel}`,
    body: `I selected ${input.propertyName} · ${input.unitLabel} at $${input.askingRent.toLocaleString()}/mo. Next I will complete the pre-lease information and payment form, then sign the lease.`,
    relatedApplicationId: app.id,
    availabilityJson: "",
  });

  revalidatePath("/portal");
  return { ok: true as const };
}

/** After unit selection: personal info, payment method, rent agreements → unlocks lease signing. */
export async function submitPreLeaseIntakeAction(input: {
  applicationId: string;
  fullName: string;
  phone: string;
  email: string;
  emergencyContact: string;
  paymentMethod: "ach" | "check" | "debit_card";
  achLast4?: string;
  rentDueAck: boolean;
  lateFeeAck: boolean;
  autoPayAck: boolean;
}) {
  const account = await getTenantPortalSession();
  if (!account) return { error: "Sign in required." as const };

  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName || !phone || !email) {
    return { error: "Name, phone, and email are required." as const };
  }
  if (!input.rentDueAck || !input.lateFeeAck || !input.autoPayAck) {
    return {
      error: "Please acknowledge the rent due, late fee, and payment agreements." as const,
    };
  }
  if (
    (input.paymentMethod === "ach" || input.paymentMethod === "debit_card") &&
    !(input.achLast4 || "").trim()
  ) {
    return {
      error: "Enter the last 4 digits for ACH or debit card." as const,
    };
  }

  const client = await createClient();
  const apps = await listSharedRecords<SmTenantApplication>(
    client,
    COLLECTIONS.tenantApplications
  );
  const app = apps.find((a) => a.id === input.applicationId);
  if (!app) return { error: "Application not found." as const };
  if (!app.unitId || !app.unitSelectedFromAvailabilityAt) {
    return { error: "Select a unit before completing this form." as const };
  }
  if (app.leasePacketStatus === "signed" || app.leasePacketStatus === "approved") {
    return { error: "Lease is already in progress or complete." as const };
  }

  const next: SmTenantApplication = {
    ...app,
    name: fullName,
    email,
    phone,
    preLeaseFormStatus: "submitted",
    preLeaseFormSubmittedAt: new Date().toISOString(),
    preLeaseFullName: fullName,
    preLeasePhone: phone,
    preLeaseEmail: email,
    preLeaseEmergencyContact: input.emergencyContact.trim(),
    preLeasePaymentMethod: input.paymentMethod,
    preLeaseAchLast4: (input.achLast4 || "").trim().slice(-4),
    preLeaseRentDueAck: true,
    preLeaseLateFeeAck: true,
    preLeaseAutoPayAck: true,
    // Unlock lease signing without a separate S&M "offer" step
    leasePacketStatus: "sent",
    leaseOfferedAt: new Date().toISOString(),
    status: "In review",
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantApplications,
    app.id,
    next as unknown as Record<string, unknown>
  );

  await saveTenantAccount({
    ...account,
    fullName,
    phone,
    email: email || account.email,
    status: "pending_lease",
    updatedAt: new Date().toISOString(),
  });

  await postTenantPortalMessage({
    tenantAccountId: account.id,
    tenantEmail: account.email,
    fromRole: "tenant",
    subject: "Pre-lease form submitted",
    body: [
      `${fullName} submitted pre-lease information for ${app.building || app.property}${app.unitLabel ? ` · ${app.unitLabel}` : ""}.`,
      `Payment method: ${input.paymentMethod}${input.achLast4 ? ` ····${input.achLast4.trim().slice(-4)}` : ""}.`,
      `Emergency contact: ${input.emergencyContact.trim() || "—"}.`,
      "Agreements acknowledged: rent due date, late fees, and payment authorization. Ready to sign the lease.",
    ].join("\n"),
    relatedApplicationId: app.id,
    availabilityJson: "",
  });

  revalidatePath("/portal");
  revalidatePath("/ops/sales-marketing/applications");
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
      error:
        "Complete the pre-lease information form first, then sign the lease." as const,
    };
  }
  if (app.preLeaseFormStatus !== "submitted") {
    return {
      error: "Submit the pre-lease information and payment form before signing." as const,
    };
  }

  const next = {
    ...app,
    leasePacketStatus: "signed",
    leaseSignedAt: new Date().toISOString(),
    leaseSignedName: input.fullLegalName.trim(),
    smStatus: "reviewing" as const,
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
    status: "pending_lease",
    updatedAt: new Date().toISOString(),
  });

  await postTenantPortalMessage({
    tenantAccountId: account.id,
    tenantEmail: account.email,
    fromRole: "tenant",
    subject: "Lease agreement signed — pending S&M approval",
    body: `${input.fullLegalName.trim()} signed the lease for ${app.building || app.property}${app.unitLabel ? ` · ${app.unitLabel}` : ""}. This is pending Sales & Marketing approval to complete the application and activate tenancy.`,
    relatedApplicationId: app.id,
    availabilityJson: "",
  });

  revalidatePath("/portal");
  revalidatePath("/ops/sales-marketing/applications");
  return { ok: true as const };
}

/** Applicant replies to Sales & Marketing in the portal thread. */
export async function replyToSalesMarketing(input: {
  applicationId?: string;
  subject: string;
  body: string;
}) {
  const account = await getTenantPortalSession();
  if (!account) return { error: "Sign in required." as const };
  const body = input.body.trim();
  if (!body) return { error: "Message cannot be empty." as const };

  await postTenantPortalMessage({
    tenantAccountId: account.id,
    tenantEmail: account.email,
    fromRole: "tenant",
    subject: input.subject.trim() || "Message to Sales & Marketing",
    body,
    relatedApplicationId:
      input.applicationId || account.applicationIds[0] || "",
    availabilityJson: "",
  });

  revalidatePath("/portal");
  revalidatePath("/ops/sales-marketing/applications");
  return { ok: true as const };
}

/** Complete the follow-up form requested by Sales & Marketing. */
export async function submitAdditionalApplicantForms(input: {
  applicationId: string;
  preferredMoveIn: string;
  references: string;
  employmentUpdate: string;
  tourNotes: string;
  householdSize: string;
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

  const supplement = [
    input.preferredMoveIn
      ? `Preferred move-in: ${input.preferredMoveIn}`
      : "",
    input.householdSize ? `Household size: ${input.householdSize}` : "",
    input.employmentUpdate
      ? `Employment update: ${input.employmentUpdate}`
      : "",
    input.references ? `References: ${input.references}` : "",
    input.tourNotes ? `Tour notes: ${input.tourNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const next = {
    ...app,
    notes: [app.notes, "— Follow-up form —", supplement]
      .filter(Boolean)
      .join("\n"),
    documentsComplete: true,
    status: "In review" as const,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantApplications,
    app.id,
    next as unknown as Record<string, unknown>
  );

  await postTenantPortalMessage({
    tenantAccountId: account.id,
    tenantEmail: account.email,
    fromRole: "tenant",
    subject: "Follow-up form submitted",
    body: supplement || "Applicant completed the additional information form.",
    relatedApplicationId: app.id,
    availabilityJson: "",
  });

  revalidatePath("/portal");
  revalidatePath("/ops/sales-marketing/applications");
  return { ok: true as const };
}
