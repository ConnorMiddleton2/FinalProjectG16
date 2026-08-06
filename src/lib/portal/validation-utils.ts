/**
 * Shared portal form validation helpers.
 * Prefer these over page-local email/phone/date copies.
 */

export const PORTAL_MAX_EMAIL_LENGTH = 254;
export const PORTAL_MAX_PHONE_LENGTH = 30;
export const PORTAL_MAX_NAME_LENGTH = 80;
export const PORTAL_MAX_ADDRESS_LENGTH = 500;
export const PORTAL_MAX_SHORT_TEXT = 120;
export const PORTAL_MAX_MEDIUM_TEXT = 1000;
export const PORTAL_MAX_LONG_TEXT = 5000;

export const PORTAL_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
export const PORTAL_ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
export const PORTAL_ALLOWED_ATTACHMENT_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
] as const;

export function isPlausiblePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function isPlausibleEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > PORTAL_MAX_EMAIL_LENGTH) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Parse YYYY-MM-DD as local noon to avoid timezone day-shift. */
export function parseIsoDateLocal(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso.slice(0, 10))) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function todayIsoLocal(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isIsoDateNotFuture(iso: string, todayIso = todayIsoLocal()) {
  const date = parseIsoDateLocal(iso);
  if (!date) return false;
  return iso.slice(0, 10) <= todayIso;
}

export function isIsoDateNotPast(iso: string, todayIso = todayIsoLocal()) {
  const date = parseIsoDateLocal(iso);
  if (!date) return false;
  return iso.slice(0, 10) >= todayIso;
}

export type DateRangeError = "invalid-from" | "invalid-to" | "inverted" | null;

export function validateCustomDateRange(
  from: string,
  to: string
): DateRangeError {
  if (!from && !to) return null;
  if (from && !parseIsoDateLocal(from)) return "invalid-from";
  if (to && !parseIsoDateLocal(to)) return "invalid-to";
  if (from && to && from > to) return "inverted";
  return null;
}

export function dateRangeErrorMessage(error: DateRangeError): string | null {
  switch (error) {
    case "invalid-from":
      return "Enter a valid start date.";
    case "invalid-to":
      return "Enter a valid end date.";
    case "inverted":
      return "Start date must be on or before the end date.";
    default:
      return null;
  }
}

export function enforceMaxLength(
  value: string,
  max: number,
  label: string
): string | null {
  if (value.length > max) {
    return `${label} must be ${max} characters or fewer.`;
  }
  return null;
}

export function isAllowedPortalAttachment(
  file: { name: string; type: string; size: number },
  maxBytes = PORTAL_MAX_ATTACHMENT_BYTES
): string | null {
  const lower = file.name.toLowerCase();
  const extOk = PORTAL_ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) =>
    lower.endsWith(ext)
  );
  const typeOk =
    !file.type ||
    (PORTAL_ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(file.type);

  if (!extOk && !typeOk) {
    return "Attachments must be JPG, PNG, WEBP, or PDF.";
  }
  if (file.size <= 0) {
    return "One of the selected files is empty.";
  }
  if (file.size > maxBytes) {
    return "Each attachment must be 5 MB or smaller.";
  }
  return null;
}

export function formatPortalFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
