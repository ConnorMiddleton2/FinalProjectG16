"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  MGMT_BUDGET_DEPARTMENTS,
  money,
  normalizeDepartmentBudgetLines,
  seedDepartmentBudgets,
  type DepartmentBudget,
  type MgmtBudgetDepartment,
} from "@/lib/management";
import {
  normalizeBudgetConfig,
  seedBudgetConfig,
  SM_CATEGORY_TO_CODE,
  type SmBudgetConfig,
} from "@/lib/sales-marketing";

export function DepartmentBudgetsDashboard() {
  const {
    items,
    saveOne,
    saveAll,
    loading,
    error,
  } = useSharedCollection<DepartmentBudget>(
    COLLECTIONS.departmentBudgets,
    seedDepartmentBudgets
  );
  const { items: smConfigs, saveOne: saveSmBudget } =
    useSharedCollection<SmBudgetConfig>(
      COLLECTIONS.smBudgetConfig,
      seedBudgetConfig
    );

  const [dept, setDept] = useState<MgmtBudgetDepartment | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  const smConfig = normalizeBudgetConfig(smConfigs[0]);

  useEffect(() => {
    if (loading || seeded) return;
    const expected = seedDepartmentBudgets();
    const missing = expected.some(
      (row) => !items.find((i) => i.id === row.id)
    );
    if (!missing && items.length >= expected.length) {
      setSeeded(true);
      return;
    }
    void (async () => {
      const byId = new Map(items.map((i) => [i.id, i]));
      const merged = expected.map((row) => {
        const prior = byId.get(row.id);
        return prior
          ? { ...prior, label: row.label, department: row.department }
          : row;
      });
      await saveAll(merged);
      setSeeded(true);
    })();
  }, [loading, items, saveAll, seeded]);

  const lines = useMemo(() => {
    if (!dept) return [];
    return normalizeDepartmentBudgetLines(dept, items);
  }, [dept, items]);

  const deptTotals = useMemo(() => {
    const totals: Record<MgmtBudgetDepartment, number> = {
      maintenance: 0,
      sales_marketing: 0,
      executive: 0,
    };
    for (const d of MGMT_BUDGET_DEPARTMENTS) {
      totals[d.id] = normalizeDepartmentBudgetLines(d.id, items).reduce(
        (s, r) => s + r.budgeted,
        0
      );
    }
    return totals;
  }, [items]);

  function amountDraft(line: DepartmentBudget) {
    return drafts[line.id] ?? String(line.budgeted);
  }

  async function syncSmBudgetFromLines(allItems: DepartmentBudget[]) {
    const smLines = normalizeDepartmentBudgetLines("sales_marketing", allItems);
    const next: SmBudgetConfig = {
      ...smConfig,
      categories: smLines.map((line) => ({
        code: SM_CATEGORY_TO_CODE[line.categoryKey] ?? "SM001",
        label: line.label,
        budgeted: line.budgeted,
      })),
    };
    await saveSmBudget(next);
  }

  async function saveLine(line: DepartmentBudget) {
    const n = Number(String(amountDraft(line)).replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      setMsg("Enter a valid budget amount.");
      return;
    }
    const updated: DepartmentBudget = {
      ...line,
      budgeted: n,
      updatedAt: new Date().toISOString(),
    };
    await saveOne(updated);
    const nextItems = [
      updated,
      ...items.filter((i) => i.id !== updated.id),
    ];
    if (line.department === "sales_marketing") {
      await syncSmBudgetFromLines(nextItems);
    }
    setDrafts((d) => {
      const copy = { ...d };
      delete copy[line.id];
      return copy;
    });
    setMsg(`Saved ${line.label}.`);
    setTimeout(() => setMsg(null), 2500);
  }

  async function saveAllVisible() {
    if (!dept) return;
    const updated = lines.map((line) => {
      const n = Number(String(amountDraft(line)).replace(/[^0-9.-]/g, ""));
      return {
        ...line,
        budgeted: Number.isFinite(n) && n >= 0 ? n : line.budgeted,
        updatedAt: new Date().toISOString(),
      };
    });
    const others = items.filter((i) => i.department !== dept);
    await saveAll([...others, ...updated]);
    if (dept === "sales_marketing") {
      await syncSmBudgetFromLines([...others, ...updated]);
    }
    setDrafts({});
    setMsg(`Saved all ${MGMT_BUDGET_DEPARTMENTS.find((d) => d.id === dept)?.title} categories.`);
    setTimeout(() => setMsg(null), 2500);
  }

  if (!dept) {
    return (
      <div className="space-y-4">
        <p className="max-w-2xl text-sm opacity-65">
          Choose a department to set category budgets. Sales &amp; Marketing
          amounts also drive the S&amp;M budget dashboard.
        </p>
        {loading && <p className="text-sm opacity-60">Loading budgets…</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          {MGMT_BUDGET_DEPARTMENTS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDept(d.id)}
              className="rounded-2xl border border-[var(--harbor-deep)]/15 bg-white/95 px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{d.title}</p>
                  <p className="mt-1 text-sm opacity-65">{d.blurb}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 opacity-40" />
              </div>
              <p className="mt-4 text-sm">
                Total{" "}
                <strong className="text-[var(--harbor-ink)]">
                  {money(deptTotals[d.id])}
                </strong>
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const meta = MGMT_BUDGET_DEPARTMENTS.find((d) => d.id === dept)!;
  const total = lines.reduce((s, l) => s + (Number(amountDraft(l)) || l.budgeted), 0);

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
        onClick={() => {
          setDept(null);
          setDrafts({});
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        All departments
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{meta.title} budgets</h2>
          <p className="text-sm opacity-65">{meta.blurb}</p>
        </div>
        <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white px-4 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wide opacity-55">
            Department total
          </p>
          <p className="text-lg font-semibold">{money(total)}</p>
        </div>
      </div>

      {msg && <p className="text-sm text-emerald-800">{msg}</p>}

      <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Budgeted</th>
              <th>Notes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="font-medium">{line.label}</td>
                <td>
                  <input
                    className="input input-bordered input-sm bg-white w-36"
                    value={amountDraft(line)}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [line.id]: e.target.value }))
                    }
                  />
                </td>
                <td>
                  <input
                    className="input input-bordered input-sm bg-white w-full min-w-[12rem]"
                    value={line.notes}
                    placeholder="Optional"
                    onChange={(e) =>
                      void saveOne({
                        ...line,
                        notes: e.target.value,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-neutral btn-xs"
                    onClick={() => void saveLine(line)}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="btn btn-neutral btn-sm"
        onClick={() => void saveAllVisible()}
      >
        Save all {meta.title} categories
      </button>
    </div>
  );
}
