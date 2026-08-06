import { createClient } from "@/lib/supabase/server";
import {
  emptyManagementContract,
  feeStructureLabel,
  type FeeStructure,
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

export type ContractTermsInput = {
  contractStartDate?: string;
  contractEndDate?: string;
  feeStructure?: FeeStructure;
  feePercent?: string;
  feeFlatAmount?: string;
  ownerApprovalThreshold?: string;
  renewalOptions?: string;
  terminationNoticeDays?: string;
  assignedManager?: string;
};

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

/** Create draft managed properties from an application (account optional until owner signs). */
export async function provisionPropertiesFromApplication(
  app: OwnerApplication,
  options?: {
    owner?: OwnerAccount;
    terms?: ContractTermsInput;
  }
): Promise<ManagementContractDraft[]> {
  const client = await createClient();
  const created: ManagementContractDraft[] = [];
  const terms = options?.terms;
  const owner = options?.owner;

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
      ownerAccountId: owner?.id ?? "",
      sourceApplicationId: app.id,
      contractStartDate: terms?.contractStartDate?.trim() || base.contractStartDate,
      contractEndDate: terms?.contractEndDate?.trim() || base.contractEndDate,
      feeStructure: terms?.feeStructure ?? base.feeStructure,
      feePercent: terms?.feePercent?.trim() || base.feePercent,
      feeFlatAmount: terms?.feeFlatAmount?.trim() || base.feeFlatAmount,
      ownerApprovalThreshold:
        terms?.ownerApprovalThreshold?.trim() || base.ownerApprovalThreshold,
      renewalOptions: terms?.renewalOptions?.trim() || base.renewalOptions,
      terminationNoticeDays:
        terms?.terminationNoticeDays?.trim() || base.terminationNoticeDays,
      assignedManager: terms?.assignedManager?.trim() || base.assignedManager,
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

export async function getManagedPropertiesByIds(
  ids: string[]
): Promise<ManagementContractDraft[]> {
  if (ids.length === 0) return [];
  const client = await createClient();
  const all = await listSharedRecords<ManagementContractDraft>(
    client,
    COLLECTIONS.managedProperties
  );
  const idSet = new Set(ids);
  return all.filter((p) => idSet.has(p.id));
}

/** Attach owner account id to properties after the owner signs. */
export async function linkOwnerAccountToProperties(
  propertyIds: string[],
  owner: OwnerAccount,
  signature?: { signedAt: string; signatureName: string }
): Promise<void> {
  if (propertyIds.length === 0) return;
  const client = await createClient();
  const properties = await getManagedPropertiesByIds(propertyIds);
  for (const property of properties) {
    const updated: ManagementContractDraft = {
      ...property,
      ownerAccountId: owner.id,
      ownerEmail: owner.email,
      ownerContactName: owner.fullName || property.ownerContactName,
      ownerSignedAt: signature?.signedAt ?? property.ownerSignedAt,
      ownerSignatureName:
        signature?.signatureName ?? property.ownerSignatureName,
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.managedProperties,
      updated.id,
      updated as unknown as Record<string, unknown>
    );
  }
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

  const demoId = "00000000-0000-4000-8000-0000000000b1";
  const existing = await getPropertiesForOwner(owner);
  const client = await createClient();

  const demoDraft = (base: ReturnType<typeof emptyManagementContract>): ManagementContractDraft => ({
    ...base,
    id: demoId,
    createdAt: new Date().toISOString(),
    // Name matches seeded rental_receivables (Riverbend) so owner revenue demo ties to AR.
    propertyName: "Riverbend Commerce Center",
    streetAddress: "400 Riverbend Pkwy",
    city: "Oxford",
    state: "MS",
    zip: "38655",
    propertyType: "mixed-use",
    unitsSuites: "24",
    rentableSf: "48000",
    grossSf: "52000",
    occupancyPercent: "92",
    tenantCount: "18",
    monthlyRentRoll: "19370",
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
  });

  if (existing.length === 0) {
    await upsertSharedRecord(
      client,
      COLLECTIONS.managedProperties,
      demoId,
      demoDraft(emptyManagementContract()) as unknown as Record<string, unknown>
    );
    return;
  }

  // Migrate legacy Harborline Commons demo row so AR seed property names match.
  const legacy = existing.find(
    (p) =>
      p.id === demoId ||
      p.propertyName.trim().toLowerCase() === "harborline commons"
  );
  if (
    legacy &&
    legacy.propertyName.trim().toLowerCase() !== "riverbend commerce center"
  ) {
    const updated: ManagementContractDraft = {
      ...legacy,
      propertyName: "Riverbend Commerce Center",
      streetAddress: legacy.streetAddress || "400 Riverbend Pkwy",
      monthlyRentRoll: legacy.monthlyRentRoll || "19370",
      feeStructure: legacy.feeStructure || "percent_collections",
      feePercent: legacy.feePercent || "4",
      ownerAccountId: owner.id,
      ownerEmail: owner.email,
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.managedProperties,
      updated.id,
      updated as unknown as Record<string, unknown>
    );
  }
}
