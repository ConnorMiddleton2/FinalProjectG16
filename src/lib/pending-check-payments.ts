/**
 * Tenant-reported check payments that must be approved by Accounts Receivable
 * before funds are posted to the property bank and applied to rent AR.
 */

export type PendingCheckDelivery = "mailed" | "handed";

export type PendingCheckPaymentStatus =
  | "pending_ar"
  | "approved"
  | "declined";

export type PendingCheckPayment = {
  id: string;
  tenantAccountId: string;
  tenantEmail: string;
  tenantName: string;
  tenantRecordId: string;
  propertyId: string;
  propertyName: string;
  unit: string;
  amount: number;
  delivery: PendingCheckDelivery;
  status: PendingCheckPaymentStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  bankTxnId?: string;
  confirmationNumber?: string;
};

export function pendingCheckLabel(p: PendingCheckPayment) {
  const how = p.delivery === "mailed" ? "Mailed" : "Handed to management";
  return `Check · ${how} · $${p.amount.toFixed(2)}`;
}
