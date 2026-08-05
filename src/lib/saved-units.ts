/** Temporary browser storage for signed-out applicants (matches harborline_* keys). */
export const SAVED_UNITS_STORAGE_KEY = "harborline_saved_units";

export function readSavedUnitIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(SAVED_UNITS_STORAGE_KEY);
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Saved units data is not a list.");
  }

  return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function writeSavedUnitIds(ids: string[]) {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(ids));
  window.localStorage.setItem(SAVED_UNITS_STORAGE_KEY, JSON.stringify(unique));
}
