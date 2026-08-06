/**
 * Detailed unit catalog used by unit detail pages and the portal mock layer.
 *
 * Prefer `@/lib/portal` services for async access. Keep mock/seed data out of
 * React components — search cards use `getMockUnitsSync()` from unitService.
 */

export type UnitFee = {
  label: string;
  amount: string;
  note: string;
};

export type AvailableUnitDetails = {
  id: string;
  property: string;
  floorPlan: string;
  address: string;
  neighborhood: string;
  rent: number;
  deposit: string;
  beds: number;
  baths: number;
  sqft: number;
  availableDate: string;
  availability: "Available now" | "Available soon" | "Waitlist";
  leaseTerms: string[];
  utilities: string[];
  petPolicy: string;
  parking: string;
  amenities: string[];
  accessibility: string[];
  requirements: string[];
  fees: UnitFee[];
  artwork: string[];
};

const COMMON_REQUIREMENTS = [
  "Government-issued photo identification",
  "Proof of income or other qualifying financial documentation",
  "Rental and residential history",
  "Information for all co-applicants and occupants",
  "Authorization for screening, where permitted",
];

const COMMON_FEES: UnitFee[] = [
  {
    label: "Application fee",
    amount: "$55 per adult applicant",
    note: "Non-refundable once screening begins.",
  },
  {
    label: "Holding deposit",
    amount: "$300",
    note: "Applied according to the holding-deposit agreement.",
  },
  {
    label: "Administrative fee",
    amount: "$175",
    note: "Due at lease signing.",
  },
];

const ARTWORK = {
  harbor: [
    "from-[#081f26] via-[#1f7a8c] to-[#a9dce2]",
    "from-[#1a3b45] via-[#668c98] to-[#e5d7b8]",
    "from-[#162d36] via-[#375f6c] to-[#91bcc4]",
  ],
  loft: [
    "from-[#384139] via-[#8da088] to-[#e8dbc1]",
    "from-[#3a332d] via-[#9a8069] to-[#d8c2a5]",
    "from-[#263b3b] via-[#698b82] to-[#cfddd1]",
  ],
  court: [
    "from-[#233747] via-[#6b879d] to-[#dfc58e]",
    "from-[#162d3a] via-[#466e87] to-[#b7cbd8]",
    "from-[#3d332b] via-[#9b8064] to-[#e6d4b6]",
  ],
  marina: [
    "from-[#17323a] via-[#51808d] to-[#b8d5d7]",
    "from-[#253f49] via-[#789ca4] to-[#e3d8bd]",
    "from-[#344b54] via-[#85aab2] to-[#d7e8e8]",
  ],
};

function createUnit(
  details: Omit<
    AvailableUnitDetails,
    "requirements" | "fees" | "leaseTerms" | "utilities"
  > &
    Partial<
      Pick<
        AvailableUnitDetails,
        "requirements" | "fees" | "leaseTerms" | "utilities"
      >
    >
): AvailableUnitDetails {
  return {
    requirements: COMMON_REQUIREMENTS,
    fees: COMMON_FEES,
    leaseTerms: ["12 months", "15 months", "18 months"],
    utilities: [
      "Water and sewer billed with monthly resident charges",
      "Electricity and internet arranged by resident",
      "Trash service included",
    ],
    ...details,
  };
}

export const AVAILABLE_UNIT_DETAILS: AvailableUnitDetails[] = [
  createUnit({
    id: "pier-12-305",
    property: "Pier 12 Residences",
    floorPlan: "Residence 305 · Harbor One",
    address: "12 Harbor Walk, Harbor City, HC 20418",
    neighborhood: "Downtown waterfront",
    rent: 2450,
    deposit: "$1,000 with approved application",
    beds: 1,
    baths: 1,
    sqft: 1180,
    availableDate: "2026-08-15",
    availability: "Available now",
    petPolicy:
      "Up to two cats or dogs. Breed and weight guidelines apply. $300 pet fee plus $35 monthly pet rent per pet.",
    parking:
      "One covered space available for $95 per month; guest parking is limited.",
    amenities: [
      "Water views",
      "Fitness room",
      "Package room",
      "Resident lounge",
      "Covered parking",
      "Bike storage",
    ],
    accessibility: [
      "Step-free building entrance",
      "Elevator access",
      "Accessible-height controls",
      "Wide interior doorways",
    ],
    artwork: ARTWORK.harbor,
  }),
  createUnit({
    id: "canal-yard-a",
    property: "Canal Yard Lofts",
    floorPlan: "Loft A · Open Studio",
    address: "88 Canal Street, Harbor City, HC 20422",
    neighborhood: "Arts District",
    rent: 2075,
    deposit: "$850 with approved application",
    beds: 0,
    baths: 1,
    sqft: 920,
    availableDate: "2026-08-22",
    availability: "Available now",
    leaseTerms: ["10 months", "12 months", "14 months"],
    petPolicy:
      "Pet-friendly community with pet wash. Up to two pets; property guidelines and fees apply.",
    parking:
      "Surface parking is $65 per month. Secure bike storage is included.",
    amenities: [
      "High ceilings",
      "Pet wash",
      "Bike storage",
      "Coworking lounge",
      "Original brickwork",
    ],
    accessibility: [
      "Elevator access to common areas",
      "Contact leasing to confirm unit-specific accessibility needs",
    ],
    artwork: ARTWORK.loft,
  }),
  createUnit({
    id: "harbor-court-3b",
    property: "Harbor Court",
    floorPlan: "Suite 3B · The Mariner",
    address: "410 Seaport Avenue, Harbor City, HC 20411",
    neighborhood: "East Wharf",
    rent: 2790,
    deposit: "$1,200 with approved application",
    beds: 2,
    baths: 2,
    sqft: 1340,
    availableDate: "2026-09-01",
    availability: "Available soon",
    petPolicy:
      "Cats and dogs welcome, subject to screening. $350 pet fee and $40 monthly pet rent per pet.",
    parking:
      "One garage space included; an additional space may be leased when available.",
    amenities: [
      "Roof terrace",
      "Package room",
      "On-site team",
      "Garage parking",
      "Fitness studio",
    ],
    accessibility: [
      "Step-free path from parking",
      "Elevator access",
      "Roll-under kitchen work area",
      "Accessible bathroom clearances",
    ],
    artwork: ARTWORK.court,
  }),
  createUnit({
    id: "wharf-east-402",
    property: "Wharf East",
    floorPlan: "Residence 402 · Tidal Two",
    address: "6 Market Pier, Harbor City, HC 20411",
    neighborhood: "East Wharf",
    rent: 3180,
    deposit: "$1,400 with approved application",
    beds: 2,
    baths: 2,
    sqft: 1510,
    availableDate: "2026-09-12",
    availability: "Available soon",
    petPolicy:
      "This residence is not currently designated pet-friendly. Service animals are accommodated in accordance with applicable law.",
    parking:
      "Reserved covered parking is available for $110 per month.",
    amenities: [
      "Private balcony",
      "Elevator",
      "Covered parking",
      "Waterfront promenade",
      "Package room",
    ],
    accessibility: [
      "Step-free building route",
      "Elevator access",
      "Lever-style hardware",
    ],
    artwork: ARTWORK.harbor,
  }),
  createUnit({
    id: "pier-12-708",
    property: "Pier 12 Residences",
    floorPlan: "Residence 708 · Harbor Two",
    address: "12 Harbor Walk, Harbor City, HC 20418",
    neighborhood: "Downtown waterfront",
    rent: 3495,
    deposit: "$1,500 with approved application",
    beds: 2,
    baths: 2.5,
    sqft: 1680,
    availableDate: "2026-10-01",
    availability: "Waitlist",
    petPolicy:
      "Up to two cats or dogs. Breed and weight guidelines apply. $300 pet fee plus $35 monthly pet rent per pet.",
    parking:
      "Two covered spaces may be leased for $165 per month, subject to availability.",
    amenities: [
      "Private terrace",
      "Water views",
      "Fitness room",
      "Resident lounge",
      "Package room",
    ],
    accessibility: [
      "Elevator access",
      "Contact leasing to discuss unit modifications or accommodation requests",
    ],
    artwork: ARTWORK.harbor,
  }),
  createUnit({
    id: "canal-yard-c",
    property: "Canal Yard Lofts",
    floorPlan: "Loft C · Gallery One",
    address: "88 Canal Street, Harbor City, HC 20422",
    neighborhood: "Arts District",
    rent: 2325,
    deposit: "$950 with approved application",
    beds: 1,
    baths: 1,
    sqft: 1085,
    availableDate: "2026-08-10",
    availability: "Available now",
    leaseTerms: ["10 months", "12 months", "14 months"],
    petPolicy:
      "Pet-friendly community with pet wash. Up to two pets; property guidelines and fees apply.",
    parking: "Surface parking is $65 per month. Bike storage is included.",
    amenities: [
      "High ceilings",
      "Coworking lounge",
      "Bike storage",
      "Original brickwork",
      "Pet wash",
    ],
    accessibility: [
      "Elevator access to common areas",
      "Contact leasing to confirm unit-specific accessibility needs",
    ],
    artwork: ARTWORK.loft,
  }),
  createUnit({
    id: "harbor-court-5a",
    property: "Harbor Court",
    floorPlan: "Suite 5A · The Beacon",
    address: "410 Seaport Avenue, Harbor City, HC 20411",
    neighborhood: "East Wharf",
    rent: 3890,
    deposit: "$1,700 with approved application",
    beds: 3,
    baths: 2,
    sqft: 1920,
    availableDate: "2026-09-20",
    availability: "Available soon",
    petPolicy:
      "Cats and dogs welcome, subject to screening. $350 pet fee and $40 monthly pet rent per pet.",
    parking:
      "Two garage spaces included; electric-vehicle charging is available by request.",
    amenities: [
      "Roof terrace",
      "Package room",
      "Garage parking",
      "Fitness studio",
      "On-site team",
    ],
    accessibility: [
      "Step-free path from parking",
      "Elevator access",
      "Accessible kitchen and bathroom clearances",
    ],
    artwork: ARTWORK.court,
  }),
  createUnit({
    id: "marina-house-214",
    property: "Marina House",
    floorPlan: "Residence 214 · Cove One",
    address: "214 Anchor Lane, Harbor City, HC 20430",
    neighborhood: "North Marina",
    rent: 1895,
    deposit: "$750 with approved application",
    beds: 1,
    baths: 1,
    sqft: 780,
    availableDate: "2026-08-18",
    availability: "Available now",
    petPolicy:
      "This residence is not currently designated pet-friendly. Service animals are accommodated in accordance with applicable law.",
    parking:
      "Unreserved surface parking is included. Covered spaces are waitlisted.",
    amenities: [
      "Elevator",
      "Package room",
      "Transit nearby",
      "Community courtyard",
    ],
    accessibility: [
      "Step-free building entrance",
      "Elevator access",
      "Accessible-height controls",
      "Wide interior doorways",
    ],
    artwork: ARTWORK.marina,
  }),
];

export function getAvailableUnit(unitId: string) {
  return AVAILABLE_UNIT_DETAILS.find((unit) => unit.id === unitId);
}
