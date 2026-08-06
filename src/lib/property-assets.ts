/**
 * Fixed assets / PP&E for managed properties (client-safe).
 * Feeds depreciation into management financial statements.
 */

export type DepreciationMethod =
  | "straight_line"
  | "declining_150"
  | "declining_200"
  | "none";

export type PropertyAssetCategory =
  | "land"
  | "building"
  | "building_improvements"
  | "hvac"
  | "roofing"
  | "elevators"
  | "parking_paving"
  | "security_systems"
  | "furniture_fixtures"
  | "appliances"
  | "other";

export type PropertyAsset = {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  category: PropertyAssetCategory;
  description: string;
  costBasis: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  /** ISO date YYYY-MM-DD when placed in service. */
  placedInServiceDate: string;
  createdAt: string;
  updatedAt: string;
};

export const DEPRECIATION_METHODS: {
  value: DepreciationMethod;
  label: string;
}[] = [
  { value: "straight_line", label: "Straight-line" },
  { value: "declining_150", label: "150% declining balance" },
  { value: "declining_200", label: "200% declining balance (DDB)" },
  { value: "none", label: "Non-depreciable" },
];

export const ASSET_CATEGORIES: {
  value: PropertyAssetCategory;
  label: string;
}[] = [
  { value: "land", label: "Land" },
  { value: "building", label: "Building" },
  { value: "building_improvements", label: "Building improvements" },
  { value: "hvac", label: "HVAC" },
  { value: "roofing", label: "Roofing" },
  { value: "elevators", label: "Elevators" },
  { value: "parking_paving", label: "Parking / paving" },
  { value: "security_systems", label: "Security systems" },
  { value: "furniture_fixtures", label: "Furniture & fixtures" },
  { value: "appliances", label: "Appliances" },
  { value: "other", label: "Other" },
];

export function assetCategoryLabel(value: string) {
  return (
    ASSET_CATEGORIES.find((c) => c.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function depreciationMethodLabel(value: string) {
  return (
    DEPRECIATION_METHODS.find((m) => m.value === value)?.label ?? value
  );
}

export function seedPropertyAssets(): PropertyAsset[] {
  return [];
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function yearsInServiceThrough(placed: string, asOfYear: number, asOfMonth = 12) {
  const d = new Date(`${placed}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  const asOf = new Date(asOfYear, asOfMonth, 0); // last day of month
  if (asOf < d) return 0;
  const ms = asOf.getTime() - d.getTime();
  return Math.max(0, ms / (365.25 * 24 * 60 * 60 * 1000));
}

/** Annual depreciation for a given calendar year (full year amount). */
export function annualDepreciationForYear(
  asset: PropertyAsset,
  year: number
): number {
  if (asset.depreciationMethod === "none" || asset.category === "land") {
    return 0;
  }
  const basis = Math.max(0, asset.costBasis - asset.salvageValue);
  if (basis <= 0 || asset.usefulLifeYears <= 0) return 0;

  const placedYear = Number(asset.placedInServiceDate.slice(0, 4));
  if (!placedYear || year < placedYear) return 0;

  const yearsElapsedEnd = yearsInServiceThrough(asset.placedInServiceDate, year, 12);
  const yearsElapsedStart = yearsInServiceThrough(
    asset.placedInServiceDate,
    year - 1,
    12
  );
  const yearFraction = Math.min(
    1,
    Math.max(0, yearsElapsedEnd - yearsElapsedStart)
  );
  if (yearFraction <= 0) return 0;

  if (asset.depreciationMethod === "straight_line") {
    const annual = basis / asset.usefulLifeYears;
    const totalToDate = Math.min(basis, annual * yearsElapsedEnd);
    const totalPrior = Math.min(basis, annual * yearsElapsedStart);
    return round2(Math.max(0, totalToDate - totalPrior));
  }

  // Declining balance — apply rate to beginning book value for the year
  const rate =
    asset.depreciationMethod === "declining_200"
      ? 2 / asset.usefulLifeYears
      : 1.5 / asset.usefulLifeYears;

  let book = asset.costBasis;
  let accum = 0;
  const startYear = placedYear;
  for (let y = startYear; y <= year; y++) {
    const remaining = Math.max(0, book - asset.salvageValue - accum);
    if (remaining <= 0) break;
    let dep = round2(Math.min(remaining, (book - accum) * rate));
    // Switch to SL residual if needed near end of life
    const yearsLeft = Math.max(
      0.01,
      asset.usefulLifeYears - yearsInServiceThrough(asset.placedInServiceDate, y - 1, 12)
    );
    const sl = remaining / yearsLeft;
    if (dep < sl && y > startYear) dep = round2(Math.min(remaining, sl));
    if (y === year) {
      return round2(dep * yearFraction);
    }
    accum = round2(accum + dep);
  }
  return 0;
}

/** Accumulated depreciation as of end of year/month. */
export function accumulatedDepreciation(
  asset: PropertyAsset,
  asOfYear: number,
  asOfMonth = 12
): number {
  if (asset.depreciationMethod === "none" || asset.category === "land") {
    return 0;
  }
  let total = 0;
  const startYear = Number(asset.placedInServiceDate.slice(0, 4)) || asOfYear;
  for (let y = startYear; y < asOfYear; y++) {
    total += annualDepreciationForYear(asset, y);
  }
  if (asOfMonth >= 12) {
    total += annualDepreciationForYear(asset, asOfYear);
  } else {
    total += round2(
      (annualDepreciationForYear(asset, asOfYear) * asOfMonth) / 12
    );
  }
  const max = Math.max(0, asset.costBasis - asset.salvageValue);
  return round2(Math.min(max, total));
}

export function netBookValue(
  asset: PropertyAsset,
  asOfYear: number,
  asOfMonth = 12
) {
  return round2(
    asset.costBasis - accumulatedDepreciation(asset, asOfYear, asOfMonth)
  );
}

type PropertySeedInput = {
  id: string;
  propertyName: string;
  yearBuilt?: string;
  yearRenovated?: string;
  rentableSf?: string;
  grossSf?: string;
  monthlyRentRoll?: string;
};

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Build a reasonable PP&E package for one managed property. */
export function buildAssetsForProperty(
  property: PropertySeedInput,
  nowIso = new Date().toISOString()
): PropertyAsset[] {
  const sf = Math.max(
    8000,
    Number(property.rentableSf || property.grossSf) ||
      18000 + (hashSeed(property.id) % 40000)
  );
  const yearBuilt = Number(property.yearBuilt) || 1998;
  const renovated = Number(property.yearRenovated) || yearBuilt + 12;
  const rentAnnual =
    (Number(property.monthlyRentRoll) || sf * 1.8) * 12;
  // Rough building cost ~ 8–12× annual rent for demo realism
  const buildingCost = round2(rentAnnual * (8.5 + (hashSeed(property.id) % 30) / 10));
  const landCost = round2(buildingCost * 0.22);
  const hvacCost = round2(sf * 18);
  const roofCost = round2(sf * 9);
  const parkingCost = round2(sf * 4.5);
  const securityCost = round2(45000 + (hashSeed(property.id + "sec") % 40000));
  const ffCost = round2(sf * 2.2);
  const elevatorCost = sf > 25000 ? round2(185000 + (hashSeed(property.id) % 80000)) : 0;
  const improveCost = round2(buildingCost * 0.08);

  const placedBuilding = `${yearBuilt}-07-01`;
  const placedRoof = `${Math.min(renovated, yearBuilt + 20)}-04-15`;
  const placedHvac = `${Math.min(renovated + 2, new Date().getFullYear() - 1)}-06-01`;
  const placedImprove = `${Math.max(renovated, yearBuilt + 5)}-09-01`;
  const placedParking = `${yearBuilt + 1}-05-01`;
  const placedSec = `${Math.max(2015, renovated)}-03-01`;
  const placedFf = `${Math.max(2018, renovated)}-01-15`;

  const base = {
    propertyId: property.id,
    propertyName: property.propertyName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const assets: PropertyAsset[] = [
    {
      ...base,
      id: `asset-${property.id}-land`,
      name: "Land",
      category: "land",
      description: "Underlying land parcel — non-depreciable.",
      costBasis: landCost,
      salvageValue: landCost,
      usefulLifeYears: 0,
      depreciationMethod: "none",
      placedInServiceDate: placedBuilding,
    },
    {
      ...base,
      id: `asset-${property.id}-bldg`,
      name: "Building structure",
      category: "building",
      description: `Primary building shell · ~${sf.toLocaleString()} rentable SF.`,
      costBasis: buildingCost,
      salvageValue: round2(buildingCost * 0.1),
      usefulLifeYears: 39,
      depreciationMethod: "straight_line",
      placedInServiceDate: placedBuilding,
    },
    {
      ...base,
      id: `asset-${property.id}-improve`,
      name: "Tenant / capital improvements",
      category: "building_improvements",
      description: "Lobby, common-area, and suite improvement packages.",
      costBasis: improveCost,
      salvageValue: 0,
      usefulLifeYears: 15,
      depreciationMethod: "straight_line",
      placedInServiceDate: placedImprove,
    },
    {
      ...base,
      id: `asset-${property.id}-hvac`,
      name: "HVAC plant & distribution",
      category: "hvac",
      description: "Central plant, AHUs, and distribution.",
      costBasis: hvacCost,
      salvageValue: round2(hvacCost * 0.05),
      usefulLifeYears: 15,
      depreciationMethod: "declining_150",
      placedInServiceDate: placedHvac,
    },
    {
      ...base,
      id: `asset-${property.id}-roof`,
      name: "Roofing system",
      category: "roofing",
      description: "Membrane / built-up roof replacement.",
      costBasis: roofCost,
      salvageValue: 0,
      usefulLifeYears: 20,
      depreciationMethod: "straight_line",
      placedInServiceDate: placedRoof,
    },
    {
      ...base,
      id: `asset-${property.id}-park`,
      name: "Parking lot & paving",
      category: "parking_paving",
      description: "Surface lot, striping, and lighting.",
      costBasis: parkingCost,
      salvageValue: 0,
      usefulLifeYears: 15,
      depreciationMethod: "straight_line",
      placedInServiceDate: placedParking,
    },
    {
      ...base,
      id: `asset-${property.id}-sec`,
      name: "Access control & security",
      category: "security_systems",
      description: "Cameras, badge access, and monitoring hardware.",
      costBasis: securityCost,
      salvageValue: 0,
      usefulLifeYears: 7,
      depreciationMethod: "declining_200",
      placedInServiceDate: placedSec,
    },
    {
      ...base,
      id: `asset-${property.id}-ff`,
      name: "Common-area FF&E",
      category: "furniture_fixtures",
      description: "Lobby furniture, signage, and fixtures.",
      costBasis: ffCost,
      salvageValue: 0,
      usefulLifeYears: 7,
      depreciationMethod: "declining_200",
      placedInServiceDate: placedFf,
    },
  ];

  if (elevatorCost > 0) {
    assets.push({
      ...base,
      id: `asset-${property.id}-elev`,
      name: "Elevator systems",
      category: "elevators",
      description: "Passenger elevator modernization package.",
      costBasis: elevatorCost,
      salvageValue: round2(elevatorCost * 0.05),
      usefulLifeYears: 20,
      depreciationMethod: "straight_line",
      placedInServiceDate: `${Math.max(yearBuilt + 8, renovated)}-08-01`,
    });
  }

  return assets;
}
