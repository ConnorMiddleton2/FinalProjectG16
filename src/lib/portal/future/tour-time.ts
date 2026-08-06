/**
 * Tour time display helpers.
 * Storage stays 24-hour "HH:mm"; UI shows 12-hour AM/PM with a fixed property time zone.
 */

/** Harborline leasing local zone (Harbor City / Mississippi). */
export const TOUR_TIME_ZONE_ID = "America/Chicago";
export const TOUR_TIME_ZONE_LABEL = "Central Time";
export const TOUR_TIME_ZONE_SHORT = "Central Time";

/** Convert "09:00" / "13:00" → "9:00 AM" / "1:00 PM". */
export function formatTourTime12h(time24: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
  if (!match) return time24;
  let hour = Number(match[1]);
  const minute = match[2]!;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return time24;
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${period}`;
}

/** e.g. "9:00 AM Central Time" */
export function formatTourTimeWithZone(time24: string): string {
  return `${formatTourTime12h(time24)} ${TOUR_TIME_ZONE_SHORT}`;
}

/** e.g. "9:00 AM · Central Time" */
export function formatTourTimeSelected(time24: string): string {
  return `${formatTourTime12h(time24)} · ${TOUR_TIME_ZONE_LABEL}`;
}
