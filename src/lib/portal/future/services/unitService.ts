/**
 * Available-unit browse and detail service.
 *
 * BACKEND_TODO:
 *   GET /api/portal/future/units
 *   GET /api/portal/future/units/:id
 */

import {
  AVAILABLE_UNITS,
  FUTURE_PROPERTIES,
  findUnitById,
} from "@/lib/portal/future/mock-data";
import type {
  AvailableUnit,
  PropertySummary,
  UnitAvailability,
} from "@/lib/portal/future/models";
import {
  assertNotForcedError,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

export type UnitFilters = {
  property?: string;
  location?: string;
  minRent?: number;
  maxRent?: number;
  beds?: number;
  baths?: number;
  /** Personal (residential) or commercial inventory. */
  occupancyClass?: "personal" | "commercial";
  propertyType?: string;
  /** ISO date — unit availableDate must be on or before this. */
  moveInBy?: string;
  minSqft?: number;
  maxSqft?: number;
  petFriendly?: boolean;
  accessibility?: string[];
  amenities?: string[];
  availability?: UnitAvailability | UnitAvailability[];
};

export type UnitSort =
  | "price_asc"
  | "price_desc"
  | "newest"
  | "earliest_move_in"
  | "sqft_desc";

function matchesAccessibility(
  unit: AvailableUnit,
  required?: string[]
): boolean {
  if (!required?.length) return true;
  const hay = unit.accessibility.map((a) => a.toLowerCase());
  return required.every((item) =>
    hay.some((a) => a.includes(item.toLowerCase()))
  );
}

function matchesAmenities(unit: AvailableUnit, required?: string[]): boolean {
  if (!required?.length) return true;
  const hay = unit.amenities.map((a) => a.toLowerCase());
  return required.every((item) =>
    hay.some((a) => a.includes(item.toLowerCase()))
  );
}

function matchesAvailability(
  unit: AvailableUnit,
  availability?: UnitAvailability | UnitAvailability[]
): boolean {
  if (!availability) return true;
  const list = Array.isArray(availability) ? availability : [availability];
  if (!list.length) return true;
  return list.includes(unit.availability);
}

function applyFilters(
  units: AvailableUnit[],
  filters: UnitFilters = {}
): AvailableUnit[] {
  const locationNeedle = filters.location?.trim().toLowerCase();
  const propertyNeedle = filters.property?.trim().toLowerCase();

  return units.filter((unit) => {
    if (propertyNeedle) {
      const hit =
        unit.propertyId.toLowerCase() === propertyNeedle ||
        unit.propertyName.toLowerCase().includes(propertyNeedle);
      if (!hit) return false;
    }

    if (locationNeedle) {
      const blob = `${unit.location.city} ${unit.location.neighborhood}`.toLowerCase();
      if (!blob.includes(locationNeedle)) return false;
    }

    if (filters.minRent != null && unit.rent < filters.minRent) return false;
    if (filters.maxRent != null && unit.rent > filters.maxRent) return false;
    if (filters.occupancyClass && unit.occupancyClass !== filters.occupancyClass)
      return false;
    if (
      filters.propertyType &&
      unit.propertyType !== filters.propertyType
    ) {
      return false;
    }
    if (filters.beds != null && unit.beds < filters.beds) return false;
    if (filters.baths != null && unit.baths < filters.baths) return false;
    if (filters.minSqft != null && unit.sqft < filters.minSqft) return false;
    if (filters.maxSqft != null && unit.sqft > filters.maxSqft) return false;
    if (filters.petFriendly === true && !unit.petFriendly) return false;
    if (filters.petFriendly === false && unit.petFriendly) return false;
    if (filters.moveInBy && unit.availableDate > filters.moveInBy) return false;
    if (!matchesAccessibility(unit, filters.accessibility)) return false;
    if (!matchesAmenities(unit, filters.amenities)) return false;
    if (!matchesAvailability(unit, filters.availability)) return false;
    return true;
  });
}

function applySort(units: AvailableUnit[], sort: UnitSort = "newest"): AvailableUnit[] {
  const next = [...units];
  switch (sort) {
    case "price_asc":
      return next.sort((a, b) => a.rent - b.rent);
    case "price_desc":
      return next.sort((a, b) => b.rent - a.rent);
    case "earliest_move_in":
      return next.sort((a, b) => a.availableDate.localeCompare(b.availableDate));
    case "sqft_desc":
      return next.sort((a, b) => b.sqft - a.sqft);
    case "newest":
    default:
      return next.sort((a, b) => b.listedAt.localeCompare(a.listedAt));
  }
}

export async function listUnits(
  filters: UnitFilters = {},
  sort: UnitSort = "newest"
): Promise<ServiceResult<AvailableUnit[]>> {
  const forced = assertNotForcedError("listUnits");
  if (forced) return forced;

  try {
    await simulateLatency();
    // BACKEND_TODO: replace AVAILABLE_UNITS with live inventory query
    const filtered = applyFilters(AVAILABLE_UNITS, filters);
    return ok(applySort(filtered, sort), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load available units.", "network");
  }
}

export async function listProperties(): Promise<ServiceResult<PropertySummary[]>> {
  const forced = assertNotForcedError("listProperties");
  if (forced) return forced;

  try {
    await simulateLatency();
    // BACKEND_TODO: replace FUTURE_PROPERTIES with live property directory
    return ok([...FUTURE_PROPERTIES], "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load properties.", "network");
  }
}

export async function getUnit(
  id: string
): Promise<ServiceResult<AvailableUnit>> {
  const forced = assertNotForcedError("getUnit");
  if (forced) return forced;

  try {
    await simulateLatency();
    // BACKEND_TODO: GET unit by id from inventory service
    const unit = findUnitById(id);
    if (!unit) {
      return fail("That unit could not be found.", "not_found");
    }
    return ok(unit, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load unit details.", "network");
  }
}
