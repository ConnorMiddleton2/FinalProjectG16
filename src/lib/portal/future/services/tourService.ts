/**
 * Tour scheduling mock service.
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/tours/availability
 *   POST /api/portal/future/tours
 *   GET  /api/portal/future/tours
 *   PATCH /api/portal/future/tours/:id
 *   POST /api/portal/future/tours/:id/cancel
 */

import {
  FUTURE_PROPERTIES,
  getMockTourRequests,
} from "@/lib/portal/future/mock-data";
import type { TourRequest, TourType } from "@/lib/portal/future/models";
import {
  assertNotForcedError,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

/** Mock slots from 9am–4pm inclusive (hourly). */
export const TOUR_TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
] as const;

const toursByOwner = new Map<string, TourRequest[]>();

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isPastDate(date: string): boolean {
  return date < todayIsoDate();
}

function getOwnerTours(ownerId: string): TourRequest[] {
  if (!toursByOwner.has(ownerId)) {
    toursByOwner.set(ownerId, getMockTourRequests(ownerId).map((t) => ({ ...t })));
  }
  return toursByOwner.get(ownerId)!;
}

function setOwnerTours(ownerId: string, tours: TourRequest[]) {
  toursByOwner.set(ownerId, tours);
}

export type TourAvailability = {
  propertyId: string;
  date: string;
  slots: Array<{ time: string; available: boolean }>;
};

export async function getAvailability(
  propertyId: string,
  date: string
): Promise<ServiceResult<TourAvailability>> {
  const forced = assertNotForcedError("getAvailability");
  if (forced) return forced;

  try {
    await simulateLatency(300);
    const property = FUTURE_PROPERTIES.find((p) => p.id === propertyId);
    if (!property) {
      return fail("That property could not be found.", "not_found");
    }
    if (isPastDate(date)) {
      return fail("Past dates cannot be selected for tours.", "validation");
    }

    // BACKEND_TODO: load booked slots from scheduling backend
    const booked = new Set<string>();
    for (const tours of toursByOwner.values()) {
      for (const tour of tours) {
        if (
          tour.propertyId === propertyId &&
          tour.date === date &&
          (tour.status === "scheduled" || tour.status === "rescheduled")
        ) {
          booked.add(tour.timeSlot);
        }
      }
    }

    // Deterministic mock: block 12:00 on even calendar days for variety.
    const dayNum = Number(date.slice(-2));
    if (!Number.isNaN(dayNum) && dayNum % 2 === 0) {
      booked.add("12:00");
    }

    return ok(
      {
        propertyId,
        date,
        slots: TOUR_TIME_SLOTS.map((time) => ({
          time,
          available: !booked.has(time),
        })),
      },
      "mock"
    );
  } catch (err) {
    return failFromUnknown(
      err,
      "Could not load tour availability.",
      "network"
    );
  }
}

export type CreateTourInput = {
  ownerUserId: string;
  propertyId: string;
  unitId?: string | null;
  unitLabel?: string | null;
  tourType: TourType;
  date: string;
  timeSlot: string;
  guestCount: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  accessibilityRequests?: string;
  notes?: string;
};

export async function createTour(
  input: CreateTourInput
): Promise<ServiceResult<TourRequest>> {
  const forced = assertNotForcedError("createTour");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);

    if (!input.ownerUserId) {
      return fail("An owner user id is required.", "validation");
    }
    if (isPastDate(input.date)) {
      return fail("Past dates cannot be selected for tours.", "validation");
    }
    if (!(TOUR_TIME_SLOTS as readonly string[]).includes(input.timeSlot)) {
      return fail("That time slot is not offered.", "validation");
    }

    const availability = await getAvailability(input.propertyId, input.date);
    if (!availability.ok) return availability;
    const slot = availability.data.slots.find((s) => s.time === input.timeSlot);
    if (!slot?.available) {
      return fail("That time slot is no longer available.", "conflict");
    }

    const property = FUTURE_PROPERTIES.find((p) => p.id === input.propertyId);
    if (!property) {
      return fail("That property could not be found.", "not_found");
    }

    const now = new Date().toISOString();
    const tour: TourRequest = {
      id: `tour-${crypto.randomUUID().slice(0, 8)}`,
      ownerUserId: input.ownerUserId,
      propertyId: input.propertyId,
      propertyName: property.name,
      unitId: input.unitId ?? null,
      unitLabel: input.unitLabel ?? null,
      tourType: input.tourType,
      date: input.date,
      timeSlot: input.timeSlot,
      guestCount: input.guestCount,
      contactName: input.contactName.trim(),
      contactEmail: input.contactEmail.trim(),
      contactPhone: input.contactPhone.trim(),
      accessibilityRequests: input.accessibilityRequests?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    };

    const existing = getOwnerTours(input.ownerUserId);
    setOwnerTours(input.ownerUserId, [tour, ...existing]);
    // BACKEND_TODO: persist tour + send confirmation notification
    return ok(tour, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not schedule your tour.", "network");
  }
}

export async function listTours(
  ownerId: string
): Promise<ServiceResult<TourRequest[]>> {
  const forced = assertNotForcedError("listTours");
  if (forced) return forced;

  try {
    await simulateLatency();
    if (!ownerId) {
      return fail("An owner user id is required.", "validation");
    }
    // BACKEND_TODO: list tours scoped to authenticated applicant only
    const tours = getOwnerTours(ownerId).filter((t) => t.ownerUserId === ownerId);
    return ok(
      tours.sort((a, b) => `${b.date}${b.timeSlot}`.localeCompare(`${a.date}${a.timeSlot}`)),
      "mock"
    );
  } catch (err) {
    return failFromUnknown(err, "Could not load your tours.", "network");
  }
}

export async function rescheduleTour(input: {
  ownerUserId: string;
  tourId: string;
  date: string;
  timeSlot: string;
}): Promise<ServiceResult<TourRequest>> {
  const forced = assertNotForcedError("rescheduleTour");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (isPastDate(input.date)) {
      return fail("Past dates cannot be selected for tours.", "validation");
    }

    const tours = getOwnerTours(input.ownerUserId);
    const current = tours.find(
      (t) => t.id === input.tourId && t.ownerUserId === input.ownerUserId
    );
    if (!current) {
      return fail("That tour could not be found.", "not_found");
    }
    if (current.status === "cancelled" || current.status === "completed") {
      return fail("That tour cannot be rescheduled.", "conflict");
    }

    const availability = await getAvailability(current.propertyId, input.date);
    if (!availability.ok) return availability;
    const slot = availability.data.slots.find((s) => s.time === input.timeSlot);
    if (!slot?.available) {
      return fail("That time slot is no longer available.", "conflict");
    }

    const now = new Date().toISOString();
    const next = tours.map((t) =>
      t.id === input.tourId
        ? {
            ...t,
            date: input.date,
            timeSlot: input.timeSlot,
            status: "rescheduled" as const,
            updatedAt: now,
          }
        : t
    );
    setOwnerTours(input.ownerUserId, next);
    // BACKEND_TODO: update scheduling system + notify leasing
    return ok(next.find((t) => t.id === input.tourId)!, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not reschedule your tour.", "network");
  }
}

export async function cancelTour(input: {
  ownerUserId: string;
  tourId: string;
}): Promise<ServiceResult<TourRequest>> {
  const forced = assertNotForcedError("cancelTour");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const tours = getOwnerTours(input.ownerUserId);
    const current = tours.find(
      (t) => t.id === input.tourId && t.ownerUserId === input.ownerUserId
    );
    if (!current) {
      return fail("That tour could not be found.", "not_found");
    }
    if (current.status === "cancelled") {
      return ok(current, "mock");
    }

    const now = new Date().toISOString();
    const next = tours.map((t) =>
      t.id === input.tourId
        ? { ...t, status: "cancelled" as const, updatedAt: now }
        : t
    );
    setOwnerTours(input.ownerUserId, next);
    // BACKEND_TODO: cancel in scheduling backend
    return ok(next.find((t) => t.id === input.tourId)!, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not cancel your tour.", "network");
  }
}
