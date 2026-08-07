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

/** Realistic demo values for class walkthroughs — randomized each call. */
export function demoOwnerApplicationEntity(opts?: {
  fullName?: string;
  email?: string;
}): DemoOwnerApplicationEntity {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const fullName = opts?.fullName?.trim() || `${first} ${last}`;
  const companyRoot = pick(COMPANY_ROOTS);
  const entityType = pick(["LLC", "LP", "Corporation", "Trust", "Individual"]);
  const companyName =
    entityType === "Individual"
      ? `${fullName} Holdings`
      : `${companyRoot} ${pick(["Partners", "Holdings", "Capital", "Realty", "Properties"])} ${entityType === "LLC" ? "LLC" : entityType === "LP" ? "LP" : entityType === "Corporation" ? "Inc." : ""}`.trim();
  const loc = pick(CITIES);
  const streetNo = randInt(100, 2400);
  const phoneA = randInt(200, 989);
  const phoneB = randInt(100, 999);
  const phoneC = randInt(1000, 9999);
  const einA = randInt(10, 98);
  const einB = randInt(1000000, 9999999);
  const emerFirst = pick(FIRST_NAMES.filter((n) => n !== first));
  const feeLow = (4 + Math.random() * 1.5).toFixed(1);
  const feeHigh = (Number(feeLow) + 0.5).toFixed(1);
  const threshold = pick([1500, 2000, 2500, 3500, 5000]);

  return {
    fullName,
    email:
      opts?.email?.trim() ||
      `${first}.${last}${randInt(1, 99)}@${companyRoot.toLowerCase().replace(/\s/g, "")}.example`.toLowerCase(),
    phone: `(${phoneA}) ${phoneB}-${phoneC}`,
    preferredContactMethod: pick(["email", "phone", "text"]),
    companyName,
    entityType,
    taxIdOrEin: `${einA}-${einB}`,
    mailingAddress: `${streetNo} ${pick(STREETS)}, Suite ${randInt(100, 900)}, ${loc.city}, ${loc.state} ${loc.zip}`,
    emergencyContactName: `${emerFirst} ${last}`,
    emergencyContactPhone: `(${phoneA}) ${randInt(100, 999)}-${randInt(1000, 9999)}`,
    communicationPreference: pick([
      "hands_off",
      "monthly_summary",
      "weekly_updates",
      "high_touch",
    ]),
    ownershipProofAvailable: Math.random() > 0.15,
    rentRollAvailable: Math.random() > 0.1,
    leasesAvailable: Math.random() > 0.2,
    insuranceDocsAvailable: Math.random() > 0.15,
    bankingReady: Math.random() > 0.25,
    documentsReadyNotes: pick([
      `CAM reconciliations for the last ${randInt(1, 3)} years will be uploaded after diligence kickoff.`,
      "Title packet and entity docs are ready; rent roll exports weekly from prior PMS.",
      "Insurance binder renews next month — certificate of insurance will follow takeover.",
      "Banking ACH form signed; waiting on lender estoppel before wire instructions change.",
      "Elevator warranty sits with prior manager and transfers at takeover.",
    ]),
    message: pick([
      `Looking for a full-service commercial manager starting next quarter. Prefer ${feeLow}–${feeHigh}% fee on collections, $${threshold.toLocaleString()} owner-approval threshold, and monthly NOI packs.`,
      `Need CPMC for leasing velocity and owner reporting. Target takeover in ${pick(["30", "45", "60", "90"])} days. Lender requires quarterly compliance certificates.`,
      `Self-managed through acquisition; want institutional CAM / NNN reconciliations and cleaner monthly packs. Fee discussion open around ${feeLow}%.`,
      `Prior firm understaffed maintenance. Seeking ${feeLow}% collections fee, $${threshold.toLocaleString()} spend threshold, and weekly work-order visibility.`,
    ]),
  };
}

export function demoOwnerApplicationProperties(): OwnerApplicationProperty[] {
  const count = randInt(1, 3);
  const usedNames = new Set<string>();
  const rows: OwnerApplicationProperty[] = [];
  for (let i = 0; i < count; i++) {
    let prop = buildRandomProperty();
    let guard = 0;
    while (usedNames.has(prop.propertyName) && guard < 8) {
      prop = buildRandomProperty();
      guard += 1;
    }
    usedNames.add(prop.propertyName);
    rows.push(prop);
  }
  return rows;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo(n: number, step = 100) {
  return Math.round(n / step) * step;
}

const FIRST_NAMES = [
  "Jordan",
  "Casey",
  "Alex",
  "Morgan",
  "Riley",
  "Taylor",
  "Quinn",
  "Avery",
  "Cameron",
  "Reese",
  "Parker",
  "Skyler",
  "Hayden",
  "Drew",
  "Blair",
] as const;

const LAST_NAMES = [
  "Hale",
  "Nguyen",
  "Patel",
  "Brooks",
  "Keller",
  "Santos",
  "Whitman",
  "Ortega",
  "Kim",
  "Vargas",
  "Chen",
  "Diaz",
  "Foster",
  "Singh",
  "Walsh",
] as const;

const COMPANY_ROOTS = [
  "Summit",
  "Cedarline",
  "Northbridge",
  "Harborpoint",
  "Maple Ridge",
  "Ironwood",
  "Lakeshore",
  "Pioneer",
  "Copperfield",
  "Evergreen",
] as const;

const STREETS = [
  "Commerce St",
  "Market Ave",
  "Industrial Blvd",
  "Riverside Dr",
  "Grandview Pkwy",
  "Harbor Way",
  "Oakwood Ln",
  "Mill Rd",
  "Station St",
  "Liberty Ave",
] as const;

const CITIES: { city: string; state: string; zip: string; county: string }[] = [
  { city: "Nashville", state: "TN", zip: "37211", county: "Davidson" },
  { city: "Evanston", state: "IL", zip: "60201", county: "Cook" },
  { city: "Austin", state: "TX", zip: "78702", county: "Travis" },
  { city: "Denver", state: "CO", zip: "80205", county: "Denver" },
  { city: "Charlotte", state: "NC", zip: "28202", county: "Mecklenburg" },
  { city: "Tampa", state: "FL", zip: "33602", county: "Hillsborough" },
  { city: "Columbus", state: "OH", zip: "43215", county: "Franklin" },
  { city: "Phoenix", state: "AZ", zip: "85004", county: "Maricopa" },
  { city: "Portland", state: "OR", zip: "97209", county: "Multnomah" },
  { city: "Atlanta", state: "GA", zip: "30308", county: "Fulton" },
];

const PROPERTY_NAME_PREFIXES = [
  "Grandview",
  "Riverside",
  "Canal",
  "Pier",
  "Summit",
  "Lakeside",
  "Copper",
  "Frontier",
  "Meridian",
  "Beacon",
  "Ashford",
  "Willow",
] as const;

const PROPERTY_NAME_SUFFIXES = [
  "Apartments",
  "Office Park",
  "Commerce Center",
  "Plaza",
  "Yards",
  "Commons",
  "Tower",
  "Warehouse",
  "Market",
  "Court",
] as const;

const CARRIERS = [
  "Harbor Mutual",
  "Summit Casualty",
  "Northbridge Insurance",
  "Liberty Mutual",
  "Travelers",
  "Hartford",
] as const;

const VENDORS = [
  "Delta Mechanical",
  "ClearPath Janitorial",
  "NightWatch Security",
  "GreenLine Landscaping",
  "Apex Elevator",
  "BrightWay Electric",
  "RapidRoof Solutions",
  "BlueStream Plumbing",
] as const;

function buildRandomProperty(): OwnerApplicationProperty {
  const category = pick(
    COMMERCIAL_PROPERTY_TYPES.map((t) => t.value)
  ) as PropertyType;
  const loc = pick(CITIES);
  const streetNo = randInt(100, 3200);
  const street = pick(STREETS);
  const propertyName = `${pick(PROPERTY_NAME_PREFIXES)} ${pick(PROPERTY_NAME_SUFFIXES)}`;
  const yearBuilt = randInt(1985, 2018);
  const yearRenovated = randInt(yearBuilt + 2, Math.min(2025, yearBuilt + 20));
  const buildings =
    category === "multifamily"
      ? randInt(2, 12)
      : category === "industrial"
        ? randInt(1, 4)
        : randInt(1, 5);
  const floors =
    category === "industrial" ? randInt(1, 2) : randInt(2, 12);
  const units =
    category === "multifamily"
      ? randInt(48, 420)
      : category === "office"
        ? randInt(20, 120)
        : category === "retail"
          ? randInt(8, 45)
          : randInt(6, 80);
  const rentableSf =
    category === "multifamily"
      ? roundTo(units * randInt(750, 1100), 1000)
      : roundTo(randInt(40000, 320000), 1000);
  const grossSf = roundTo(rentableSf * (1.04 + Math.random() * 0.08), 1000);
  const parking = roundTo(units * (0.8 + Math.random() * 0.6), 10);
  const occ = randInt(72, 96);
  const tenantCount = Math.max(
    1,
    Math.round((units * occ) / 100) - randInt(0, 8)
  );
  const psfMonth =
    category === "multifamily"
      ? 0
      : category === "industrial"
        ? 0.55 + Math.random() * 0.45
        : category === "retail"
          ? 1.4 + Math.random() * 1.2
          : 1.8 + Math.random() * 1.5;
  const monthlyRentRoll =
    category === "multifamily"
      ? roundTo(tenantCount * randInt(1100, 2400), 100)
      : roundTo(rentableSf * psfMonth, 100);
  const annualGpr = monthlyRentRoll * 12;
  const opexRatio = 0.38 + Math.random() * 0.18;
  const annualOpex = roundTo(annualGpr * opexRatio, 100);
  const annualNoi = annualGpr - annualOpex;
  const arBalance = roundTo(monthlyRentRoll * (0.02 + Math.random() * 0.08), 10);
  const deposits = roundTo(
    category === "multifamily"
      ? tenantCount * randInt(500, 1800)
      : monthlyRentRoll * randInt(1, 3),
    100
  );
  const reserves = roundTo(annualOpex * (0.08 + Math.random() * 0.12), 100);
  const servicePool = MANAGEMENT_SERVICES.map((s) => s.value);
  const serviceCount = randInt(3, Math.min(6, servicePool.length));
  const shuffled = [...servicePool].sort(() => Math.random() - 0.5);
  const servicesRequested = shuffled.slice(0, serviceCount);
  const ynVal = (): "" | "yes" | "no" | "unknown" =>
    pick(["yes", "yes", "yes", "no", "unknown"]);
  const vendorList = [...VENDORS]
    .sort(() => Math.random() - 0.5)
    .slice(0, randInt(2, 4))
    .join("; ");
  const zoning =
    category === "multifamily"
      ? pick(["RM-2", "RM-3", "R-MF", "MX-1"])
      : category === "industrial"
        ? pick(["I-1", "I-2", "M-1"])
        : pick(["C-1", "C-2", "B-3", "MXD"]);
  const expYear = randInt(2026, 2029);
  const expMonth = String(randInt(1, 12)).padStart(2, "0");
  const expDay = String(randInt(1, 28)).padStart(2, "0");

  return {
    propertyName,
    category,
    streetAddress: `${streetNo} ${street}`,
    city: loc.city,
    state: loc.state,
    zip: loc.zip,
    county: loc.county,
    parcelTaxId: `TAX-${loc.state}-${randInt(100000, 999999)}`,
    yearBuilt: String(yearBuilt),
    yearRenovated: String(yearRenovated),
    buildings: String(buildings),
    floors: String(floors),
    unitsSuites: String(units),
    grossSf: String(grossSf),
    rentableSf: String(rentableSf),
    parkingSpaces: String(parking),
    zoning,
    amenities: pick([
      "On-site leasing office, package room, fitness center, controlled access",
      "Conference suite, loading dock, covered parking, cafe shell",
      "Lobby concierge, EV charging, rooftop terrace, bike storage",
      "Drive-through canopy, outdoor seating pad, monument signage",
      "High-bay clear height, dock doors, trailer storage, guard house",
      "Courtyard, coworking lounge, secure bike room, dry cleaner drop",
    ]),
    elevator: category === "industrial" ? pick(["no", "unknown", "yes"]) : ynVal(),
    fireSprinkler: ynVal(),
    occupancyPercent: String(occ),
    tenantCount: String(tenantCount),
    monthlyRentRoll: String(monthlyRentRoll),
    annualGpr: String(annualGpr),
    annualOperatingExpenses: String(annualOpex),
    annualNoi: String(annualNoi),
    arBalance: String(arBalance),
    securityDepositsHeld: String(deposits),
    reserveBalance: String(reserves),
    camOrNnnStructure: pick([
      "Gross residential leases",
      "Modified gross with CAM recoveries",
      "Triple-net (NNN)",
      "Absolute NNN with sparse landlord obligations",
      "Base year stop with operating expense pass-throughs",
    ]),
    majorLeaseExpirations: pick([
      `${expYear}-${expMonth}-${expDay} · ~${randInt(8, 22)}% of rent roll turns over next 12 months`,
      `${expYear + 1}-06-30 · Anchor suite soft; two mid-size renewals pending`,
      `${expYear}-12-31 · Floor ${randInt(2, Math.max(2, floors))} expiration cluster`,
    ]),
    currentManagement: pick(
      CURRENT_MANAGEMENT_OPTIONS.map((o) => o.value)
    ),
    reasonForChange: pick([
      "Prior firm understaffed maintenance; want CPMC for leasing velocity and owner reporting.",
      "Self-managed through acquisition; need institutional leasing and CAM reconciliations.",
      "Lender pushing for professional management ahead of refinance.",
      "Ownership transition — new partners want clearer monthly NOI packs.",
      "Local manager retiring; seeking a scaled platform with after-hours coverage.",
    ]),
    avgLeaseTermYears: String(
      category === "multifamily" ? 1 : randInt(3, 10)
    ),
    percentLeasesExpiring12mo: String(randInt(8, 35)),
    roofAgeYears: String(randInt(2, 18)),
    hvacNotes: pick([
      `Package units by building; ${yearRenovated} condenser replacements on select buildings.`,
      "Central plant with VAV; boilers recently serviced.",
      "Rooftop units mid-life; one RTU replacement budgeted this FY.",
      "Split systems in suites; common-area AHU replaced last year.",
    ]),
    knownIssues: pick([
      "Make-ready backlog on two vacant units; elevator modernization scheduled.",
      "Parking lot reseal planned spring; one suite HVAC balancing complaint.",
      "Minor roof leak near mechanical penthouse — patch completed, monitoring.",
      "Access control firmware outdated; badge readers scheduled for upgrade.",
      "No material open issues; deferred carpet in common corridors.",
    ]),
    preferredVendors: vendorList,
    utilityNotes: pick([
      "Owner-paid common area electric/water; tenants pay unit electric.",
      "NNN electric for suites; owner pays base building utilities.",
      "Master-metered water; electric separately metered by suite.",
      "Campus chilled water loop; tenants billed via RUBS.",
    ]),
    accessNotes: pick([
      "Master key with on-site office; after-hours vendor gate code at takeover.",
      "Card access; property engineer hours 7a–4p weekdays.",
      "Lockbox at leasing office; overnight vendor call-out list attached.",
      "Fob access for garage; visitor kiosk in main lobby.",
    ]),
    insuranceCarrier: pick(CARRIERS),
    insuranceCoverageAmount: pick([
      "GL $2M / building replacement cost",
      "GL $2M / property replacement",
      "GL $1M/$2M · property at RCV",
      "Package policy — GL $2M, umbrella $5M",
    ]),
    insuranceExpiration: `${expYear}-${expMonth}-${expDay}`,
    claimsHistoryNotes: pick([
      "No claims in trailing 36 months.",
      `One water damage claim (${randInt(2022, 2025)}) closed; no open claims.`,
      "Wind/hail claim closed last year under deductible.",
      "Minor slip-and-fall claim pending; carrier defending.",
    ]),
    ownerGoals: pick([
      "Stabilize occupancy above 90%, shorten make-ready cycle, clean monthly owner packs.",
      "Raise occupancy, complete CAM true-ups, prepare asset for refinance.",
      "Improve NOI via expense control and stronger leasing conversion.",
      "Professionalize ops, reduce delinquency, and document capital needs.",
    ]),
    servicesRequested,
    capitalPlans: pick([
      "Lobby refresh Q4; roof overlay budgeted next FY.",
      "Parking lot reseal spring; lobby lighting LED retrofit.",
      "Elevator modernization; unit interior refresh package.",
      "HVAC RTU replacement; storefront sealant project.",
      "No major CapEx planned beyond routine reserves.",
    ]),
    specialInstructions: pick([
      `Owner approval required above $${pick([1500, 2000, 2500, 5000]).toLocaleString()}; no weekend construction without 48-hour notice.`,
      "Lender covenants require quarterly occupancy certificates.",
      "Quiet hours 10p–7a for any interior work near occupied suites.",
      "All vendor COIs must name owner LLC as additional insured.",
    ]),
    location: `${streetNo} ${street}, ${loc.city}, ${loc.state} ${loc.zip}`,
    squareFeet: String(rentableSf),
  };
}

/** Management diligence / confirmation fields when reviewing an owner application. */
export type DemoOwnerApplicationDiligence = {
  inspected: boolean;
  inspectionDate: string;
  inspectionDocuments: string[];
  assetDetails: string;
  inspectionNotes: string;
  marketResearch: string;
  metWithOwner: boolean;
  meetingsCount: number;
  ownerDesiredTerms: string;
  negotiationTerms: string;
  paymentTerms: string;
  meetingMinutesFiles: string[];
  meetingMinutesNotes: string;
  proposedFeePercent: string;
  proposedTermYears: string;
  exclusiveManagement: boolean;
  mgmtStatus: "diligence";
};

/** Fresh random diligence / negotiation package each call. */
export function demoOwnerApplicationDiligence(opts?: {
  propertyName?: string;
  city?: string;
}): DemoOwnerApplicationDiligence {
  const propertyLabel = opts?.propertyName?.trim() || "the subject property";
  const city = opts?.city?.trim() || pick(CITIES).city;
  const fee = (4 + Math.random() * 2).toFixed(1);
  const termYears = String(pick([1, 2, 3, 5]));
  const threshold = pick([1500, 2000, 2500, 3500, 5000]);
  const inspDay = new Date();
  inspDay.setDate(inspDay.getDate() - randInt(1, 21));
  const inspectionDate = inspDay.toISOString().slice(0, 10);
  const meetingsCount = randInt(1, 4);
  const docStamp = inspDay.toISOString().slice(0, 10).replaceAll("-", "");

  return {
    inspected: true,
    inspectionDate,
    inspectionDocuments: [
      `inspection-report-${docStamp}.pdf`,
      `photo-log-${docStamp}.pdf`,
      ...(Math.random() > 0.4 ? [`roof-assessment-${docStamp}.pdf`] : []),
    ],
    assetDetails: pick([
      `${propertyLabel} shows solid curb appeal with mid-cycle systems. Common areas tidy; parking striping fading in the rear lot.`,
      `Walked ${propertyLabel} with site lead. Unit interiors vary by vintage; mechanical rooms organized; one vacant suite needs paint/carpet.`,
      `Asset is institutional grade for ${city}. Access control works; loading/dock area clean; deferred lobby refresh recommended.`,
      `Structure and envelope in good condition. HVAC mid-life; elevator certificates current; landscaping contract adequate.`,
    ]),
    inspectionNotes: pick([
      `Inspected on ${inspectionDate}. No life-safety flags. Punch list: ${randInt(3, 9)} minor items for owner packet.`,
      `Completed property tour and unit sample (${randInt(4, 12)} units). Moisture meter clear; roof walk deferred pending weather.`,
      `Fire panel tested; egress clear. Noted ${randInt(1, 4)} work orders open with prior manager — request close-out at takeover.`,
    ]),
    marketResearch: pick([
      `${city} ${pick(["office", "multifamily", "retail", "industrial"])} comps support asking rents within ±${randInt(3, 8)}% of current roll. Vacancy in submarket ~${randInt(8, 16)}%.`,
      `Trailing 12 absorption positive. Competing assets offering ${randInt(1, 3)} months free on 5-year deals. Recommend modest renewal incentives.`,
      `Submarket rents trending +${(1 + Math.random() * 4).toFixed(1)}% YoY. Cap rates for similar class ~${(5.5 + Math.random() * 1.5).toFixed(1)}%.`,
    ]),
    metWithOwner: true,
    meetingsCount,
    ownerDesiredTerms: pick([
      `Owner wants ~${fee}% fee, $${threshold.toLocaleString()} approval threshold, and monthly NOI packs within 10 business days.`,
      `Prefer exclusive management, quarterly in-person reviews, and CapEx oversight included in base fee.`,
      `Open on fee; focused on leasing velocity, delinquency under ${randInt(2, 5)}%, and clean lender reporting.`,
    ]),
    negotiationTerms: pick([
      `CPMC proposed ${fee}% of collections, ${termYears}-year term, exclusive. Owner countered on threshold ($${threshold.toLocaleString()}).`,
      `Agreed in principle on fee band ${fee}–${(Number(fee) + 0.5).toFixed(1)}% with annual true-up. Exclusive yes; early termination 60-day notice.`,
      `Fee set at ${fee}% with leasing commission ${pick(["50", "100"])}% of first month on new leases. CapEx oversight at ${pick(["3", "4", "5"])}% of project cost.`,
    ]),
    paymentTerms: pick([
      `Management fee remitted by the 15th from operating account; owner draws monthly after reserves.`,
      `ACH to owner by the 20th; CPMC invoices fee against collections. Security deposits held in trust.`,
      `Fee deducted from rent receipts before owner distribution; reserve contribution ${randInt(2, 5)}% of GPI.`,
    ]),
    meetingMinutesFiles: [
      `meeting-minutes-${docStamp}.pdf`,
      ...(meetingsCount > 2 ? [`term-sheet-v${randInt(1, 3)}.pdf`] : []),
    ],
    meetingMinutesNotes: pick([
      `${meetingsCount} meetings completed. Attendees: owner, CPMC RM, leasing lead. Action items logged in CRM.`,
      `Reviewed inspection punch list and draft fee schedule. Owner to send bank ACH form this week.`,
      `Aligned on takeover date target and vendor transition. Pending: COIs and rent roll export.`,
    ]),
    proposedFeePercent: fee,
    proposedTermYears: termYears,
    exclusiveManagement: Math.random() > 0.2,
    mgmtStatus: "diligence",
  };
}

