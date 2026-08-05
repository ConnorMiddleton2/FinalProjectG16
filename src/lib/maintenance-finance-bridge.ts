/**
 * Capability for future merge; does not write to Accounts Payable.
 *
 * Maps Maintenance documents into PayableInvoice-shaped objects in memory only.
 * Callers must not upsert into payable_invoices / ap_payables from this module.
 */

import type { PayableInvoice, PayableStatus } from "@/lib/accounts-payable";
import {
  generateMaintenanceInvoiceNumber,
  normalizeMaintenanceDocument,
  workOrderCategoryToPayableCategory,
  type MaintenanceDocument,
} from "@/lib/maintenance";
import { round2 } from "@/lib/money";

export function maintenanceDocBalance(doc: MaintenanceDocument): number {
  const n = normalizeMaintenanceDocument(doc);
  return Math.max(0, round2(n.amount - n.amountPaid));
}

export function maintenanceDocPayableStatus(
  doc: MaintenanceDocument
): PayableStatus {
  const n = normalizeMaintenanceDocument(doc);
  if (n.disputed) return "disputed";
  if (maintenanceDocBalance(n) <= 0 && n.amount > 0) return "paid";
  if (n.amountPaid > 0) return "partially_paid";
  return "unpaid";
}

export function maintenanceDocPayableStatusLabel(doc: MaintenanceDocument) {
  switch (maintenanceDocPayableStatus(doc)) {
    case "paid":
      return "Paid";
    case "partially_paid":
      return "Partially paid";
    case "disputed":
      return "Disputed";
    default:
      return "Unpaid";
  }
}

/**
 * Build a PayableInvoice-shaped draft from a Maintenance document.
 * In-memory only — does not save to Accounts Payable.
 */
export function toPayableInvoiceDraft(
  doc: MaintenanceDocument,
  opts?: { id?: string }
): PayableInvoice {
  const n = normalizeMaintenanceDocument(doc);
  const id = opts?.id ?? n.id;
  const payableCategory =
    n.payableCategory ||
    workOrderCategoryToPayableCategory(n.category) ||
    "other";

  return {
    id,
    invoiceNumber:
      n.invoiceNumber.trim() || generateMaintenanceInvoiceNumber(id),
    vendorName: n.vendorName,
    vendorId: n.vendorId,
    category: payableCategory,
    property: n.property,
    amount: round2(n.amount),
    amountPaid: round2(n.amountPaid),
    disputed: n.disputed,
    invoiceDate: n.invoiceDate || n.documentDate,
    dueDate: n.dueDate,
    fileName: n.fileName,
    notes: [
      n.notes,
      n.workOrderId ? `Maintenance workOrderId=${n.workOrderId}` : "",
      `Source: maintenance_documents (${n.kind})`,
    ]
      .filter(Boolean)
      .join(" · "),
    createdAt: n.submittedAt || new Date().toISOString(),
  };
}

/**
 * Future: map a Maintenance back-charge into an AR miscellaneous receivable draft.
 * Not implemented for UI — do not create AR rows.
 */
export function toMiscellaneousReceivableDraft(_doc: MaintenanceDocument): never {
  throw new Error(
    "toMiscellaneousReceivableDraft is not implemented; Maintenance does not write to AR."
  );
}
