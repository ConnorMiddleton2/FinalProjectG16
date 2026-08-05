"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createBookingId,
  readTourBookings,
  writeTourBookings,
  type TourBooking,
  type TourDraft,
} from "@/lib/tour-scheduling";

export function useTourBookings() {
  const [bookings, setBookings] = useState<TourBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    try {
      setBookings(readTourBookings());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load tour bookings from this browser."
      );
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const persist = useCallback((next: TourBooking[]) => {
    try {
      writeTourBookings(next);
      setBookings(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update tour bookings in this browser."
      );
      throw err;
    }
  }, []);

  const confirm = useCallback(
    (draft: TourDraft) => {
      const now = new Date().toISOString();
      const booking: TourBooking = {
        id: createBookingId(),
        ...draft,
        status: "confirmed",
        createdAt: now,
        updatedAt: now,
      };
      persist([booking, ...bookings]);
      return booking;
    },
    [bookings, persist]
  );

  const reschedule = useCallback(
    (id: string, date: string, time: string) => {
      const now = new Date().toISOString();
      persist(
        bookings.map((booking) =>
          booking.id === id
            ? { ...booking, date, time, updatedAt: now, status: "confirmed" }
            : booking
        )
      );
    },
    [bookings, persist]
  );

  const cancel = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      persist(
        bookings.map((booking) =>
          booking.id === id
            ? { ...booking, status: "cancelled", updatedAt: now }
            : booking
        )
      );
    },
    [bookings, persist]
  );

  return {
    bookings,
    loading,
    error,
    refresh,
    confirm,
    reschedule,
    cancel,
  };
}
