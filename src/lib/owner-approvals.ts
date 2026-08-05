import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { OwnerExpenditureApproval } from "@/lib/owner-approval-policy";

export type {
  OwnerApprovalStatus,
  OwnerExpenditureApproval,
} from "@/lib/owner-approval-policy";
export {
  OWNER_SPEND_APPROVAL_THRESHOLD,
  parseAmount,
  resolveThresholdForAmountCheck,
  exceedsApprovalThreshold,
} from "@/lib/owner-approval-policy";

export async function listOwnerApprovals(): Promise<OwnerExpenditureApproval[]> {
  const client = await createClient();
  return listSharedRecords<OwnerExpenditureApproval>(
    client,
    COLLECTIONS.ownerApprovals
  );
}

export async function getApprovalsForOwner(
  ownerEmail: string
): Promise<OwnerExpenditureApproval[]> {
  const email = ownerEmail.trim().toLowerCase();
  const all = await listOwnerApprovals();
  return all.filter((a) => a.ownerEmail.toLowerCase() === email);
}

export async function getPendingApprovalsForOwner(ownerEmail: string) {
  const rows = await getApprovalsForOwner(ownerEmail);
  return rows.filter((a) => a.status === "pending");
}

export async function getApprovalById(id: string) {
  const all = await listOwnerApprovals();
  return all.find((a) => a.id === id) ?? null;
}

export async function createOwnerApproval(
  input: Omit<
    OwnerExpenditureApproval,
    "id" | "createdAt" | "status" | "ownerComment" | "decidedAt" | "decidedBy"
  >
) {
  const row: OwnerExpenditureApproval = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    ownerComment: "",
    decidedAt: "",
    decidedBy: "",
    createdAt: new Date().toISOString(),
  };

  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApprovals,
    row.id,
    row as unknown as Record<string, unknown>
  );
  return { ok: true as const, approval: row };
}

export async function decideOwnerApproval(input: {
  approvalId: string;
  ownerEmail: string;
  decision: "approved" | "rejected";
  comment: string;
}) {
  const approval = await getApprovalById(input.approvalId);
  if (!approval) {
    return { error: "Approval request not found." as const };
  }
  if (approval.ownerEmail.toLowerCase() !== input.ownerEmail.toLowerCase()) {
    return { error: "You cannot decide this request." as const };
  }
  if (approval.status !== "pending") {
    return { error: "This request was already decided." as const };
  }

  const updated: OwnerExpenditureApproval = {
    ...approval,
    status: input.decision,
    ownerComment: input.comment.trim(),
    decidedAt: new Date().toISOString(),
    decidedBy: input.ownerEmail.toLowerCase(),
  };

  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApprovals,
    updated.id,
    updated as unknown as Record<string, unknown>
  );
  return { ok: true as const, approval: updated };
}
