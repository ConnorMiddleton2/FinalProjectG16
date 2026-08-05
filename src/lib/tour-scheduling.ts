/** Isolated mock tour scheduling — no backend. */

export const TOUR_BOOKINGS_STORAGE_KEY = "harborline_tour_bookings";

export type TourType = "In-Person" | "Virtual" | "Self-Guided";

export type TourBookingStatus = "confirmed" | "cancelled";

export type TourBooking = {
  id: string;
  property: string;
  unitId: string;
  floorPlan: string;
  tourType: TourType;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  accessibility: string;
  notes: string;
  status: TourBookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type TourDraft = {
  property: string;
  unitId: string;
  floorPlan: string;
  tourType: TourType;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  accessibility: string;
  notes: string;
};

/** Properties that support Self-Guided tours. */
export const SELF_GUIDED_PROPERTIES = new Set([
  "Pier 12 Residences",
  "Canal Yard Lofts",
  "Marina House",
]);

export const BASE_TIME_SLOTS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
] as const;

export function emptyTourDraft(unitId = ""): TourDraft {
  return {
    property: "",
    unitId,
    floorPlan: "",
    tourType: "In-Person",
    date: "",
    time: "",
    guests: 1,
    name: "",
    email: "",
    phone: "",
    accessibility: "",
    notes: "",
  };
}

export function supportedTourTypes(property: string): TourType[] {
  const types: TourType[] = ["In-Person", "Virtual"];
  if (SELF_GUIDED_PROPERTIES.has(property)) {
    types.push("Self-Guided");
  }
  return types;
}

function parseSlotToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

export function isPastDate(dateKey: string, now = new Date()): boolean {
  const today = toDateKey(now);
  return dateKey < today;
}

export function isPastOrUnavailableSlot(
  dateKey: string,
  time: string,
  now = new Date()
): boolean {
  if (isPastDate(dateKey, now)) return true;
  if (dateKey > toDateKey(now)) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return parseSlotToMinutes(time) <= currentMinutes;
}

/**
 * Deterministic mock availability for a property + tour type + date.
 * Some weekdays/slots are blocked so the calendar feels realistic.
 */
export function getMockAvailableSlots(
  property: string,
  tourType: TourType,
  dateKey: string,
  existingBookings: TourBooking[] = [],
  now = new Date()
): string[] {
  if (!property || !dateKey || isPastDate(dateKey, now)) return [];

  const date = parseDateKey(dateKey);
  const day = date.getDay(); // 0 Sun … 6 Sat

  // Office closed Sundays for in-person; virtual still open.
  if (day === 0 && tourType === "In-Person") return [];
  // Self-guided only on weekdays in this mock.
  if (tourType === "Self-Guided" && (day === 0 || day === 6)) return [];

  const seed =
    property.length * 17 +
    tourType.length * 11 +
    Number(dateKey.replaceAll("-", ""));

  const blockedIndexes = new Set<number>();
  // Block a couple of slots based on seed.
  blockedIndexes.add(seed % BASE_TIME_SLOTS.length);
  blockedIndexes.add((seed * 3) % BASE_TIME_SLOTS.length);
  if (day === 6) {
    // Saturdays: only morning slots for in-person.
    BASE_TIME_SLOTS.forEach((slot, index) => {
      if (parseSlotToMinutes(slot) >= 13 * 60) blockedIndexes.add(index);
    });
  }

  const taken = new Set(
    existingBookings
      .filter(
        (booking) =>
          booking.status === "confirmed" &&
          booking.property === property &&
          booking.date === dateKey &&
          booking.tourType === tourType
      )
      .map((booking) => booking.time)
  );

  return BASE_TIME_SLOTS.filter((slot, index) => {
    if (blockedIndexes.has(index)) return false;
    if (taken.has(slot)) return false;
    if (isPastOrUnavailableSlot(dateKey, slot, now)) return false;
    return true;
  });
}

/** Next `days` calendar dates starting tomorrow (or today if includeToday). */
export function upcomingDateKeys(days = 21, includeToday = true): string[] {
  const keys: string[] = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const offset = includeToday ? 0 : 1;
  for (let i = offset; i < days + offset; i += 1) {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    keys.push(toDateKey(next));
  }
  return keys;
}

export function readTourBookings(): TourBooking[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(TOUR_BOOKINGS_STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Tour booking data is not a list.");
  }
  return parsed.filter(
    (item): item is TourBooking =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as TourBooking).id === "string"
  );
}

export function writeTourBookings(bookings: TourBooking[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    TOUR_BOOKINGS_STORAGE_KEY,
    JSON.stringify(bookings)
  );
}

export function createBookingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tour-${Date.now()}`;
}
