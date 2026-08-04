import { ROLE_META, type UserRole } from "@/lib/types";

/** App route prefixes that belong to the signed-in product shell. */
export const APP_ROUTE_PREFIXES = [
  "/executive",
  "/manager",
  "/maintenance",
  "/accounting",
  "/owner",
  "/tenant",
  "/vendor",
  "/workspace",
] as const;

export function isAppPath(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const allowed = ROLE_META[role].allowedPaths;
  return allowed.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function homePathForRole(role: UserRole): string {
  return ROLE_META[role].href;
}
