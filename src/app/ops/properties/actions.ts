"use server";

import { revalidatePath } from "next/cache";
import {
  declineOwnerApplication,
  requestOwnerApplicationInfo,
  sendContractForOwnerSignature,
} from "@/lib/owner-auth";
import { createOwnerApproval } from "@/lib/owner-approvals";
import type { FeeStructure, ManagementContractDraft } from "@/lib/management-contract";
import {
  exceedsApprovalThreshold,
  parseAmount,
  resolveThresholdForAmountCheck,
} from "@/lib/owner-approval-policy";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
} from "@/lib/shared-store";
import { canAccessOpsModule } from "@/lib/team-auth";

export type StaffApplicationState = {
  error?: string;
  success?: string;
  temporaryPassword?: string;
};

function reviewerLabel() {
  return "CPMC staff";
}

const FEE_STRUCTURES: FeeStructure[] = [
  "percent_collections",
  "percent_gpr",
  "flat_monthly",
  "flat_annual",
  "hybrid",
];

function parseFeeStructure(raw: string): FeeStructure | undefined {
  return FEE_STRUCTURES.includes(raw as FeeStructure)
    ? (raw as FeeStructure)
    : undefined;
}

export async function sendContractForSignatureAction(
  _prev: StaffApplicationState,
  formData: FormData
): Promise<StaffApplicationState> {
  if (!(await canAccessOpsModule("management"))) {
    return {
      error:
        "Only Management can send contracts for owner signature. Properties staff can view applications but not decide them.",
    };
  }

  const applicationId = String(formData.get("applicationId") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");

  const result = await sendContractForOwnerSignature({
    applicationId,
    reviewedBy: reviewerLabel(),
    reviewNotes,
    terms: {
      contractStartDate: String(formData.get("contractStartDate") ?? ""),
      contractEndDate: String(formData.get("contractEndDate") ?? ""),
      feeStructure: parseFeeStructure(
        String(formData.get("feeStructure") ?? "")
      ),
      feePercent: String(formData.get("feePercent") ?? ""),
      feeFlatAmount: String(formData.get("feeFlatAmount") ?? ""),
      ownerApprovalThreshold: String(
        formData.get("ownerApprovalThreshold") ?? ""
      ),
      renewalOptions: String(formData.get("renewalOptions") ?? ""),
      terminationNoticeDays: String(
        formData.get("terminationNoticeDays") ?? ""
      ),
      assignedManager: String(formData.get("assignedManager") ?? ""),
    },
  });
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/ops/properties");
  revalidatePath("/ops/properties/applications");
  revalidatePath("/ops/management/owners");
  revalidatePath("/owners/status");

  return {
    success: `Contract sent for ${result.fullName} (${result.email}). ${result.propertiesProvisioned} agreement${result.propertiesProvisioned === 1 ? "" : "s"} ready on Check Application Status. The owner signs there to receive a temporary password — no email required.`,
  };
}

export async function declineApplicationAction(
  _prev: StaffApplicationState,
  formData: FormData
): Promise<StaffApplicationState> {
  if (!(await canAccessOpsModule("management"))) {
    return {
      error:
        "Only Management can decline owner applications. Properties staff can view applications but not decide them.",
    };
  }

  const applicationId = String(formData.get("applicationId") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");
  const result = await declineOwnerApplication({
    applicationId,
    reviewedBy: reviewerLabel(),
    reviewNotes,
  });
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/ops/properties");
  revalidatePath("/ops/properties/applications");
  revalidatePath("/ops/management/owners");
  return { success: "Application declined." };
}

export async function requestMoreInfoAction(
  _prev: StaffApplicationState,
  formData: FormData
): Promise<StaffApplicationState> {
  if (!(await canAccessOpsModule("management"))) {
    return {
      error:
        "Only Management can request more information on owner applications. Properties staff can view applications but not decide them.",
    };
  }

  const applicationId = String(formData.get("applicationId") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");
  const result = await requestOwnerApplicationInfo({
    applicationId,
    reviewedBy: reviewerLabel(),
    reviewNotes,
  });
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/ops/properties");
  revalidatePath("/ops/properties/applications");
  revalidatePath("/ops/management/owners");
  return {
    success: "Marked as needs more information. Applicant can see your note on the status page.",
  };
}

export type StaffApprovalRequestState = {
  error?: string;
  success?: string;
};

export async function requestOwnerSpendApproval(
  _prev: StaffApprovalRequestState,
  formData: FormData
): Promise<StaffApprovalRequestState> {
  if (!(await canAccessOpsModule("properties"))) {
    return { error: "Properties access required." };
  }

  const propertyId = String(formData.get("propertyId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const vendorName = String(formData.get("vendorName") ?? "").trim();
  const staffNote = String(formData.get("staffNote") ?? "").trim();
  const workOrderId = String(formData.get("workOrderId") ?? "").trim();
  const amount = parseAmount(amountRaw);

  if (!propertyId || !title) {
    return { error: "Property and title are required." };
  }

  const client = await createClient();
  const properties = await listSharedRecords<ManagementContractDraft>(
    client,
    COLLECTIONS.managedProperties
  );
  const property = properties.find((p) => p.id === propertyId);
  if (!property) {
    return { error: "Property not found." };
  }
  if (!property.ownerEmail?.trim()) {
    return {
      error: "This property has no owner email — link an owner before requesting approval.",
    };
  }

  const threshold = resolveThresholdForAmountCheck(
    property.ownerApprovalThreshold
  );
  if (!exceedsApprovalThreshold(amount, property.ownerApprovalThreshold)) {
    return {
      error: `Amount must be at least the owner approval threshold ($${threshold.toLocaleString()}).`,
    };
  }

  const result = await createOwnerApproval({
    propertyId: property.id,
    propertyName: property.propertyName,
    ownerEmail: property.ownerEmail.trim().toLowerCase(),
    ownerAccountId: property.ownerAccountId || "",
    workOrderId,
    title,
    description,
    amount,
    vendorName,
    staffNote,
    requestedBy: reviewerLabel(),
  });

  revalidatePath("/owners/dashboard/approvals");
  revalidatePath(`/owners/dashboard/properties/${property.id}`);

  return {
    success: `Approval request sent to ${result.approval.ownerEmail} for $${amount.toLocaleString()}.`,
  };
}
