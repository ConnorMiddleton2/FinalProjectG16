import { cookies } from "next/headers";
import { DEMO_ROLE_COOKIE } from "@/lib/demo-role-constants";
import {
  DEFAULT_ROLE,
  isUserRole,
  type UserRole,
} from "@/lib/types";

export { DEMO_ROLE_COOKIE } from "@/lib/demo-role-constants";

export function parseRole(value: string | null | undefined): UserRole | null {
  if (!value) return null;
  return isUserRole(value) ? value : null;
}

export async function readDemoRoleCookie(): Promise<UserRole | null> {
  const store = await cookies();
  return parseRole(store.get(DEMO_ROLE_COOKIE)?.value);
}

/**
 * Effective role for navigation and page access:
 * demo cookie (if valid) overrides the signed-in profile role.
 */
export function resolveEffectiveRole(
  profileRole: string | null | undefined,
  demoRole: UserRole | null
): UserRole {
  if (demoRole) return demoRole;
  return parseRole(profileRole) ?? DEFAULT_ROLE;
}
