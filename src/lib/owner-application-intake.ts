import type { PropertyType } from "@/lib/management-contract";

/** One commercial asset on an owner management application. */
export type OwnerApplicationProperty = {
  propertyName: string;
  category: PropertyType | "";
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  parcelTaxId: string;
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
  elevator: "" | "yes" | "no" | "unknown";
  fireSprinkler: "" | "yes" | "no" | "unknown";
  occupancyPercent: string;
  tenantCount: string;
  monthlyRentRoll: string;
  annualGpr: string;
  annualOperatingExpenses: string;
  annualNoi: string;
  arBalance: string;
  securityDepositsHeld: string;
  reserveBalance: string;
  camOrNnnStructure: string;
  majorLeaseExpirations: string;
  currentManagement: string;
  reasonForChange: string;
  avgLeaseTermYears: string;
  percentLeasesExpiring12mo: string;
  roofAgeYears: string;
  hvacNotes: string;
  knownIssues: string;
  preferredVendors: string;
  utilityNotes: string;
  accessNotes: string;
  insuranceCarrier: string;
  insuranceCoverageAmount: string;
  insuranceExpiration: string;
  claimsHistoryNotes: string;
  ownerGoals: string;
  servicesRequested: string[];
  capitalPlans: string;
  specialInstructions: string;
  /** Legacy summary fields for older rows / list UIs. */
  location?: string;
  squareFeet?: string;
};

export const COMMERCIAL_PROPERTY_TYPES: {
  value: PropertyType;
  label: string;
}[] = [
  { value: "office", label: "Office" },
  { value: "retail", label: "Retail" },
  { value: "industrial", label: "Industrial / warehouse" },
  { value: "mixed-use", label: "Mixed-use" },
  { value: "multifamily", label: "Multifamily (apartments)" },
  { value: "other", label: "Other commercial" },
];

export const MANAGEMENT_SERVICES = [
  { value: "leasing", label: "Leasing & renewals" },
  { value: "tenant_relations", label: "Tenant relations" },
  { value: "maintenance", label: "Maintenance & work orders" },
  { value: "accounting", label: "Accounting / owner distributions" },
  { value: "cam_nnn", label: "CAM / NNN reconciliations" },
  { value: "capital_projects", label: "Capital project oversight" },
  { value: "insurance_claims", label: "Insurance / claims coordination" },
  { value: "reporting", label: "Monthly owner reporting" },
] as const;

export const CURRENT_MANAGEMENT_OPTIONS = [
  { value: "self_managed", label: "Self-managed" },
  { value: "other_firm", label: "Another management firm" },
  { value: "partial", label: "Partial / hybrid" },
  { value: "newly_acquired", label: "Newly acquired / not yet managed" },
  { value: "vacant_ops", label: "Asset vacant / limited operations" },
] as const;

function yn(value: unknown): "" | "yes" | "no" | "unknown" {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "yes" || v === "no" || v === "unknown" ? v : "";
}

function str(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

export function emptyOwnerApplicationProperty(): OwnerApplicationProperty {
  return {
    propertyName: "",
    category: "",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    county: "",
    parcelTaxId: "",
    yearBuilt: "",
    yearRenovated: "",
    buildings: "",
    floors: "",
    unitsSuites: "",
    grossSf: "",
    rentableSf: "",
    parkingSpaces: "",
    zoning: "",
    amenities: "",
    elevator: "",
    fireSprinkler: "",
    occupancyPercent: "",
    tenantCount: "",
    monthlyRentRoll: "",
    annualGpr: "",
    annualOperatingExpenses: "",
    annualNoi: "",
    arBalance: "",
    securityDepositsHeld: "",
    reserveBalance: "",
    camOrNnnStructure: "",
    majorLeaseExpirations: "",
    currentManagement: "",
    reasonForChange: "",
    avgLeaseTermYears: "",
    percentLeasesExpiring12mo: "",
    roofAgeYears: "",
    hvacNotes: "",
    knownIssues: "",
    preferredVendors: "",
    utilityNotes: "",
    accessNotes: "",
    insuranceCarrier: "",
    insuranceCoverageAmount: "",
    insuranceExpiration: "",
    claimsHistoryNotes: "",
    ownerGoals: "",
    servicesRequested: [],
    capitalPlans: "",
    specialInstructions: "",
  };
}

export function propertyLocationLabel(p: OwnerApplicationProperty): string {
  if (p.propertyName?.trim()) {
    const cityState = [p.city, p.state].filter(Boolean).join(", ");
    return cityState ? `${p.propertyName} · ${cityState}` : p.propertyName;
  }
  if (p.location?.trim()) return p.location;
  return (
    [p.streetAddress, p.city, p.state, p.zip].filter(Boolean).join(", ") ||
    "Property TBD"
  );
}

export function propertySfLabel(p: OwnerApplicationProperty): string {
  const sf = p.rentableSf || p.grossSf || p.squareFeet;
  return sf ? `${sf} SF` : "";
}

export function normalizeOwnerApplicationProperty(
  raw: Partial<OwnerApplicationProperty> & Record<string, unknown>
): OwnerApplicationProperty {
  const services = Array.isArray(raw.servicesRequested)
    ? raw.servicesRequested.map(String)
    : typeof raw.servicesRequested === "string" && raw.servicesRequested
      ? String(raw.servicesRequested)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const street =
    str(raw.streetAddress) ||
    str(raw.location).split(",")[0]?.trim() ||
    "";
  const rentable = str(raw.rentableSf) || str(raw.squareFeet) || str(raw.grossSf);
  const location =
    str(raw.location) ||
    [street, str(raw.city), str(raw.state), str(raw.zip)]
      .filter(Boolean)
      .join(", ");

  const categoryRaw = str(raw.category).toLowerCase();
  const allowed = COMMERCIAL_PROPERTY_TYPES.map((t) => t.value);
  const category = allowed.includes(categoryRaw as PropertyType)
    ? (categoryRaw as PropertyType)
    : "";

  return {
    propertyName: str(raw.propertyName),
    category,
    streetAddress: street,
    city: str(raw.city),
    state: str(raw.state),
    zip: str(raw.zip),
    county: str(raw.county),
    parcelTaxId: str(raw.parcelTaxId),
    yearBuilt: str(raw.yearBuilt),
    yearRenovated: str(raw.yearRenovated),
    buildings: str(raw.buildings),
    floors: str(raw.floors),
    unitsSuites: str(raw.unitsSuites),
    grossSf: str(raw.grossSf) || rentable,
    rentableSf: rentable,
    parkingSpaces: str(raw.parkingSpaces),
    zoning: str(raw.zoning),
    amenities: str(raw.amenities),
    elevator: yn(raw.elevator),
    fireSprinkler: yn(raw.fireSprinkler),
    occupancyPercent: str(raw.occupancyPercent),
    tenantCount: str(raw.tenantCount),
    monthlyRentRoll: str(raw.monthlyRentRoll),
    annualGpr: str(raw.annualGpr),
    annualOperatingExpenses: str(raw.annualOperatingExpenses),
    annualNoi: str(raw.annualNoi),
    arBalance: str(raw.arBalance),
    securityDepositsHeld: str(raw.securityDepositsHeld),
    reserveBalance: str(raw.reserveBalance),
    camOrNnnStructure: str(raw.camOrNnnStructure),
    majorLeaseExpirations: str(raw.majorLeaseExpirations),
    currentManagement: str(raw.currentManagement),
    reasonForChange: str(raw.reasonForChange),
    avgLeaseTermYears: str(raw.avgLeaseTermYears),
    percentLeasesExpiring12mo: str(raw.percentLeasesExpiring12mo),
    roofAgeYears: str(raw.roofAgeYears),
    hvacNotes: str(raw.hvacNotes),
    knownIssues: str(raw.knownIssues),
    preferredVendors: str(raw.preferredVendors),
    utilityNotes: str(raw.utilityNotes),
    accessNotes: str(raw.accessNotes),
    insuranceCarrier: str(raw.insuranceCarrier),
    insuranceCoverageAmount: str(raw.insuranceCoverageAmount),
    insuranceExpiration: str(raw.insuranceExpiration),
    claimsHistoryNotes: str(raw.claimsHistoryNotes),
    ownerGoals: str(raw.ownerGoals),
    servicesRequested: services,
    capitalPlans: str(raw.capitalPlans),
    specialInstructions: str(raw.specialInstructions),
    location,
    squareFeet: rentable,
  };
}

export function propertyHasMinimumDetail(p: OwnerApplicationProperty): boolean {
  return Boolean(
    p.propertyName ||
      p.streetAddress ||
      p.location ||
      p.rentableSf ||
      p.squareFeet ||
      p.category
  );
}
