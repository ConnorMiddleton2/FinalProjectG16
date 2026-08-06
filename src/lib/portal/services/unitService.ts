/**
 * Available unit catalog service.
 *
 * @backend GET /api/portal/units
 * @backend GET /api/portal/units/:id
 */

import { MOCK_SEARCH_AMENITIES, MOCK_UNITS } from "@/lib/portal/mock/data";
import { PortalServiceError } from "@/lib/portal/mock/delay";
import type { AvailabilityStatus, Unit } from "@/lib/portal/models";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

export type UnitSearchFilters = {
  property?: string;
  location?: string;
  maxRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  moveInDate?: string;
  minSqft?: number;
  pets?: "yes" | "no" | "";
  accessibility?: boolean;
  amenities?: string[];
  availability?: AvailabilityStatus | "";
};

export type UnitSortOption =
  | "price-asc"
  | "price-desc"
  | "newest"
  | "move-in"
  | "sqft";

function matchesFilters(unit: Unit, filters: UnitSearchFilters): boolean {
  if (filters.property && unit.property !== filters.property) return false;
  if (
    filters.location &&
    !unit.location.toLowerCase().includes(filters.location.toLowerCase()) &&
    !unit.neighborhood.toLowerCase().includes(filters.location.toLowerCase())
  ) {
    return false;
  }
  if (filters.maxRent != null && unit.rent > filters.maxRent) return false;
  if (filters.bedrooms != null && unit.beds < filters.bedrooms) return false;
  if (filters.bathrooms != null && unit.baths < filters.bathrooms) return false;
  if (filters.moveInDate && unit.availableDate > filters.moveInDate) return false;
  if (filters.minSqft != null && unit.sqft < filters.minSqft) return false;
  if (filters.pets === "yes" && !unit.petFriendly) return false;
  if (filters.pets === "no" && unit.petFriendly) return false;
  if (filters.accessibility && !unit.accessible) return false;
  if (filters.availability && unit.availability !== filters.availability) {
    return false;
  }
  if (filters.amenities?.length) {
    const missing = filters.amenities.some(
      (amenity) => !unit.amenities.includes(amenity)
    );
    if (missing) return false;
  }
  return true;
}

function sortUnits(units: Unit[], sort: UnitSortOption): Unit[] {
  const next = [...units];
  switch (sort) {
    case "price-desc":
      return next.sort((a, b) => b.rent - a.rent);
    case "newest":
      return next.sort((a, b) => b.listedAt.localeCompare(a.listedAt));
    case "move-in":
      return next.sort((a, b) => a.availableDate.localeCompare(b.availableDate));
    case "sqft":
      return next.sort((a, b) => b.sqft - a.sqft);
    case "price-asc":
    default:
      return next.sort((a, b) => a.rent - b.rent);
  }
}

/** @backend GET /api/portal/units */
export async function listUnits(options?: {
  filters?: UnitSearchFilters;
  sort?: UnitSortOption;
}): Promise<ServiceResult<Unit[]>> {
  return runMockService(() => {
    const filtered = MOCK_UNITS.filter((unit) =>
      matchesFilters(unit, options?.filters ?? {})
    );
    return sortUnits(filtered, options?.sort ?? "price-asc");
  }, {
    minMs: 160,
    maxMs: 420,
    failureRate: 0.03,
    failureMessage: "Could not load available units.",
  });
}

/** @backend GET /api/portal/units/:id */
export async function getUnit(unitId: string): Promise<ServiceResult<Unit>> {
  return runMockService(() => {
    const unit = MOCK_UNITS.find((item) => item.id === unitId);
    if (!unit) {
      throw new PortalServiceError("Unit not found.", "NOT_FOUND", 404);
    }
    return { ...unit, amenities: [...unit.amenities], artwork: [...unit.artwork] };
  }, {
    minMs: 100,
    maxMs: 280,
    failureRate: 0.02,
    failureMessage: "Could not load unit details.",
  });
}

/** Sync catalog access for UI that already hydrated client-side. */
export function getMockUnitsSync(): Unit[] {
  return [...MOCK_UNITS];
}

export function getMockSearchAmenities(): string[] {
  return [...MOCK_SEARCH_AMENITIES];
}

export function getMockPropertyNames(): string[] {
  return Array.from(new Set(MOCK_UNITS.map((unit) => unit.property)));
}
