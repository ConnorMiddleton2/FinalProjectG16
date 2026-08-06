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

/** Demo payload for owner entity / documents / message fields (uncontrolled inputs). */
export type DemoOwnerApplicationEntity = {
  fullName: string;
  email: string;
  phone: string;
  preferredContactMethod: string;
  companyName: string;
  entityType: string;
  taxIdOrEin: string;
  mailingAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  communicationPreference: string;
  ownershipProofAvailable: boolean;
  rentRollAvailable: boolean;
  leasesAvailable: boolean;
  insuranceDocsAvailable: boolean;
  bankingReady: boolean;
  documentsReadyNotes: string;
  message: string;
};

/** Realistic demo values for class walkthroughs — one multifamily + one office. */
export function demoOwnerApplicationEntity(opts?: {
  fullName?: string;
  email?: string;
}): DemoOwnerApplicationEntity {
  return {
    fullName: opts?.fullName?.trim() || "Jordan Hale",
    email: opts?.email?.trim() || "jordan.hale@summitresidential.example",
    phone: "(615) 555-0142",
    preferredContactMethod: "email",
    companyName: "Summit Residential Partners LLC",
    entityType: "LLC",
    taxIdOrEin: "62-4893107",
    mailingAddress: "1200 Commerce St, Suite 400, Nashville, TN 37203",
    emergencyContactName: "Casey Hale",
    emergencyContactPhone: "(615) 555-0199",
    communicationPreference: "monthly_summary",
    ownershipProofAvailable: true,
    rentRollAvailable: true,
    leasesAvailable: true,
    insuranceDocsAvailable: true,
    bankingReady: true,
    documentsReadyNotes:
      "CAM reconciliations for the last two years will be uploaded after diligence kickoff. Elevator warranty sits with prior manager and transfers at takeover.",
    message:
      "Looking for a full-service commercial manager starting next quarter. Prefer 4.5–5% fee on collections, $2,500 owner-approval threshold, and monthly NOI packs. Lender requires quarterly compliance certificates.",
  };
}

export function demoOwnerApplicationProperties(): OwnerApplicationProperty[] {
  return [
    {
      propertyName: "Grandview Apartments",
      category: "multifamily",
      streetAddress: "900 Grandview Pkwy",
      city: "Nashville",
      state: "TN",
      zip: "37211",
      county: "Davidson",
      parcelTaxId: "TAX-PROP-GRANDVIEW",
      yearBuilt: "2012",
      yearRenovated: "2022",
      buildings: "6",
      floors: "4",
      unitsSuites: "300",
      grossSf: "285000",
      rentableSf: "270000",
      parkingSpaces: "360",
      zoning: "RM-3",
      amenities:
        "On-site leasing office, package room, fitness center, pool, controlled access",
      elevator: "yes",
      fireSprinkler: "yes",
      occupancyPercent: "82",
      tenantCount: "246",
      monthlyRentRoll: "478500",
      annualGpr: "5742000",
      annualOperatingExpenses: "2577600",
      annualNoi: "3164400",
      arBalance: "19140",
      securityDepositsHeld: "215000",
      reserveBalance: "322200",
      camOrNnnStructure: "Gross residential leases",
      majorLeaseExpirations: "2027-06-30 · ~18% of units turn over next 12 months",
      currentManagement: "other_firm",
      reasonForChange:
        "Prior firm understaffed maintenance; want Harborline for leasing velocity and owner reporting.",
      avgLeaseTermYears: "1",
      percentLeasesExpiring12mo: "28",
      roofAgeYears: "8",
      hvacNotes: "Package units by building; 2022 condenser replacements on buildings 1–3.",
      knownIssues: "Building 4 elevator modernization scheduled Q4; two vacant make-readies delayed.",
      preferredVendors: "Delta Mechanical; ClearPath Janitorial; NightWatch Security",
      utilityNotes: "Owner-paid common area electric/water; tenants pay unit electric.",
      accessNotes: "Master key with on-site office; after-hours vendor gate code provided at takeover.",
      insuranceCarrier: "Harbor Mutual",
      insuranceCoverageAmount: "GL $2M / building replacement cost",
      insuranceExpiration: "2027-03-31",
      claimsHistoryNotes: "One water damage claim (2024) closed; no open claims.",
      ownerGoals:
        "Stabilize occupancy above 90%, shorten make-ready cycle, clean monthly owner packs.",
      servicesRequested: [
        "leasing",
        "tenant_relations",
        "maintenance",
        "accounting",
        "reporting",
        "capital_projects",
      ],
      capitalPlans: "Lobby refresh Q4; roof overlay budgeted next FY for building 5.",
      specialInstructions:
        "Owner approval required above $2,500; no weekend construction without 48-hour notice.",
      location: "900 Grandview Pkwy, Nashville, TN 37211",
      squareFeet: "270000",
    },
    {
      propertyName: "Riverside Office Park",
      category: "office",
      streetAddress: "220 Riverside Dr",
      city: "Evanston",
      state: "IL",
      zip: "60201",
      county: "Cook",
      parcelTaxId: "TAX-PROP-RIVERSIDE",
      yearBuilt: "1998",
      yearRenovated: "2019",
      buildings: "3",
      floors: "4",
      unitsSuites: "80",
      grossSf: "224000",
      rentableSf: "200000",
      parkingSpaces: "290",
      zoning: "C-2",
      amenities: "Conference suite, loading dock, covered parking, cafe shell",
      elevator: "yes",
      fireSprinkler: "yes",
      occupancyPercent: "80",
      tenantCount: "64",
      monthlyRentRoll: "94600",
      annualGpr: "1135200",
      annualOperatingExpenses: "621600",
      annualNoi: "513600",
      arBalance: "3784",
      securityDepositsHeld: "142000",
      reserveBalance: "77700",
      camOrNnnStructure: "Modified gross with CAM recoveries",
      majorLeaseExpirations: "2028-12-31 · Floor 3 anchor expires; two suites soft in 2027",
      currentManagement: "self_managed",
      reasonForChange:
        "Self-managed through acquisition; need institutional leasing and CAM reconciliations.",
      avgLeaseTermYears: "5",
      percentLeasesExpiring12mo: "12",
      roofAgeYears: "6",
      hvacNotes: "Central plant with VAV; boilers replaced 2019.",
      knownIssues: "Suite 240 HVAC balancing complaint; parking lot reseal planned spring.",
      preferredVendors: "Delta Mechanical; ClearPath Janitorial",
      utilityNotes: "NNN electric for suites; owner pays base building utilities.",
      accessNotes: "Card access; property engineer hours 7a–4p weekdays.",
      insuranceCarrier: "Harbor Mutual",
      insuranceCoverageAmount: "GL $2M / property replacement",
      insuranceExpiration: "2026-12-15",
      claimsHistoryNotes: "No claims in trailing 36 months.",
      ownerGoals: "Raise occupancy, complete CAM true-ups, prepare asset for refinance.",
      servicesRequested: [
        "leasing",
        "maintenance",
        "accounting",
        "cam_nnn",
        "reporting",
        "insurance_claims",
      ],
      capitalPlans: "Parking lot reseal spring; lobby lighting LED retrofit.",
      specialInstructions: "Lender covenants require quarterly occupancy certificates.",
      location: "220 Riverside Dr, Evanston, IL 60201",
      squareFeet: "200000",
    },
  ];
}
