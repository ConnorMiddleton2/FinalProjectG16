import type { PayableCategory, PayableInvoice } from "@/lib/accounts-payable";
import { round2 } from "@/lib/accounts-payable";
import type { ApPayable } from "@/lib/management";

const AP_QUEUE_INVOICE_PREFIX = "apq:";

export function payableInvoiceIdForApQueue(apId: string) {
  return `${AP_QUEUE_INVOICE_PREFIX}${apId}`;
}

export function isApQueuePayableInvoice(invoice: PayableInvoice) {
  return invoice.id.startsWith(AP_QUEUE_INVOICE_PREFIX);
}

function categoryFromApPayable(ap: ApPayable): PayableCategory {
  if (ap.source === "maintenance" || ap.department === "maintenance") {
    return "maintenance";
  }
  if (ap.department === "sales_marketing") return "professional_fees";
  if (ap.department === "accounts_payable") return "utilities";
  return "other";
}

function propertyFromApPayable(ap: ApPayable): string {
  const match = ap.description.match(/Property:\s*([^·]+)/i);
  return match?.[1]?.trim() ?? "";
}

/** Map a management queue row into an operating-expense vendor invoice. */
export function buildPayableInvoiceFromApQueue(
  ap: ApPayable,
  existing?: PayableInvoice | null
): PayableInvoice {
  const amount = round2(ap.amount);
  const amountPaid = ap.status === "paid" ? amount : 0;
  const invoiceDate =
    ap.approvedByManagementAt?.slice(0, 10) ||
    ap.receivedAt.slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  return {
    id: existing?.id ?? payableInvoiceIdForApQueue(ap.id),
    invoiceNumber: ap.code.trim() || ap.id,
    vendorName: ap.vendor,
    vendorId: existing?.vendorId ?? "",
    category: categoryFromApPayable(ap),
    property: propertyFromApPayable(ap),
    amount,
    amountPaid,
    disputed: false,
    invoiceDate,
    dueDate: existing?.dueDate ?? "",
    fileName: ap.fileName,
    notes: [
      ap.description,
      `Management queue · ${ap.departmentLabel}`,
      ap.notes,
    ]
      .filter(Boolean)
      .join(" · "),
    createdAt: existing?.createdAt ?? ap.receivedAt,
  };
}

export function findPayableInvoiceForApQueue(
  ap: ApPayable,
  invoices: PayableInvoice[]
): PayableInvoice | undefined {
  const id = payableInvoiceIdForApQueue(ap.id);
  return invoices.find((inv) => inv.id === id);
}

function operatingExpenseOutOfSync(
  before: PayableInvoice,
  after: PayableInvoice
): boolean {
  return (
    before.amount !== after.amount ||
    before.amountPaid !== after.amountPaid ||
    before.vendorName !== after.vendorName ||
    before.invoiceNumber !== after.invoiceNumber ||
    before.category !== after.category ||
    before.property !== after.property ||
    before.invoiceDate !== after.invoiceDate ||
    before.fileName !== after.fileName ||
    before.notes !== after.notes
  );
}

/** Upsert the operating-expense invoice that mirrors an AP queue row. */
export async function syncApQueueToOperatingExpense(
  ap: ApPayable,
  invoices: PayableInvoice[],
  saveInvoice: (invoice: PayableInvoice) => Promise<void>
) {
  const existing = findPayableInvoiceForApQueue(ap, invoices);
  const next = buildPayableInvoiceFromApQueue(ap, existing);
  if (!existing || operatingExpenseOutOfSync(existing, next)) {
    await saveInvoice(next);
  }
}

/** Queue an approved expense and mirror it into operating expenses. */
export async function queueApPayableAndSyncToOperatingExpense(
  apItems: ApPayable[],
  saveAp: (ap: ApPayable) => Promise<void>,
  invoices: PayableInvoice[],
  saveInvoice: (invoice: PayableInvoice) => Promise<void>,
  createAp: () => ApPayable,
  sourceExpenseId: string
) {
  let ap = apItems.find((p) => p.sourceExpenseId === sourceExpenseId);
  if (!ap) {
    ap = createAp();
    await saveAp(ap);
  }
  await syncApQueueToOperatingExpense(ap, invoices, saveInvoice);
}
