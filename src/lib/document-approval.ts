import type {
  DocumentApprovalStatus,
  MaintenanceDocument,
} from "@/lib/maintenance";

/**
 * When true, invoices/receipts are auto-approved on submit.
 * Flip to false (or replace submitDocumentForApproval) when Management
 * owns real review at /ops/management.
 */
export const AUTO_APPROVE_DOCUMENTS = true;

const SYSTEM_AUTO_APPROVER = "system-auto";

/**
 * Send a document to management for approval.
 * Today: auto-approves immediately so Maintenance behavior is unchanged.
 * Later: leave status pending for the Management inbox to call applyDocumentApproval.
 */
export function submitDocumentForApproval(
  doc: MaintenanceDocument
): MaintenanceDocument {
  const submittedForApprovalAt =
    doc.submittedForApprovalAt ||
    doc.submittedAt ||
    new Date().toISOString();

  if (AUTO_APPROVE_DOCUMENTS) {
    return applyDocumentApproval(
      {
        ...doc,
        submittedForApprovalAt,
        approvalStatus: "pending",
        approvedAt: "",
        approvedBy: "",
        rejectionReason: "",
      },
      { status: "approved", approvedBy: SYSTEM_AUTO_APPROVER }
    );
  }

  return {
    ...doc,
    approvalStatus: "pending",
    submittedForApprovalAt,
    approvedAt: "",
    approvedBy: "",
    rejectionReason: "",
  };
}

/** Management (or auto-approve) applies an approve/reject decision. */
export function applyDocumentApproval(
  doc: MaintenanceDocument,
  decision: {
    status: Extract<DocumentApprovalStatus, "approved" | "rejected">;
    approvedBy: string;
    rejectionReason?: string;
  }
): MaintenanceDocument {
  const now = new Date().toISOString();
  if (decision.status === "approved") {
    return {
      ...doc,
      approvalStatus: "approved",
      approvedAt: now,
      approvedBy: decision.approvedBy,
      rejectionReason: "",
    };
  }
  return {
    ...doc,
    approvalStatus: "rejected",
    approvedAt: "",
    approvedBy: decision.approvedBy,
    rejectionReason: decision.rejectionReason?.trim() || "",
  };
}
