export type PropertyType =
  | "office"
  | "retail"
  | "industrial"
  | "mixed-use"
  | "multifamily"
  | "other";

export type FeeStructure =
  | "percent_collections"
  | "percent_gpr"
  | "flat_monthly"
  | "flat_annual"
  | "hybrid";

export type ManagementContractDraft = {
  id: string;
  createdAt: string;

  // Asset identity
  propertyName: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  parcelTaxId: string;
  propertyType: PropertyType;
  yearBuilt: string;
  yearRenovated: string;
  buildings: string;
  floors: string;
  unitsSuites: string;
  grossSf: string;
  rentableSf: string;
  parkingSpaces: string;
  zoning: string;
  amenities: string;

  // Owner / engagement
  ownerLegalName: string;
  ownerEntityType: string;
  ownerContactName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerMailingAddress: string;
  contractStartDate: string;
  contractEndDate: string;
  renewalOptions: string;
  terminationNoticeDays: string;
  exclusiveManagement: boolean;

  // Fee structure
  feeStructure: FeeStructure;
  feePercent: string;
  feeFlatAmount: string;
  leasingCommissionPercent: string;
  constructionMgmtFeePercent: string;
  otherFeeNotes: string;

  // Operating metrics
  occupancyPercent: string;
  tenantCount: string;
  monthlyRentRoll: string;
  annualGpr: string;
  annualOperatingExpenses: string;
  annualNoi: string;
  capRatePercent: string;
  arBalance: string;
  securityDepositsHeld: string;
  reserveBalance: string;
  camOrNnnStructure: string;
  insuranceRequirements: string;
  majorLeaseExpirations: string;

  // Operations handoff
  assignedManager: string;
  preferredVendors: string;
  knownIssues: string;
  specialTerms: string;
  notes: string;

  /** Optional saved tenant roster for the managed asset */
  tenants?: PropertyTenant[];
};

export type PropertyTenant = {
  id: string;
  unit: string;
  name: string;
  email: string;
  phone: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
  sqft: string;
  status: "active" | "notice" | "vacant";
};

export const emptyManagementContract = (): Omit<
  ManagementContractDraft,
  "id" | "createdAt"
> => ({
  propertyName: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  county: "",
  parcelTaxId: "",
  propertyType: "office",
  yearBuilt: "",
  yearRenovated: "",
  buildings: "1",
  floors: "",
  unitsSuites: "",
  grossSf: "",
  rentableSf: "",
  parkingSpaces: "",
  zoning: "",
  amenities: "",

  ownerLegalName: "",
  ownerEntityType: "LLC",
  ownerContactName: "",
  ownerEmail: "",
  ownerPhone: "",
  ownerMailingAddress: "",
  contractStartDate: "",
  contractEndDate: "",
  renewalOptions: "",
  terminationNoticeDays: "30",
  exclusiveManagement: true,

  feeStructure: "percent_collections",
  feePercent: "4",
  feeFlatAmount: "",
  leasingCommissionPercent: "",
  constructionMgmtFeePercent: "",
  otherFeeNotes: "",

  occupancyPercent: "",
  tenantCount: "",
  monthlyRentRoll: "",
  annualGpr: "",
  annualOperatingExpenses: "",
  annualNoi: "",
  capRatePercent: "",
  arBalance: "",
  securityDepositsHeld: "",
  reserveBalance: "",
  camOrNnnStructure: "NNN",
  insuranceRequirements: "",
  majorLeaseExpirations: "",

  assignedManager: "",
  preferredVendors: "",
  knownIssues: "",
  specialTerms: "",
  notes: "",
  tenants: [],
});

/** Build a tenant roster from saved data or synthesize one from intake metrics. */
export function getPropertyTenants(
  contract: ManagementContractDraft
): PropertyTenant[] {
  if (contract.tenants && contract.tenants.length > 0) {
    return contract.tenants;
  }

  const count = Math.max(0, Number(contract.tenantCount) || 0);
  const rentable = Number(contract.rentableSf) || 0;
  const monthlyRoll = Number(contract.monthlyRentRoll) || 0;
  const perTenantRent =
    count > 0 && monthlyRoll > 0
      ? Math.round(monthlyRoll / count)
      : 0;
  const perTenantSf =
    count > 0 && rentable > 0 ? Math.round(rentable / count) : 0;

  const demoNames = [
    "Northwind Advisors LLC",
    "Brightleaf Dental",
    "Summit Legal Group",
    "Harbor Cafe Co.",
    "Lumen Creative Studio",
    "Oak & Pine Wealth",
    "Delta Logistics Desk",
    "Vista Tech Partners",
  ];

  const tenants: PropertyTenant[] = [];
  for (let i = 0; i < count; i++) {
    const unitNum = 100 + (i + 1) * 10;
    tenants.push({
      id: `${contract.id}-tenant-${i + 1}`,
      unit: `Suite ${unitNum}`,
      name: demoNames[i % demoNames.length],
      email: `leasing${i + 1}@example.com`,
      phone: `(662) 555-01${String(20 + i).padStart(2, "0")}`,
      leaseStart: contract.contractStartDate || "2025-01-01",
      leaseEnd:
        i === 0 && contract.majorLeaseExpirations
          ? "2027-03-01"
          : `202${6 + (i % 3)}-0${(i % 9) + 1}-15`,
      monthlyRent: perTenantRent ? String(perTenantRent) : "",
      sqft: perTenantSf ? String(perTenantSf) : "",
      status: i === count - 1 && count > 2 ? "notice" : "active",
    });
  }

  // Show vacant units if occupancy suggests vacancy
  const occupancy = Number(contract.occupancyPercent);
  const units = Number(contract.unitsSuites) || count;
  if (units > count) {
    for (let i = count; i < units && i < count + 3; i++) {
      tenants.push({
        id: `${contract.id}-vacant-${i + 1}`,
        unit: `Suite ${100 + (i + 1) * 10}`,
        name: "— Vacant —",
        email: "",
        phone: "",
        leaseStart: "",
        leaseEnd: "",
        monthlyRent: "",
        sqft: perTenantSf ? String(perTenantSf) : "",
        status: "vacant",
      });
    }
  } else if (!Number.isNaN(occupancy) && occupancy < 100 && count === 0) {
    tenants.push({
      id: `${contract.id}-vacant-1`,
      unit: "Suite 100",
      name: "— Vacant —",
      email: "",
      phone: "",
      leaseStart: "",
      leaseEnd: "",
      monthlyRent: "",
      sqft: "",
      status: "vacant",
    });
  }

  return tenants;
}

export function feeStructureLabel(value: FeeStructure) {
  switch (value) {
    case "percent_collections":
      return "% of collections";
    case "percent_gpr":
      return "% of GPR";
    case "flat_monthly":
      return "Flat monthly";
    case "flat_annual":
      return "Flat annual";
    case "hybrid":
      return "Hybrid";
    default:
      return value;
  }
}
