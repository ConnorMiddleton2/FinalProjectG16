"use client";

import { useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  deptExpenseToUnified,
  money,
  seedApPayables,
  seedDepartmentExpenses,
  smReceiptToUnified,
  unifiedExpenseToApPayable,
  type ApPayable,
  type DepartmentExpense,
  type UnifiedExpense,
} from "@/lib/management";
import type { SmReceipt } from "@/lib/sales-marketing";
import {
  normalizeBudgetConfig,
  seedBudgetConfig,
  type SmBudgetConfig,
} from "@/lib/sales-marketing";
import { ChevronRight } from "lucide-react";

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
  const {
    items: apItems,
    saveOne: saveAp,
  } = useSharedCollection<ApPayable>(COLLECTIONS.apPayables, seedApPayables);

  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selected =
    unified.find((r) => r.id === selectedId) ??
    [...deptItems.map(deptExpenseToUnified), ...smItems.map(smReceiptToUnified)].find(
      (r) => r.id === selectedId
    ) ??
    null;

  const alreadyQueued = useMemo(() => {
    if (!selected) return false;
    return apItems.some((p) => p.sourceExpenseId === selected.id);
  }, [apItems, selected]);

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

    if (status === "approved") {
      const exists = apItems.some((p) => p.sourceExpenseId === row.id);
      if (!exists) {
        await saveAp(unifiedExpenseToApPayable(row));
      }
      setMsg(
        "Approved — sent to Accounts Payable for payment processing."
      );
    } else {
      setMsg("Declined.");
    }
    setTimeout(() => setMsg(null), 3500);
  }

  const budget = normalizeBudgetConfig(budgetConfigs[0]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm opacity-65">
          Click a receipt or invoice for full details. Approving solidifies
          budget spend and forwards the item to Accounts Payable.
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
        S&amp;M coded budget net:{" "}
        <strong>
          {money(budget.categories.reduce((s, c) => s + c.budgeted, 0))}
        </strong>
        <span className="opacity-55">
          {" "}
          · Edit amounts under Management → Department budgets → Sales &amp; Marketing
        </span>
      </div>

      {(deptLoading || smLoading) && (
        <p className="text-sm opacity-60">Loading expenses…</p>
      )}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Vendor / code</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {unified.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center opacity-60">
                    No expenses in this filter.
                  </td>
                </tr>
              ) : (
                unified.map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer ${
                      selectedId === row.id ? "bg-[var(--harbor-mist)]/50" : ""
                    }`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td>{row.departmentLabel}</td>
                    <td>
                      <p className="font-medium">{row.vendor}</p>
                      <p className="font-mono text-[10px] opacity-55">
                        {row.code}
                      </p>
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
                      <ChevronRight className="h-4 w-4 opacity-40" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 shadow-sm">
          {!selected ? (
            <p className="text-sm opacity-60">
              Select an invoice or receipt to review details.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide opacity-55">
                  {selected.departmentLabel}
                </p>
                <h2 className="text-xl font-semibold">{selected.vendor}</h2>
                <p className="font-mono text-xs opacity-60">{selected.code}</p>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs opacity-55">Amount</dt>
                  <dd className="font-semibold">{money(selected.amount)}</dd>
                </div>
                <div>
                  <dt className="text-xs opacity-55">Submitted</dt>
                  <dd>
                    {new Date(selected.submittedAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs opacity-55">Status</dt>
                  <dd className="capitalize">{selected.status}</dd>
                </div>
                <div>
                  <dt className="text-xs opacity-55">Attachment</dt>
                  <dd>{selected.fileName || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs opacity-55">Description</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap">
                    {selected.description || "No description provided."}
                  </dd>
                </div>
                {selected.source === "department" ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs opacity-55">Source</dt>
                    <dd>
                      Department expense ·{" "}
                      {(selected.raw as DepartmentExpense).department}
                    </dd>
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <dt className="text-xs opacity-55">Source</dt>
                    <dd>Sales &amp; Marketing receipt coding</dd>
                  </div>
                )}
              </dl>

              {alreadyQueued ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  Already queued in Accounts Payable.
                </p>
              ) : null}

              {selected.status === "pending" ? (
                <div className="flex flex-wrap gap-2 border-t border-base-200 pt-3">
                  <button
                    type="button"
                    className="btn btn-neutral btn-sm"
                    onClick={() => void setStatus(selected, "approved")}
                  >
                    Approve &amp; send to AP
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void setStatus(selected, "declined")}
                  >
                    Decline
                  </button>
                </div>
              ) : selected.status === "approved" && !alreadyQueued ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={async () => {
                    await saveAp(unifiedExpenseToApPayable(selected));
                    setMsg("Forwarded to Accounts Payable.");
                  }}
                >
                  Send to Accounts Payable
                </button>
              ) : null}

              <a href="/ops/ap" className="link link-hover text-sm">
                Open Accounts Payable →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
