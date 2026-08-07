/**
 * Management fee settlements: rent collected × agreed fee →
 * CPMC AR (misc receivable) + property payable, settled by
 * sweeping cash from the property bank to corporate.
 */

import {
  money,
  operationalRentCollected,
  round2,
  todayIso,
  type Receivable,
} from "@/lib/accounts-receivable";
import type { PayableInvoice } from "@/lib/accounts-payable";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  resolveManagementFee,
  type ManagedFeeFields,
} from "@/lib/owner-payables";
import { monthPeriodLabel, monthSlug, shiftDays } from "@/lib/seed-dates";

export const MGMT_FEE_AR_PREFIX = "mgmt-fee-ar:";
export const MGMT_FEE_AP_PREFIX = "mgmt-fee-ap:";
export const HARBORLINE_VENDOR_NAME = "CPMC Property Management Company";
export const HARBORLINE_VENDOR_ID = "VENDOR-HARBORLINE";

export type ManagementFeePreviewRow = {
  propertyId: string;
  propertyName: string;
  ownerName: string;
  period: string;
  periodSlug: string;
  rentCollected: number;
  feePercent: number;
  feeAmount: number;
  feeSource: "contract" | "default";
  feeStructure?: ManagementContractDraft["feeStructure"];
  receivableId: string;
  payableId: string;
  alreadyGenerated: boolean;
  alreadyCollected: boolean;
  bankBalance: number | null;
};

export function managementFeeReceivableId(
  propertyId: string,
  periodSlug: string
) {
  return `${MGMT_FEE_AR_PREFIX}${propertyId}:${periodSlug}`;
}

export function managementFeePayableId(
  propertyId: string,
  periodSlug: string
) {
  return `${MGMT_FEE_AP_PREFIX}${propertyId}:${periodSlug}`;
}

export function isManagementFeeReceivable(row: Pick<Receivable, "id">) {
  return row.id.startsWith(MGMT_FEE_AR_PREFIX);
}

export function isManagementFeePayable(row: Pick<PayableInvoice, "id">) {
  return row.id.startsWith(MGMT_FEE_AP_PREFIX);
}

export function periodOptions(count = 6) {
  return Array.from({ length: count }, (_, monthsAgo) => ({
    monthsAgo,
    period: monthPeriodLabel(monthsAgo),
    periodSlug: monthSlug(monthsAgo),
  }));
}

export function buildManagementFeePreviews(input: {
  properties: ManagementContractDraft[];
  receivables: Pick<
    Receivable,
    | "id"
    | "property"
    | "period"
    | "category"
    | "amountReceived"
    | "amount"
    | "unit"
    | "description"
    | "customerName"
  >[];
  miscReceivables: Pick<
    Receivable,
    "id" | "amount" | "amountReceived"
  >[];
  payables?: Pick<PayableInvoice, "id" | "amount" | "amountPaid">[];
  propertyTenants?: {
    propertyName?: string;
    status?: string;
    monthlyRent?: string | number;
  }[];
  bankBalancesByPropertyId?: Record<string, number>;
  monthsAgo?: number;
}): ManagementFeePreviewRow[] {
  const monthsAgo = input.monthsAgo ?? 0;
  const period = monthPeriodLabel(monthsAgo);
  const periodSlug = monthSlug(monthsAgo);
  const feeFields = input.properties as ManagedFeeFields[];

  return [...input.properties]
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName))
    .map((property) => {
      const rentCollected = operationalRentCollected(
        input.receivables,
        property.propertyName,
        period,
        input.propertyTenants
      );
      const fee = resolveManagementFee(
        property.propertyName,
        rentCollected,
        feeFields
      );
      const receivableId = managementFeeReceivableId(property.id, periodSlug);
      const payableId = managementFeePayableId(property.id, periodSlug);
      const existingAr = input.miscReceivables.find((r) => r.id === receivableId);
      const existingAp = input.payables?.find((p) => p.id === payableId);
      const alreadyCollected =
        (existingAr != null &&
          round2(existingAr.amountReceived) >= round2(existingAr.amount) - 0.009) ||
        (existingAp != null &&
          round2(existingAp.amountPaid) >= round2(existingAp.amount) - 0.009);

      return {
        propertyId: property.id,
        propertyName: property.propertyName,
        ownerName:
          property.ownerLegalName ||
          property.ownerContactName ||
          property.propertyName,
        period,
        periodSlug,
        rentCollected,
        feePercent: fee.percent,
        feeAmount: fee.amount,
        feeSource: fee.source,
        feeStructure: fee.feeStructure,
        receivableId,
        payableId,
        alreadyGenerated: Boolean(existingAr || existingAp),
        alreadyCollected,
        bankBalance: input.bankBalancesByPropertyId?.[property.id] ?? null,
      };
    });
}

export function buildManagementFeeReceivable(
  row: ManagementFeePreviewRow,
  existing?: Receivable | null
): Receivable {
  const invoiceDate = todayIso();
  return {
    id: row.receivableId,
    receivableId: `MF-${row.periodSlug}-${row.propertyId.slice(0, 8).toUpperCase()}`,
    kind: "miscellaneous",
    customerName: row.ownerName,
    customerId: `PROP-${row.propertyId}`,
    property: row.propertyName,
    unit: "—",
    period: row.period,
    category: "management_fee",
    amount: row.feeAmount,
    amountReceived: existing?.amountReceived ?? 0,
    disputed: false,
    invoiceDate: existing?.invoiceDate || invoiceDate,
    dueDate: existing?.dueDate || shiftDays(15),
    paymentMethod: existing?.paymentMethod || "",
    paymentReference: existing?.paymentReference || "",
    fileName: "",
    description: `Management fee · ${row.period} · ${row.feePercent}% of rent collected`,
    notes: `Auto-generated from rent collected ${money(row.rentCollected)} × ${row.feePercent}% (${row.feeSource === "contract" ? "contract" : "default"} fee). Linked payable ${row.payableId}.`,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
}

export function buildManagementFeePayable(
  row: ManagementFeePreviewRow,
  existing?: PayableInvoice | null
): PayableInvoice {
  const invoiceDate = todayIso();
  return {
    id: row.payableId,
    invoiceNumber: `MF-${row.periodSlug}-${row.propertyId.slice(0, 8).toUpperCase()}`,
    vendorName: HARBORLINE_VENDOR_NAME,
    vendorId: HARBORLINE_VENDOR_ID,
    category: "professional_fees",
    property: row.propertyName,
    amount: row.feeAmount,
    amountPaid: existing?.amountPaid ?? 0,
    disputed: false,
    invoiceDate: existing?.invoiceDate || invoiceDate,
    dueDate: existing?.dueDate || shiftDays(15),
    fileName: "",
    notes: `Management fee payable · ${row.period} · rent collected ${money(row.rentCollected)} × ${row.feePercent}%. Settled by transferring from the property operating bank to CPMC Corporate. Linked receivable ${row.receivableId}.`,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
}
