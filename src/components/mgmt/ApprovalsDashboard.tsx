"use client";

import { useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  deptExpenseToUnified,
  money,
  seedDepartmentExpenses,
  smReceiptToUnified,
  type DepartmentExpense,
  type UnifiedExpense,
} from "@/lib/management";
import type { SmReceipt } from "@/lib/sales-marketing";
import {
  normalizeBudgetConfig,
  seedBudgetConfig,
  type SmBudgetConfig,
} from "@/lib/sales-marketing";

export function ApprovalsDashboard() {
  const {
    items: deptItems,
    saveOne: saveDept,
    loading: deptLoading,
  } = useSharedCollection<DepartmentExpense>(
    COLLECTIONS.departmentExpenses,
    seedDepartmentExpenses
  );
  const {
    items: smItems,
    saveOne: saveSm,
    loading: smLoading,
  } = useSharedCollection<SmReceipt>(COLLECTIONS.smReceipts);
  const { items: budgetConfigs } = useSharedCollection<SmBudgetConfig>(
    COLLECTIONS.smBudgetConfig,
    seedBudgetConfig
  );

  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [msg, setMsg] = useState<string | null>(null);

  const unified = useMemo(() => {
    const rows: UnifiedExpense[] = [
      ...deptItems.map(deptExpenseToUnified),
      ...smItems.map(smReceiptToUnified),
    ].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return filter === "pending"
      ? rows.filter((r) => r.status === "pending")
      : rows;
  }, [deptItems, smItems, filter]);

  async function setStatus(
    row: UnifiedExpense,
    status: "approved" | "declined"
  ) {
    if (row.source === "department") {
      const raw = row.raw as DepartmentExpense;
      await saveDept({
        ...raw,
        status,
        approvedAt:
          status === "approved" ? new Date().toISOString() : raw.approvedAt,
      });
    } else {
      const raw = row.raw as SmReceipt;
      await saveSm({
        ...raw,
        status,
        approvedAt:
          status === "approved" ? new Date().toISOString() : raw.approvedAt,
      });
    }
    setMsg(
      status === "approved"
        ? "Approved — expense is solidified against the department budget."
        : "Declined."
    );
    setTimeout(() => setMsg(null), 2500);
  }

  // Reflect Management-owned S&M budget totals for context
  const budget = normalizeBudgetConfig(budgetConfigs[0]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm opacity-65 max-w-2xl">
          Departments submit expenses here. Only Management approval makes them
          count as solidified budget spend (including S&amp;M coded receipts).
        </p>
        <select
          className="select select-bordered select-sm bg-white"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "pending" | "all")}
        >
          <option value="pending">Pending only</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/80 px-3 py-2 text-sm">
        S&amp;M budget net (read-only from Management seed):{" "}
        <strong>
          {money(budget.categories.reduce((s, c) => s + c.budgeted, 0))}
        </strong>
      </div>

      {(deptLoading || smLoading) && (
        <p className="text-sm opacity-60">Loading expenses…</p>
      )}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}

      <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Code</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {unified.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center opacity-60">
                  No expenses in this filter.
                </td>
              </tr>
            ) : (
              unified.map((row) => (
                <tr key={row.id}>
                  <td>{row.departmentLabel}</td>
                  <td className="font-mono text-xs font-semibold">
                    {row.code}
                  </td>
                  <td>
                    <p className="font-medium">{row.vendor}</p>
                    <p className="text-xs opacity-60">{row.description}</p>
                    <p className="text-[10px] opacity-45">{row.fileName}</p>
                  </td>
                  <td>{money(row.amount)}</td>
                  <td>
                    <span
                      className={`badge badge-sm capitalize ${
                        row.status === "approved"
                          ? "badge-success"
                          : row.status === "declined"
                            ? "badge-error"
                            : "badge-warning"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>
                    {row.status === "pending" ? (
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-neutral btn-xs"
                          onClick={() => void setStatus(row, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => void setStatus(row, "declined")}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs opacity-45">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
