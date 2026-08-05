import { createClient } from "@/lib/supabase/server";
import {
  emptyManagementContract,
  feeStructureLabel,
  type ManagementContractDraft,
  type PropertyType,
  type SharedPropertyTenant,
} from "@/lib/management-contract";
import type { OwnerAccount, OwnerApplication } from "@/lib/owner-auth";
import type { WorkOrder } from "@/lib/maintenance";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";

function mapCategoryToPropertyType(category: string): PropertyType {
  const c = category.trim().toLowerCase();
  if (
    c === "office" ||
    c === "retail" ||
    c === "industrial" ||
    c === "mixed-use" ||
    c === "multifamily" ||
    c === "other"
  ) {
    return c;
  }
  return "other";
}

/** Properties linked to this owner by account id or email (case-insensitive). */
export async function getPropertiesForOwner(
  owner: OwnerAccount
): Promise<ManagementContractDraft[]> {
  const client = await createClient();
  const all = await listSharedRecords<ManagementContractDraft>(
    client,
    COLLECTIONS.managedProperties
  );
  const email = owner.email.toLowerCase();
  return all.filter((p) => {
    const byId =
      Boolean(p.ownerAccountId) && p.ownerAccountId === owner.id;
    const byEmail =
      Boolean(p.ownerEmail) && p.ownerEmail.trim().toLowerCase() === email;
    return byId || byEmail;
  });
}

export async function getOwnerPropertyById(
  owner: OwnerAccount,
  propertyId: string
): Promise<ManagementContractDraft | null> {
  const properties = await getPropertiesForOwner(owner);
  return properties.find((p) => p.id === propertyId) ?? null;
}

/** Create draft managed properties from an approved application. */
export async function provisionPropertiesFromApplication(
  app: OwnerApplication,
  owner: OwnerAccount
): Promise<ManagementContractDraft[]> {
  const client = await createClient();
  const created: ManagementContractDraft[] = [];

  for (const prop of app.properties) {
    const base = emptyManagementContract();
    const location = prop.location.trim();
    const nameGuess = location.split(",")[0]?.trim() || location;
    const draft: ManagementContractDraft = {
      ...base,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      propertyName: nameGuess,
      streetAddress: location,
      propertyType: mapCategoryToPropertyType(prop.category),
      grossSf: prop.squareFeet.trim(),
      rentableSf: prop.squareFeet.trim(),
      ownerLegalName: app.companyName.trim() || app.fullName.trim(),
      ownerContactName: app.fullName.trim(),
      ownerEmail: app.email.toLowerCase(),
      ownerPhone: app.phone.trim(),
      ownerAccountId: owner.id,
      notes: `Provisioned from owner application ${app.id}`,
    };

    await upsertSharedRecord(
      client,
      COLLECTIONS.managedProperties,
      draft.id,
      draft as unknown as Record<string, unknown>
    );
    created.push(draft);
  }

  return created;
}

export async function getTenantsForProperty(
  property: ManagementContractDraft
): Promise<SharedPropertyTenant[]> {
  const client = await createClient();
  const all = await listSharedRecords<SharedPropertyTenant>(
    client,
    COLLECTIONS.propertyTenants
  );
  const byId = all.filter((t) => t.propertyId === property.id);
  if (byId.length > 0) return byId;

  // Fallback: nested tenants on the contract payload
  return (property.tenants ?? []).map((t) => ({
    ...t,
    propertyId: property.id,
    propertyName: property.propertyName,
  }));
}

export async function getWorkOrdersForProperty(
  property: ManagementContractDraft
): Promise<WorkOrder[]> {
  const client = await createClient();
  const all = await listSharedRecords<WorkOrder>(
    client,
    COLLECTIONS.workOrders
  );
  const name = property.propertyName.trim().toLowerCase();
  const address = property.streetAddress.trim().toLowerCase();
  return all.filter((wo) => {
    const p = wo.property.trim().toLowerCase();
    return (
      (name && (p === name || p.includes(name) || name.includes(p))) ||
      (address && (p === address || p.includes(address)))
    );
  });
}

export function ownerFacingFeeSummary(property: ManagementContractDraft): string {
  const structure = feeStructureLabel(property.feeStructure);
  if (
    property.feeStructure === "flat_monthly" ||
    property.feeStructure === "flat_annual"
  ) {
    return `${structure}${property.feeFlatAmount ? ` · $${property.feeFlatAmount}` : ""}`;
  }
  return `${structure}${property.feePercent ? ` · ${property.feePercent}%` : ""}`;
}

/** Ensure demo owner Bob has at least one linked property for local demos. */
export async function ensureDemoOwnerProperty(owner: OwnerAccount) {
  if (owner.email.toLowerCase() !== "bobowner@building.com") return;

  const existing = await getPropertiesForOwner(owner);
  if (existing.length > 0) return;

  const client = await createClient();
  const base = emptyManagementContract();
  const draft: ManagementContractDraft = {
    ...base,
    id: "00000000-0000-4000-8000-0000000000b1",
    createdAt: new Date().toISOString(),
    propertyName: "Harborline Commons",
    streetAddress: "100 Harbor Way",
    city: "Oxford",
    state: "MS",
    zip: "38655",
    propertyType: "mixed-use",
    unitsSuites: "24",
    rentableSf: "48000",
    grossSf: "52000",
    occupancyPercent: "92",
    tenantCount: "18",
    monthlyRentRoll: "86000",
    arBalance: "4200",
    feeStructure: "percent_collections",
    feePercent: "4",
    leasingCommissionPercent: "3",
    contractStartDate: "2025-01-01",
    contractEndDate: "2027-12-31",
    renewalOptions: "One (1) two-year renewal at Manager's then-current fee schedule",
    terminationNoticeDays: "60",
    exclusiveManagement: true,
    ownerApprovalThreshold: "2500",
    insuranceRequirements:
      "Owner shall maintain property insurance; Manager shall maintain liability coverage customary for commercial property managers.",
    specialTerms:
      "Emergency repairs under $2,500 may proceed without prior Owner approval when required to protect life, safety, or the Property.",
    ownerLegalName: "Bob Owner Holdings LLC",
    ownerEntityType: "LLC",
    ownerContactName: owner.fullName,
    ownerEmail: owner.email,
    ownerPhone: "",
    ownerAccountId: owner.id,
    assignedManager: "Alex Rivera",
    camOrNnnStructure: "NNN",
    notes: "Demo property linked to Bob Owner seed account.",
  };

  await upsertSharedRecord(
    client,
    COLLECTIONS.managedProperties,
    draft.id,
    draft as unknown as Record<string, unknown>
  );
}
