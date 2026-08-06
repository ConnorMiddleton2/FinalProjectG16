/**
 * Demo-cycle handoffs: tenant accept → roster + A/R, portal WO → ops,
 * and owner remittance suggestions from live collections + contract fee.
 */

import {
  rentCollectedFromReceivables,
  round2,
  type Receivable,
} from "@/lib/accounts-receivable";
import type {
  ManagementContractDraft,
  SharedPropertyTenant,
} from "@/lib/management-contract";
import type { WorkOrder, WorkOrderCategory, WorkOrderPriority } from "@/lib/maintenance";
import {
  computeNetDue,
  resolveManagementFee,
  type OwnerPayable,
} from "@/lib/owner-payables";
import type { MaintenanceFormValues } from "@/lib/portal/maintenance-types";
import type { SmTenantApplication } from "@/lib/sales-marketing";
import { monthDay, monthPeriodLabel, monthSlug } from "@/lib/seed-dates";

export type TenantApplicationLeaseFields = SmTenantApplication & {
  unit?: string;
  monthlyRent?: string;
  propertyId?: string;
};

function parseMoney(raw: string | undefined): number {
  if (!raw?.trim()) return 0;
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? round2(n) : 0;
}

/** Stable roster id so re-approving the same application does not duplicate. */
export function propertyTenantIdForApplication(applicationId: string) {
  return `pt-app:${applicationId}`;
}

/** Stable A/R id for the first month of rent from an approved application. */
export function receivableIdForApplication(applicationId: string) {
  return `ar-app:${applicationId}`;
}

export function resolvePropertyForApplication(
  app: TenantApplicationLeaseFields,
  managed: ManagementContractDraft[]
) {
  const propertyName = (app.building || app.property || "").trim();
  if (app.propertyId) {
    const byId = managed.find((p) => p.id === app.propertyId);
    if (byId) return byId;
  }
  const needle = propertyName.toLowerCase();
  return (
    managed.find((p) => p.propertyName.trim().toLowerCase() === needle) ??
    managed.find((p) =>
      needle.includes(p.propertyName.trim().toLowerCase())
    ) ??
    null
  );
}

export function buildPropertyTenantFromApplication(
  app: TenantApplicationLeaseFields,
  managed: ManagementContractDraft[]
): SharedPropertyTenant | null {
  const property = resolvePropertyForApplication(app, managed);
  if (!property) return null;

  const unit =
    app.unit?.trim() ||
    app.roomSize?.trim() ||
    "";
  const rent = app.monthlyRent?.trim() || "";

  return {
    id: propertyTenantIdForApplication(app.id),
    propertyId: property.id,
    propertyName: property.propertyName,
    unit,
    name: app.name.trim() || "Tenant",
    email: app.email.trim(),
    phone: "",
    leaseStart: new Date().toISOString().slice(0, 10),
    leaseEnd: "",
    monthlyRent: rent || String(parseMoney(rent) || ""),
    sqft: "",
    status: "active",
  };
}

export function buildReceivableFromApplication(
  app: TenantApplicationLeaseFields,
  managed: ManagementContractDraft[]
): Receivable | null {
  const property = resolvePropertyForApplication(app, managed);
  const amount = parseMoney(app.monthlyRent);
  if (!property || amount <= 0) return null;

  const period = monthPeriodLabel(0);
  const invoiceDate = monthDay(0, 1);
  const dueDate = monthDay(0, 5);
  const unit = app.unit?.trim() || app.roomSize?.trim() || "";
  const code = monthSlug(0).replace("-", "");

  return {
    id: receivableIdForApplication(app.id),
    receivableId: `AR-${code}-APP`,
    kind: "rental",
    customerName: app.name.trim() || "Tenant",
    customerId: `T-APP-${app.id.slice(0, 6).toUpperCase()}`,
    property: property.propertyName,
    unit,
    period,
    category: "base_rent",
    amount,
    amountReceived: 0,
    disputed: false,
    invoiceDate,
    dueDate,
    paymentMethod: "",
    paymentReference: "",
    fileName: `${app.name.trim().toLowerCase().replace(/\s+/g, "-") || "tenant"}-rent.pdf`,
    description: `Base rent · ${period}`,
    notes: `Created from approved tenant application ${app.id}.`,
    createdAt: new Date().toISOString(),
  };
}

function mapPortalCategory(
  category: MaintenanceFormValues["category"]
): WorkOrderCategory {
  switch (category) {
    case "Plumbing":
      return "plumbing";
    case "Electrical":
      return "electrical";
    case "Heating or Cooling":
      return "hvac";
    case "Appliance":
      return "appliance";
    case "Structural":
      return "structural";
    case "Lock or Security":
      return "security";
    case "Common Area":
    case "Pest Control":
    case "Other":
    default:
      return category === "Common Area" ? "janitorial" : "general";
  }
}

function mapPortalPriority(
  priority: MaintenanceFormValues["priority"]
): WorkOrderPriority {
  switch (priority) {
    case "Low":
      return "low";
    case "High":
      return "high";
    case "Emergency":
      return "emergency";
    default:
      return "normal";
  }
}

/** Parse "Property · Unit" style labels from the portal form. */
export function splitPropertyOrUnit(raw: string): {
  property: string;
  unit: string;
} {
  const text = raw.trim();
  if (!text) return { property: "", unit: "" };
  const parts = text.split(/·|—|-/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { property: parts[0], unit: parts.slice(1).join(" · ") };
  }
  return { property: text, unit: "" };
}

export function buildWorkOrderFromPortalRequest(input: {
  id: string;
  requestNumber: string;
  values: MaintenanceFormValues;
  requestedBy: string;
}): WorkOrder {
  const { property, unit } = splitPropertyOrUnit(input.values.propertyOrUnit);
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: input.id,
    title: input.values.title.trim() || input.requestNumber,
    category: mapPortalCategory(input.values.category),
    property: property || "Managed property",
    unit: unit || input.values.locationInUnit.trim() || "",
    description: [
      input.values.description.trim(),
      input.values.locationInUnit
        ? `Location in unit: ${input.values.locationInUnit.trim()}`
        : "",
      `Portal request ${input.requestNumber}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    status: "pending",
    priority: mapPortalPriority(input.values.priority),
    source: "tenant_submitted",
    labor: "in_house",
    vendorName: "",
    estimatedCost: "",
    actualCost: "",
    requestedBy: input.requestedBy || input.values.contactName || "Tenant",
    createdAt: today,
    dueDate: input.values.preferredServiceDate || "",
    completedAt: "",
  };
}

/**
 * Build a monthly owner remittance when collected rent exists for a managed
 * property/period and no remittance row is on file yet.
 */
export function buildMissingOwnerRemittance(input: {
  property: ManagementContractDraft;
  period: string;
  receivables: Receivable[];
  existing: OwnerPayable[];
}): OwnerPayable | null {
  const propertyName = input.property.propertyName.trim();
  if (!propertyName) return null;

  const already = input.existing.some(
    (row) =>
      row.paymentType === "monthly_distribution" &&
      row.property.trim().toLowerCase() === propertyName.toLowerCase() &&
      row.period === input.period
  );
  if (already) return null;

  const grossRentCollected = rentCollectedFromReceivables(
    input.receivables,
    propertyName,
    input.period
  );
  if (grossRentCollected <= 0) return null;

  const fee = resolveManagementFee(
    propertyName,
    grossRentCollected,
    [input.property]
  );
  const reimbursableExpenses = 0;
  const reservesWithheld = 0;
  const amount = computeNetDue({
    grossRentCollected,
    managementFeeAmount: fee.amount,
    reimbursableExpenses,
    reservesWithheld,
  });
  if (amount <= 0 && fee.amount <= 0) return null;

  const slug = monthSlug(0);
  const code = propertyName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase() || "OWN";
  const paymentId = `OWN-${slug}-${code}-${input.property.id.slice(0, 4)}`;

  return {
    id: `op-live-${input.property.id}-${slug}`,
    paymentId,
    ownerName:
      input.property.ownerLegalName.trim() ||
      input.property.ownerContactName.trim() ||
      "Property owner",
    ownerId: input.property.ownerAccountId || `OWN-${input.property.id.slice(0, 6)}`,
    property: propertyName,
    period: input.period,
    paymentType: "monthly_distribution",
    grossRentCollected,
    managementFeePercent: fee.percent,
    managementFeeAmount: fee.amount,
    reimbursableExpenses,
    reservesWithheld,
    amount,
    amountPaid: 0,
    onHold: false,
    statementApproved: true,
    invoiceDate: monthDay(0, 1),
    dueDate: monthDay(0, 15),
    paymentMethod: "ach",
    paymentReference: "",
    fileName: `${paymentId.toLowerCase()}-owner-statement.pdf`,
    notes: `Auto-created from A/R collections · Harborline ${fee.percent}% management fee.`,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}
