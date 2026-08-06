"use server";

import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import {
  hashEmployeePassword,
  normalizeHrEmployee,
  type HrEmployee,
} from "@/lib/hr";
import { canAccessOpsModule } from "@/lib/team-auth";

export type HrPasswordActionResult =
  | { ok: true; temporaryPassword: string }
  | { ok: false; error: string };

function makeTempPassword(employeeId: string) {
  const slug = employeeId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `temp-${slug}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function issueEmployeeTempPassword(
  employeeId: string
): Promise<HrPasswordActionResult> {
  if (!(await canAccessOpsModule("hr"))) {
    return { ok: false, error: "Human resources access required." };
  }

  try {
    const client = await createClient();
    const rows = await listSharedRecords<Partial<HrEmployee> & { id: string }>(
      client,
      COLLECTIONS.hrEmployees
    );
    const raw = rows.find((r) => r.id === employeeId);
    if (!raw) return { ok: false, error: "Employee not found." };

    const emp = normalizeHrEmployee(raw);
    const temporaryPassword = makeTempPassword(emp.employeeId || emp.id);
    const passwordHash = hashEmployeePassword(temporaryPassword);
    const next: HrEmployee = {
      ...emp,
      temporaryPassword,
      passwordHash,
      mustResetPassword: true,
      updatedAt: new Date().toISOString(),
    };

    await upsertSharedRecord(
      client,
      COLLECTIONS.hrEmployees,
      next.id,
      next as unknown as Record<string, unknown>
    );

    return { ok: true, temporaryPassword };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not issue password.",
    };
  }
}

export async function clearEmployeeTempPassword(
  employeeId: string
): Promise<HrPasswordActionResult> {
  if (!(await canAccessOpsModule("hr"))) {
    return { ok: false, error: "Human resources access required." };
  }

  try {
    const client = await createClient();
    const rows = await listSharedRecords<Partial<HrEmployee> & { id: string }>(
      client,
      COLLECTIONS.hrEmployees
    );
    const raw = rows.find((r) => r.id === employeeId);
    if (!raw) return { ok: false, error: "Employee not found." };

    const emp = normalizeHrEmployee(raw);
    const next: HrEmployee = {
      ...emp,
      temporaryPassword: "",
      passwordHash: "",
      mustResetPassword: false,
      updatedAt: new Date().toISOString(),
    };

    await upsertSharedRecord(
      client,
      COLLECTIONS.hrEmployees,
      next.id,
      next as unknown as Record<string, unknown>
    );

    return { ok: true, temporaryPassword: "" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not clear password.",
    };
  }
}
