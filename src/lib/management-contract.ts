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
});
