/**
 * Tour scheduling service.
 *
 * @backend GET/POST /api/portal/tours
 * @backend PATCH /api/portal/tours/:id
 */

import type { Tour, TourStatus } from "@/lib/portal/models";
import { PortalServiceError } from "@/lib/portal/mock/delay";
import { MOCK_TOURS } from "@/lib/portal/mock/data";
import {
  createBookingId,
  readTourBookings,
  writeTourBookings,
  type TourBooking,
  type TourDraft,
} from "@/lib/tour-scheduling";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

function fromBooking(booking: TourBooking): Tour {
  return {
    id: booking.id,
    property: booking.property,
    unitId: booking.unitId,
    floorPlan: booking.floorPlan,
    tourType: booking.tourType,
    date: booking.date,
    time: booking.time,
    guests: booking.guests,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    accessibility: booking.accessibility,
    notes: booking.notes,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function ensureSeedBookings(): TourBooking[] {
  const existing = readTourBookings();
  if (existing.length > 0) return existing;
  const seeded: TourBooking[] = MOCK_TOURS.map((tour) => ({
    id: tour.id,
    property: tour.property,
    unitId: tour.unitId,
    floorPlan: tour.floorPlan,
    tourType: tour.tourType,
    date: tour.date,
    time: tour.time,
    guests: tour.guests,
    name: tour.name,
    email: tour.email,
    phone: tour.phone,
    accessibility: tour.accessibility,
    notes: tour.notes,
    status: tour.status === "cancelled" ? "cancelled" : "confirmed",
    createdAt: tour.createdAt,
    updatedAt: tour.updatedAt,
  }));
  writeTourBookings(seeded);
  return seeded;
}

/** @backend GET /api/portal/tours */
export async function listTours(): Promise<ServiceResult<Tour[]>> {
  return runMockService(() => ensureSeedBookings().map(fromBooking), {
    minMs: 140,
    maxMs: 360,
    failureRate: 0.03,
    failureMessage: "Could not load tours.",
  });
}

/** @backend GET /api/portal/tours/:id */
export async function getTour(tourId: string): Promise<ServiceResult<Tour>> {
  return runMockService(() => {
    const tour = ensureSeedBookings().find((item) => item.id === tourId);
    if (!tour) {
      throw new PortalServiceError("Tour not found.", "NOT_FOUND", 404);
    }
    return fromBooking(tour);
  }, {
    minMs: 100,
    maxMs: 260,
    failureRate: 0.02,
    failureMessage: "Could not load tour details.",
  });
}

/** @backend POST /api/portal/tours */
export async function createTour(
  draft: TourDraft
): Promise<ServiceResult<Tour>> {
  return runMockService(() => {
    const now = new Date().toISOString();
    const booking: TourBooking = {
      id: createBookingId(),
      property: draft.property,
      unitId: draft.unitId,
      floorPlan: draft.floorPlan,
      tourType: draft.tourType,
      date: draft.date,
      time: draft.time,
      guests: draft.guests,
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
      accessibility: draft.accessibility,
      notes: draft.notes,
      status: "confirmed",
      createdAt: now,
      updatedAt: now,
    };
    writeTourBookings([booking, ...ensureSeedBookings()]);
    return fromBooking(booking);
  }, {
    minMs: 280,
    maxMs: 700,
    failureRate: 0.05,
    failureMessage: "Could not confirm this tour. Please try another time.",
  });
}

/** @backend PATCH /api/portal/tours/:id */
export async function updateTourStatus(
  tourId: string,
  status: Extract<TourStatus, "confirmed" | "cancelled">
): Promise<ServiceResult<Tour>> {
  return runMockService(() => {
    const bookings = ensureSeedBookings();
    const index = bookings.findIndex((item) => item.id === tourId);
    if (index < 0) {
      throw new PortalServiceError("Tour not found.", "NOT_FOUND", 404);
    }
    const updated: TourBooking = {
      ...bookings[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    const next = [...bookings];
    next[index] = updated;
    writeTourBookings(next);
    return fromBooking(updated);
  }, {
    minMs: 180,
    maxMs: 420,
    failureRate: 0.04,
    failureMessage: "Could not update tour status.",
  });
}
