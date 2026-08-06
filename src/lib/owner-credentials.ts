/** Client-safe credential helpers (no Node crypto). */

export function isHashedPassword(stored: string): boolean {
  return stored.includes(":") && stored.split(":")[0].length === 32;
}

/** Password Management can display for support (demo / class project). */
export function ownerPasswordForAdmin(account: {
  password?: string;
  passwordReveal?: string;
}): string {
  if (account.passwordReveal?.trim()) return account.passwordReveal.trim();
  if (account.password && !isHashedPassword(account.password)) {
    return account.password;
  }
  return "";
}
