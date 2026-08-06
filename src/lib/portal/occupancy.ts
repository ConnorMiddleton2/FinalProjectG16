/**
 * Shared personal vs commercial occupancy for current- and future-tenant portals.
 * Aligns with owner/management `PropertyType` where a finer asset class is needed.
 */

export type OccupancyClass = "personal" | "commercial";

export type PortalPropertyType =
  | "office"
  | "retail"
  | "industrial"
  | "mixed-use"
  | "multifamily"
  | "other";

export const OCCUPANCY_CLASS_LABEL: Record<OccupancyClass, string> = {
  personal: "Personal",
  commercial: "Commercial",
};

export const PORTAL_PROPERTY_TYPE_LABEL: Record<PortalPropertyType, string> = {
  office: "Office",
  retail: "Retail",
  industrial: "Industrial",
  "mixed-use": "Mixed-use",
  multifamily: "Multifamily",
  other: "Other",
};

export function occupancyClassLabel(value: OccupancyClass): string {
  return OCCUPANCY_CLASS_LABEL[value];
}

export function portalPropertyTypeLabel(value: PortalPropertyType): string {
  return PORTAL_PROPERTY_TYPE_LABEL[value];
}

/** Unit / suite headline stats for cards and apply pickers. */
export function formatSpaceStats(input: {
  occupancyClass: OccupancyClass;
  propertyType: PortalPropertyType;
  beds: number;
  baths: number;
  sqft: number;
}): string {
  const sqft = `${input.sqft.toLocaleString()} sqft`;
  if (input.occupancyClass === "commercial") {
    return `${portalPropertyTypeLabel(input.propertyType)} · ${sqft}`;
  }
  const beds =
    input.beds === 0 ? "Studio" : `${input.beds} bed`;
  return `${beds} · ${input.baths} bath · ${sqft}`;
}

/** Prefer "Suite" wording for commercial leases; "Unit" for personal. */
export function spaceNoun(occupancyClass: OccupancyClass): string {
  return occupancyClass === "commercial" ? "Suite" : "Unit";
}
