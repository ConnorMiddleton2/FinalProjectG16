/** Client-safe DOB helpers (no Node / server imports). */

export function ageFromDob(iso: string): number | null {
  if (!iso) return null;
  const dob = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function requiresGuarantor(dateOfBirth: string): boolean {
  const age = ageFromDob(dateOfBirth);
  return age != null && age < 21;
}
