"use server";

import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  deleteSharedRecord,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import {
  CADE_EMPLOYEE_ID,
  normalizeHrEmployee,
  type HrEmployee,
  type HrPayStub,
} from "@/lib/hr";
import { buildHrEmployeeRecords } from "@/lib/hr-employee-roster";
import {
  biweeklyPeriodAround,
  buildPayrollRun,
  type PayrollLiability,
  type PayrollRun,
} from "@/lib/payroll-run";
import { postPayrollBankDebit } from "@/lib/bank-accounts";
import { requireOpsModule } from "@/lib/team-auth";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Wipe every employee except Cade; clear stubs/punches/prior payroll runs. */
export async function scrubEmployeesKeepCadeAction() {
  await requireOpsModule("hr");
  const client = await createClient();
  const [employees, stubs, punches, runs, liabilities] = await Promise.all([
    listSharedRecords<{ id: string }>(client, COLLECTIONS.hrEmployees),
    listSharedRecords<{ id: string; employeeId?: string }>(
      client,
      COLLECTIONS.hrPayStubs
    ),
    listSharedRecords<{ id: string; employeeKey?: string }>(
      client,
      COLLECTIONS.hrTimePunches
    ),
    listSharedRecords<{ id: string }>(client, COLLECTIONS.payrollRuns),
    listSharedRecords<{ id: string }>(client, COLLECTIONS.payrollLiabilities),
  ]);

  let removedEmployees = 0;
  for (const emp of employees) {
    if (emp.id === CADE_EMPLOYEE_ID) continue;
    await deleteSharedRecord(client, COLLECTIONS.hrEmployees, emp.id);
    removedEmployees += 1;
  }

  let removedStubs = 0;
  for (const stub of stubs) {
    if (stub.employeeId === CADE_EMPLOYEE_ID) continue;
    await deleteSharedRecord(client, COLLECTIONS.hrPayStubs, stub.id);
    removedStubs += 1;
  }

  let removedPunches = 0;
  for (const punch of punches) {
    const key = (punch.employeeKey || "").toLowerCase();
    if (key.includes("cade") || key === CADE_EMPLOYEE_ID) continue;
    await deleteSharedRecord(client, COLLECTIONS.hrTimePunches, punch.id);
    removedPunches += 1;
  }

  for (const run of runs) {
    await deleteSharedRecord(client, COLLECTIONS.payrollRuns, run.id);
  }
  for (const liab of liabilities) {
    await deleteSharedRecord(client, COLLECTIONS.payrollLiabilities, liab.id);
  }

  return {
    ok: true as const,
    removedEmployees,
    removedStubs,
    removedPunches,
    removedRuns: runs.length,
  };
}

/** Replace roster with corporate + on-site staff (keeps Cade credentials). */
export async function seedCPMCEmployeesAction() {
  await requireOpsModule("hr");
  const client = await createClient();
  const roster = buildHrEmployeeRecords();
  for (const emp of roster) {
    await upsertSharedRecord(
      client,
      COLLECTIONS.hrEmployees,
      emp.id,
      emp as unknown as Record<string, unknown>
    );
  }
  return { ok: true as const, count: roster.length };
}

/**
 * Accrue a biweekly payroll run: stubs + liability buckets (not paid yet).
 */
export async function accruePayrollRunAction(input?: {
  periodStart?: string;
  periodEnd?: string;
  payDate?: string;
}) {
  await requireOpsModule("hr");
  const client = await createClient();
  const period = biweeklyPeriodAround();
  const periodStart = input?.periodStart || period.start;
  const periodEnd = input?.periodEnd || period.end;
  const payDate = input?.payDate || period.payDate;

  const employees = (
    await listSharedRecords<Partial<HrEmployee> & { id: string }>(
      client,
      COLLECTIONS.hrEmployees
    )
  ).map(normalizeHrEmployee);

  const built = buildPayrollRun({
    employees,
    periodStart,
    periodEnd,
    payDate,
  });

  await upsertSharedRecord(
    client,
    COLLECTIONS.payrollRuns,
    built.run.id,
    built.run as unknown as Record<string, unknown>
  );
  for (const liab of built.liabilities) {
    await upsertSharedRecord(
      client,
      COLLECTIONS.payrollLiabilities,
      liab.id,
      liab as unknown as Record<string, unknown>
    );
  }
  const now = new Date().toISOString();
  for (const stub of built.stubs) {
    const full: HrPayStub = {
      ...stub,
      createdAt: now,
      updatedAt: now,
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.hrPayStubs,
      full.id,
      full as unknown as Record<string, unknown>
    );
  }

  return {
    ok: true as const,
    run: built.run,
    liabilityCount: built.liabilities.length,
    stubCount: built.stubs.length,
  };
}

/**
 * Pay an accrued payroll run: withdraw net pay, taxes, and benefits from the
 * appropriate corporate / property bank accounts; mark liabilities paid.
 */
export async function payPayrollRunAction(input: { runId: string }) {
  await requireOpsModule("hr");
  const client = await createClient();
  const [runs, liabilities, stubs] = await Promise.all([
    listSharedRecords<PayrollRun>(client, COLLECTIONS.payrollRuns),
    listSharedRecords<PayrollLiability>(
      client,
      COLLECTIONS.payrollLiabilities
    ),
    listSharedRecords<HrPayStub>(client, COLLECTIONS.hrPayStubs),
  ]);

  const run = runs.find((r) => r.id === input.runId);
  if (!run) return { error: "Payroll run not found." as const };
  if (run.status === "paid") {
    return { error: "This payroll run is already paid." as const };
  }

  const runLiabs = liabilities.filter((l) => l.runId === run.id);
  const posts: Array<{ memo: string; amount: number; account: string }> = [];

  for (const debit of run.accountDebits) {
    const slices: Array<{
      amount: number;
      memo: string;
      counterparty: string;
      relatedSuffix: string;
    }> = [
      {
        amount: debit.netPay,
        memo: `Payroll · Direct deposits · ${run.payDate}`,
        counterparty: "Employee direct deposits",
        relatedSuffix: "net",
      },
      {
        amount: debit.taxRemittance,
        memo: `Payroll · Tax remittance · ${run.payDate}`,
        counterparty: "Tax agencies",
        relatedSuffix: "tax",
      },
      {
        amount: debit.benefits,
        memo: `Payroll · Benefits · ${run.payDate}`,
        counterparty: "Benefits carriers",
        relatedSuffix: "benefits",
      },
    ];

    for (const slice of slices) {
      if (slice.amount <= 0) continue;
      const relatedId = `${run.id}:${debit.costCenter}:${debit.propertyId || "corp"}:${slice.relatedSuffix}`;
      const posted = await postPayrollBankDebit({
        costCenter: debit.costCenter,
        propertyId: debit.propertyId,
        propertyName: debit.propertyName,
        amount: slice.amount,
        memo: slice.memo,
        counterparty: slice.counterparty,
        relatedId,
        period: run.period,
        // Corporate often has low cash until fees sweep; allow for demo payday.
        allowOverdraft: true,
      });
      if ("error" in posted && posted.error) {
        return { error: posted.error };
      }
      posts.push({
        memo: slice.memo,
        amount: slice.amount,
        account:
          debit.costCenter === "corporate"
            ? "CPMC Corporate"
            : debit.propertyName,
      });
    }
  }

  const now = new Date().toISOString();
  for (const liab of runLiabs) {
    const next: PayrollLiability = {
      ...liab,
      amountPaid: liab.amount,
      updatedAt: now,
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.payrollLiabilities,
      next.id,
      next as unknown as Record<string, unknown>
    );
  }

  for (const stub of stubs.filter((s) => s.id.includes(run.id) || s.payDate === run.payDate)) {
    if (!stub.id.includes(run.payDate) && !stub.id.includes(run.id)) continue;
    const next: HrPayStub = {
      ...stub,
      status: "paid",
      updatedAt: now,
      notes: `${stub.notes || ""} · Paid ${now.slice(0, 10)}`.trim(),
    };
    await upsertSharedRecord(
      client,
      COLLECTIONS.hrPayStubs,
      next.id,
      next as unknown as Record<string, unknown>
    );
  }

  const paidRun: PayrollRun = {
    ...run,
    status: "paid",
    paidAt: now,
    updatedAt: now,
    notes: `Paid from banks · ${posts.length} withdrawals · total ${round2(run.totalCashOut).toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.payrollRuns,
    paidRun.id,
    paidRun as unknown as Record<string, unknown>
  );

  return {
    ok: true as const,
    run: paidRun,
    withdrawals: posts.length,
    totalCashOut: run.totalCashOut,
  };
}

/** Scrub → seed roster → accrue → pay current biweekly payroll in one path. */
export async function resetRosterAndRunPayrollAction() {
  await requireOpsModule("hr");
  const scrubbed = await scrubEmployeesKeepCadeAction();
  const seeded = await seedCPMCEmployeesAction();
  const accrued = await accruePayrollRunAction();
  if (!("ok" in accrued) || !accrued.ok) {
    return { error: "Failed to accrue payroll." as const, scrubbed, seeded };
  }
  const paid = await payPayrollRunAction({ runId: accrued.run.id });
  if ("error" in paid && paid.error) {
    return { error: paid.error, scrubbed, seeded, accrued };
  }
  return {
    ok: true as const,
    scrubbed,
    seeded,
    accrued,
    paid,
  };
}
