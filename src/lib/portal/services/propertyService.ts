/**
 * Property catalog service.
 *
 * @backend GET /api/portal/properties
 * @backend GET /api/portal/properties/:id
 */

import { MOCK_PROPERTIES } from "@/lib/portal/mock/data";
import { PortalServiceError } from "@/lib/portal/mock/delay";
import type { Property } from "@/lib/portal/models";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

/** @backend GET /api/portal/properties */
export async function listProperties(): Promise<ServiceResult<Property[]>> {
  return runMockService(() => [...MOCK_PROPERTIES], {
    minMs: 100,
    maxMs: 280,
    failureRate: 0.02,
    failureMessage: "Could not load properties.",
  });
}

/** @backend GET /api/portal/properties/:id */
export async function getProperty(
  propertyId: string
): Promise<ServiceResult<Property>> {
  return runMockService(() => {
    const property = MOCK_PROPERTIES.find((item) => item.id === propertyId);
    if (!property) {
      throw new PortalServiceError("Property not found.", "NOT_FOUND", 404);
    }
    return { ...property };
  }, {
    minMs: 80,
    maxMs: 220,
    failureRate: 0.02,
    failureMessage: "Could not load property details.",
  });
}
