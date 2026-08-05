/** Client-safe approval policy helpers (no server / next/headers imports). */

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

export type OwnerApprovalStatus = "pending" | "approved" | "rejected";

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
