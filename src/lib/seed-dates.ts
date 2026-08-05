const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Seed dates are relative to today so the demo data keeps covering the current
 * month and the five months before it no matter when the app is opened.
 */
export function shiftDays(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthStart(monthsAgo: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d;
}

/** ISO date for a day within the month `monthsAgo` before the current month. */
export function monthDay(monthsAgo: number, day: number) {
  const start = monthStart(monthsAgo);
  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${pad(month)}-${pad(Math.min(day, lastDay))}`;
}

/** "202608" — used to build readable, unique seed invoice numbers and ids. */
export function monthCode(monthsAgo: number) {
  const start = monthStart(monthsAgo);
  return `${start.getFullYear()}${pad(start.getMonth() + 1)}`;
}

/** "2026-08" for invoice numbers that read like a billing period. */
export function monthSlug(monthsAgo: number) {
  const start = monthStart(monthsAgo);
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}`;
}

/** "Aug 2026" — matches the period labels shown throughout the A/R and A/P tables. */
export function monthPeriodLabel(monthsAgo: number) {
  const start = monthStart(monthsAgo);
  return `${SHORT_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
}
