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
  /** Links managed property to cookie-auth owner_accounts row when known. */
  ownerAccountId: string;
  ownerPhone: string;
  ownerMailingAddress: string;
  contractStartDate: string;
  contractEndDate: string;
  renewalOptions: string;
  terminationNoticeDays: string;
  exclusiveManagement: boolean;
  /** Dollar amount above which Harborline must seek owner spend approval. Empty = use app default. */
  ownerApprovalThreshold: string;

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

  /** Optional tenant roster attached to a managed property (legacy nested field). */
  tenants?: PropertyTenant[];
};

/** Shared property-roster row keyed by managed property id. */
export type SharedPropertyTenant = PropertyTenant & {
  propertyId: string;
  propertyName: string;
};

export function emptyPropertyTenant(
  propertyId: string,
  propertyName: string
): SharedPropertyTenant {
  return {
    id: crypto.randomUUID(),
    propertyId,
    propertyName,
    unit: "",
    name: "",
    email: "",
    phone: "",
    leaseStart: "",
    leaseEnd: "",
    monthlyRent: "",
    sqft: "",
    status: "active",
  };
}

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
  ownerAccountId: "",
  ownerPhone: "",
  ownerMailingAddress: "",
  contractStartDate: "",
  contractEndDate: "",
  renewalOptions: "",
  terminationNoticeDays: "30",
  exclusiveManagement: true,
  ownerApprovalThreshold: "2500",

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
