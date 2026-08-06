import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import {
  ALL_HR_OPS_MODULES,
  CADE_EMPLOYEE_ID,
  employeeNeedsModuleAccessSync,
  getEmployeeLoginModules,
  makeCadeEmployee,
  normalizeHrEmployee,
  syncEmployeeModuleAccess,
  type HrEmployee,
  type HrOpsModule,
} from "@/lib/hr";
import { verifyPassword } from "@/lib/owner-password";
import { DEMO_EMPLOYEE } from "@/lib/team-credentials";

export const TEAM_COOKIE = "harborline_team";
export const TEAM_COOKIE_ADMIN = "admin";
export { DEMO_EMPLOYEE };

export type TeamSession =
  | { kind: "admin"; modules: HrOpsModule[] }
  | {
      kind: "employee";
      employee: HrEmployee;
      modules: HrOpsModule[];
    };

export function getTeamCredentials() {
  return {
    companyId: process.env.TEAM_COMPANY_ID?.trim() || DEMO_EMPLOYEE.companyId,
    password: process.env.TEAM_PASSWORD?.trim() || DEMO_EMPLOYEE.password,
  };
}

/** Ensure Cade Coburn exists even when HR was seeded earlier without him. */
export async function ensureCadeEmployee(client: SupabaseClient) {
  const rows = await listSharedRecords<Partial<HrEmployee> & { id: string }>(
    client,
    COLLECTIONS.hrEmployees
  );
  const cade = makeCadeEmployee();
  const existing =
    rows.find((r) => r.id === CADE_EMPLOYEE_ID) ??
    rows.find(
      (r) =>
        typeof r.email === "string" &&
        r.email.toLowerCase() === cade.email.toLowerCase()
    );

  if (!existing) {
    await upsertSharedRecord(
      client,
      COLLECTIONS.hrEmployees,
      cade.id,
      cade as unknown as Record<string, unknown>
    );
    return;
  }

  const normalized = normalizeHrEmployee({
    ...existing,
    id: existing.id,
    category: "corporate",
  });
  const withAccess: HrEmployee = {
    ...normalized,
    moduleAccess: syncEmployeeModuleAccess(normalized),
    updatedAt: new Date().toISOString(),
  };

  if (
    existing.category === "corporate" &&
    !employeeNeedsModuleAccessSync(withAccess)
  ) {
    return;
  }

  await upsertSharedRecord(
    client,
    COLLECTIONS.hrEmployees,
    withAccess.id,
    withAccess as unknown as Record<string, unknown>
  );
}

export async function listHrEmployees(
  client: SupabaseClient
): Promise<HrEmployee[]> {
  await ensureCadeEmployee(client);
  const rows = await listSharedRecords<Partial<HrEmployee> & { id: string }>(
    client,
    COLLECTIONS.hrEmployees
  );
  return rows.map((r) => normalizeHrEmployee(r));
}

export function verifyEmployeePassword(
  employee: HrEmployee,
  password: string
): boolean {
  if (employee.passwordHash) {
    return verifyPassword(password, employee.passwordHash);
  }
  if (employee.temporaryPassword) {
    return verifyPassword(password, employee.temporaryPassword);
  }
  return false;
}

export async function findEmployeeByEmail(
  client: SupabaseClient,
  email: string
): Promise<HrEmployee | null> {
  const employees = await listHrEmployees(client);
  const needle = email.trim().toLowerCase();
  return employees.find((e) => e.email.trim().toLowerCase() === needle) ?? null;
}

export async function getTeamSession(): Promise<TeamSession | null> {
  const jar = await cookies();
  const value = jar.get(TEAM_COOKIE)?.value;
  if (!value) return null;

  if (value === TEAM_COOKIE_ADMIN || value === "1") {
    return { kind: "admin", modules: [...ALL_HR_OPS_MODULES] };
  }

  try {
    const client = await createClient();
    const employees = await listHrEmployees(client);
    const employee = employees.find((e) => e.id === value);
    if (!employee || employee.status !== "active") return null;
    return {
      kind: "employee",
      employee,
      modules: getEmployeeLoginModules(employee),
    };
  } catch {
    return null;
  }
}

export async function hasTeamAccess() {
  return (await getTeamSession()) != null;
}

export async function canAccessOpsModule(module: HrOpsModule) {
  const session = await getTeamSession();
  if (!session) return false;
  if (session.kind === "admin") return true;
  return session.modules.includes(module);
}

/** Redirect to /team if not logged in, or /ops if missing the module. */
export async function requireOpsModule(module: HrOpsModule) {
  const session = await getTeamSession();
  if (!session) redirect("/team");
  if (session.kind === "admin") return session;
  if (!session.modules.includes(module)) redirect("/ops");
  return session;
}

export function sessionAllowsModule(
  session: TeamSession | null,
  module: HrOpsModule
) {
  if (!session) return false;
  if (session.kind === "admin") return true;
  return session.modules.includes(module);
}

/** null allowedModules means admin (show all). */
export function allowedModulesForNav(
  session: TeamSession | null
): HrOpsModule[] | null {
  if (!session) return [];
  if (session.kind === "admin") return null;
  return session.modules;
}
