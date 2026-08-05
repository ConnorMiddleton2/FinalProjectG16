import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";

/** Dollar threshold above which staff should request owner approval. */
export const OWNER_SPEND_APPROVAL_THRESHOLD = 2500;

export function parseAmount(value: string): number {
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Resolve numeric threshold from optional contract field or app default. */
export function resolveThresholdForAmountCheck(
  contractThreshold?: string | null
): number {
  const raw = (contractThreshold ?? "").trim();
  if (raw) {
    const n = Number(raw.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return OWNER_SPEND_APPROVAL_THRESHOLD;
}

export function exceedsApprovalThreshold(
  amount: number | string,
  contractThreshold?: string | null
): boolean {
  const n = typeof amount === "number" ? amount : parseAmount(amount);
  return n >= resolveThresholdForAmountCheck(contractThreshold);
}

export type OwnerApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";

export type OwnerExpenditureApproval = {
  id: string;
  propertyId: string;
  propertyName: string;
  ownerEmail: string;
  ownerAccountId: string;
  workOrderId: string;
  title: string;
  description: string;
  amount: number;
  vendorName: string;
  status: OwnerApprovalStatus;
  staffNote: string;
  ownerComment: string;
  requestedBy: string;
  createdAt: string;
  decidedAt: string;
  decidedBy: string;
};

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
