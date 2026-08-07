"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import { COMPANY_BUDGET_VIEW } from "@/components/mgmt/mg-nav";
import { BudgetFillBar } from "@/components/mgmt/BudgetFillBar";
import { RevenueBudgetBars } from "@/components/mgmt/RevenueBudgetBars";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  companyRevenueFromAr,
  propertyRevenueFromAr,
} from "@/lib/ar-revenue";
import type { Receivable } from "@/lib/accounts-receivable";
import {
  seedMiscReceivables,
  seedRentalReceivables,
} from "@/lib/accounts-receivable";
import {
  seedPayableInvoices,
  type PayableInvoice,
} from "@/lib/accounts-payable";
import {
  activeDepartmentsFromPack,
  budgetPackId,
  budgetTotalForYear,
  buildYearCompareRows,
  createPropertyYearBudgetLines,
  defaultPropertyBudgetPack,
  ensureMonths,
  MGMT_BUDGET_DEPARTMENTS,
  MONTH_LABELS,
  money,
  monthsFromAnnual,
  normalizeDepartmentBudgetLines,
  seedDepartmentBudgets,
  seedDepartmentExpenses,
  seedPropertyBudgetPacks,
  spendForBudgetCategory,
  yearlyFromMonths,
  type ActiveBudgetDepartment,
  type BudgetPeriodView,
  type CustomBudgetDepartment,
  type DepartmentBudget,
  type DepartmentExpense,
  type MgmtBudgetDepartment,
  type MonthlyAmounts,
  type PropertyBudgetPack,
} from "@/lib/management";
import {
  normalizeBudgetConfig,
  seedBudgetConfig,
  SM_CATEGORY_TO_CODE,
  type SmBudgetConfig,
  type SmReceipt,
} from "@/lib/sales-marketing";
import {
  seedDocuments,
  type MaintenanceDocument,
} from "@/lib/maintenance";
import {
  seedTenantInvoices,
  type TenantInvoice,
} from "@/lib/portal-records";

function periodLabel(view: BudgetPeriodView) {
  if (view === "year") return "Full year";
  return MONTH_LABELS[view];
}

function slugKey(label: string) {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || `cat_${Date.now()}`
  );
}

function DepartmentBudgetsDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProperty = searchParams.get("property");

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
  const {
    items: packs,
    saveOne: savePack,
  } = useSharedCollection<PropertyBudgetPack>(
    COLLECTIONS.propertyBudgetPacks,
    seedPropertyBudgetPacks
  );
  const { items: properties, loading: propsLoading } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const { items: invoices } = useSharedCollection<TenantInvoice>(
    COLLECTIONS.tenantInvoices,
    seedTenantInvoices
  );
  const { items: rentalReceivables } = useSharedCollection<Receivable>(
    COLLECTIONS.rentalReceivables,
    seedRentalReceivables
  );
  const { items: miscReceivables } = useSharedCollection<Receivable>(
    COLLECTIONS.miscellaneousReceivables,
    seedMiscReceivables
  );
  const allReceivables = useMemo(
    () => [...rentalReceivables, ...miscReceivables],
    [rentalReceivables, miscReceivables]
  );
  const { items: smConfigs, saveOne: saveSmBudget } =
    useSharedCollection<SmBudgetConfig>(
      COLLECTIONS.smBudgetConfig,
      seedBudgetConfig
    );
  const { items: smReceipts } = useSharedCollection<SmReceipt>(
    COLLECTIONS.smReceipts
  );
  const { items: deptExpenses } = useSharedCollection<DepartmentExpense>(
    COLLECTIONS.departmentExpenses,
    seedDepartmentExpenses
  );
  const { items: maintDocs } = useSharedCollection<MaintenanceDocument>(
    COLLECTIONS.maintenanceDocuments,
    seedDocuments
  );
  const { items: payableInvoices } = useSharedCollection<PayableInvoice>(
    COLLECTIONS.payableInvoices,
    seedPayableInvoices
  );

  const thisYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(thisYear + 1);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [companyView, setCompanyView] = useState(false);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [period, setPeriod] = useState<BudgetPeriodView>("year");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [editBudgets, setEditBudgets] = useState(false);
  const [managePack, setManagePack] = useState(false);

  // Custom dept draft form
  const [customTitle, setCustomTitle] = useState("");
  const [customCats, setCustomCats] = useState("General, 10000");

  const smConfig = normalizeBudgetConfig(smConfigs[0]);

  const propertyOptions = useMemo(
    () =>
      [...properties]
        .map((p) => ({
          id: p.id,
          name: p.propertyName || "Untitled property",
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [properties]
  );

  useEffect(() => {
    if (urlProperty === COMPANY_BUDGET_VIEW) {
      setCompanyView(true);
      setPropertyId(null);
      setDeptId(null);
      return;
    }
    setCompanyView(false);
    if (urlProperty && propertyOptions.some((p) => p.id === urlProperty)) {
      setPropertyId(urlProperty);
      return;
    }
    if (!urlProperty) {
      setPropertyId(null);
      setDeptId(null);
    }
  }, [urlProperty, propertyOptions]);

  function pushPropertyParam(next: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!next) params.delete("property");
    else params.set("property", next);
    const qs = params.toString();
    router.push(qs ? `/ops/management/budgets?${qs}` : "/ops/management/budgets");
  }

  const selectedProperty = propertyOptions.find((p) => p.id === propertyId);

  const pack = useMemo(() => {
    if (!propertyId || !selectedProperty) return null;
    return (
      packs.find(
        (p) => p.propertyId === propertyId && p.fiscalYear === fiscalYear
      ) ?? null
    );
  }, [packs, propertyId, selectedProperty, fiscalYear]);

  const activeDepts = useMemo(
    () => activeDepartmentsFromPack(pack),
    [pack]
  );

  const yearsWithBudgets = useMemo(() => {
    const years = new Set<number>();
    for (const row of items) {
      if (propertyId && row.propertyId === propertyId) years.add(row.fiscalYear);
      else if (!propertyId) years.add(row.fiscalYear);
    }
    years.add(thisYear);
    years.add(thisYear + 1);
    years.add(thisYear - 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [items, propertyId, thisYear]);

  const hasYearBudget = useMemo(() => {
    if (!propertyId) return false;
    return items.some(
      (r) => r.propertyId === propertyId && r.fiscalYear === fiscalYear
    );
  }, [items, propertyId, fiscalYear]);

  useEffect(() => {
    if (!hasYearBudget) return;
    if (!deptId && activeDepts.length > 0) {
      setDeptId(activeDepts[0].id);
      return;
    }
    if (deptId && activeDepts.length > 0 && !activeDepts.some((d) => d.id === deptId)) {
      setDeptId(activeDepts[0]?.id ?? null);
    }
  }, [activeDepts, deptId, hasYearBudget]);

  const activeDept: ActiveBudgetDepartment | null =
    activeDepts.find((d) => d.id === deptId) ?? null;

  const lines = useMemo(() => {
    if (!activeDept || !propertyId || !selectedProperty || !hasYearBudget) {
      return [];
    }
    return normalizeDepartmentBudgetLines(
      activeDept.id,
      activeDept.categories,
      items,
      {
        propertyId,
        propertyName: selectedProperty.name,
        fiscalYear,
      }
    );
  }, [
    activeDept,
    propertyId,
    selectedProperty,
    hasYearBudget,
    items,
    fiscalYear,
  ]);

  const deptTotals = useMemo(() => {
    const map: Record<string, number> = {};
    if (!propertyId || !selectedProperty || !hasYearBudget) return map;
    for (const d of activeDepts) {
      const rows = normalizeDepartmentBudgetLines(d.id, d.categories, items, {
        propertyId,
        propertyName: selectedProperty.name,
        fiscalYear,
      });
      map[d.id] = rows.reduce(
        (s, r) => s + yearlyFromMonths(ensureMonths(r)),
        0
      );
    }
    return map;
  }, [
    propertyId,
    selectedProperty,
    hasYearBudget,
    activeDepts,
    items,
    fiscalYear,
  ]);

  const propertyCompareRows = useMemo(() => {
    if (!propertyId || !selectedProperty) return [];
    return buildYearCompareRows({
      thisYear,
      revenueFor: (year) =>
        propertyRevenueFromAr({
          receivables: allReceivables,
          invoices,
          propertyId,
          propertyName: selectedProperty.name,
          fiscalYear: year,
        }),
      budgetFor: (year) => budgetTotalForYear(items, year, propertyId),
    });
  }, [
    propertyId,
    selectedProperty,
    thisYear,
    allReceivables,
    invoices,
    items,
  ]);

  const companyCompareRows = useMemo(
    () =>
      buildYearCompareRows({
        thisYear,
        revenueFor: (year) =>
          companyRevenueFromAr({
            receivables: allReceivables,
            invoices,
            properties: propertyOptions,
            fiscalYear: year,
          }),
        budgetFor: (year) => budgetTotalForYear(items, year, null),
      }),
    [thisYear, allReceivables, invoices, propertyOptions, items]
  );

  const companyByProperty = useMemo(() => {
    return propertyOptions.map((p) => {
      const budget = budgetTotalForYear(items, fiscalYear, p.id);
      const revenue = propertyRevenueFromAr({
        receivables: allReceivables,
        invoices,
        propertyId: p.id,
        propertyName: p.name,
        fiscalYear,
      });
      return { ...p, budget, revenue, net: revenue - budget };
    });
  }, [propertyOptions, items, allReceivables, invoices, fiscalYear]);

  const arRevenueThisFocus =
    propertyId && selectedProperty
      ? propertyRevenueFromAr({
          receivables: allReceivables,
          invoices,
          propertyId,
          propertyName: selectedProperty.name,
          fiscalYear: fiscalYear - 1,
        })
      : 0;

  function amountForLine(line: DepartmentBudget) {
    const months = ensureMonths(line);
    if (period === "year") return yearlyFromMonths(months);
    return months[period] ?? 0;
  }

  function draftKey(lineId: string) {
    return `${lineId}:${period}`;
  }

  function amountDraft(line: DepartmentBudget) {
    return drafts[draftKey(line.id)] ?? String(amountForLine(line));
  }

  async function ensurePack(
    propId: string,
    propName: string,
    year: number,
    next?: Partial<PropertyBudgetPack>
  ) {
    const existing = packs.find(
      (p) => p.propertyId === propId && p.fiscalYear === year
    );
    const base =
      existing ??
      defaultPropertyBudgetPack({
        propertyId: propId,
        propertyName: propName,
        fiscalYear: year,
      });
    const saved: PropertyBudgetPack = {
      ...base,
      ...next,
      id: budgetPackId(propId, year),
      propertyId: propId,
      propertyName: propName,
      fiscalYear: year,
      updatedAt: new Date().toISOString(),
      createdAt: base.createdAt,
    };
    await savePack(saved);
    return saved;
  }

  async function createBudgetForYear(opts?: { copyPrior?: boolean }) {
    if (!propertyId || !selectedProperty) {
      setMsg("Select a property first.");
      return;
    }
    const packRow = await ensurePack(
      propertyId,
      selectedProperty.name,
      fiscalYear
    );
    const copyFrom = opts?.copyPrior
      ? items.filter(
          (r) =>
            r.propertyId === propertyId && r.fiscalYear === fiscalYear - 1
        )
      : undefined;
    const created = createPropertyYearBudgetLines({
      propertyId,
      propertyName: selectedProperty.name,
      fiscalYear,
      pack: packRow,
      copyFrom,
    });
    const others = items.filter(
      (r) =>
        !(r.propertyId === propertyId && r.fiscalYear === fiscalYear)
    );
    await saveAll([...others, ...created]);
    setMsg(
      opts?.copyPrior
        ? `Created ${fiscalYear} budget from ${fiscalYear - 1}.`
        : `Created ${fiscalYear} budget.`
    );
    setDeptId(activeDepartmentsFromPack(packRow)[0]?.id ?? null);
    setTimeout(() => setMsg(null), 3500);
  }

  async function syncSmBudgetFromLines(allItems: DepartmentBudget[]) {
    if (!propertyId || !selectedProperty) return;
    const smDept = activeDepts.find((d) => d.id === "sales_marketing");
    if (!smDept) return;
    const smLines = normalizeDepartmentBudgetLines(
      "sales_marketing",
      smDept.categories,
      allItems,
      {
        propertyId,
        propertyName: selectedProperty.name,
        fiscalYear,
      }
    );
    const next: SmBudgetConfig = {
      ...smConfig,
      label: `${fiscalYear} Sales & Marketing`,
      categories: smLines.map((line) => ({
        code: SM_CATEGORY_TO_CODE[line.categoryKey] ?? "SM001",
        label: line.label,
        budgeted: yearlyFromMonths(ensureMonths(line)),
      })),
    };
    await saveSmBudget(next);
  }

  async function saveLine(line: DepartmentBudget) {
    const raw = Number(String(amountDraft(line)).replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(raw) || raw < 0) {
      setMsg("Enter a valid amount.");
      return;
    }
    const months = [...ensureMonths(line)] as MonthlyAmounts;
    if (period === "year") {
      const nextMonths = monthsFromAnnual(raw);
      for (let i = 0; i < 12; i++) months[i] = nextMonths[i];
    } else {
      months[period] = Math.round(raw);
    }
    const updated: DepartmentBudget = {
      ...line,
      months,
      updatedAt: new Date().toISOString(),
    };
    await saveOne(updated);
    const nextItems = [updated, ...items.filter((i) => i.id !== updated.id)];
    if (line.department === "sales_marketing") {
      await syncSmBudgetFromLines(nextItems);
    }
    setDrafts((d) => {
      const copy = { ...d };
      delete copy[draftKey(line.id)];
      return copy;
    });
    setMsg(`Saved ${line.label} (${periodLabel(period)}).`);
    setTimeout(() => setMsg(null), 2500);
  }

  async function saveAllVisible() {
    if (!activeDept || !propertyId || !selectedProperty) return;
    const updated = lines.map((line) => {
      const raw = Number(String(amountDraft(line)).replace(/[^0-9.-]/g, ""));
      const months = [...ensureMonths(line)] as MonthlyAmounts;
      if (Number.isFinite(raw) && raw >= 0) {
        if (period === "year") {
          const nextMonths = monthsFromAnnual(raw);
          for (let i = 0; i < 12; i++) months[i] = nextMonths[i];
        } else {
          months[period] = Math.round(raw);
        }
      }
      return {
        ...line,
        months,
        updatedAt: new Date().toISOString(),
      };
    });
    const others = items.filter(
      (i) =>
        !(
          i.propertyId === propertyId &&
          i.fiscalYear === fiscalYear &&
          i.department === activeDept.id
        )
    );
    await saveAll([...others, ...updated]);
    if (activeDept.id === "sales_marketing") {
      await syncSmBudgetFromLines([...others, ...updated]);
    }
    setDrafts({});
    setMsg(`Saved all ${activeDept.title} lines.`);
    setTimeout(() => setMsg(null), 2500);
  }

  async function toggleBuiltIn(id: MgmtBudgetDepartment, on: boolean) {
    if (!propertyId || !selectedProperty) return;
    const current =
      pack ??
      defaultPropertyBudgetPack({
        propertyId,
        propertyName: selectedProperty.name,
        fiscalYear,
      });
    const enabled = new Set(current.enabledBuiltIns);
    if (on) enabled.add(id);
    else enabled.delete(id);
    const next = await ensurePack(propertyId, selectedProperty.name, fiscalYear, {
      enabledBuiltIns: Array.from(enabled) as MgmtBudgetDepartment[],
      customDepartments: current.customDepartments,
      createdAt: current.createdAt,
    });
    if (hasYearBudget && on) {
      const missing = createPropertyYearBudgetLines({
        propertyId,
        propertyName: selectedProperty.name,
        fiscalYear,
        pack: {
          ...next,
          enabledBuiltIns: [id],
          customDepartments: [],
        },
      }).filter(
        (row) =>
          !items.some(
            (i) =>
              i.id === row.id ||
              (i.propertyId === row.propertyId &&
                i.fiscalYear === row.fiscalYear &&
                i.department === row.department &&
                i.categoryKey === row.categoryKey)
          )
      );
      if (missing.length) await saveAll([...items, ...missing]);
    }
    setMsg(on ? `Enabled ${id}` : `Removed ${id} from this property year`);
    setTimeout(() => setMsg(null), 2500);
  }

  async function addCustomDepartment() {
    if (!propertyId || !selectedProperty || !customTitle.trim()) return;
    const categories = customCats
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [labelPart, amtPart] = line.split(",").map((s) => s.trim());
        const label = labelPart || "Category";
        const defaultBudgeted = Math.max(
          0,
          Math.round(Number(String(amtPart || "0").replace(/[^0-9.-]/g, "")) || 0)
        );
        return {
          key: slugKey(label),
          label,
          defaultBudgeted: defaultBudgeted || 5000,
        };
      });
    if (categories.length === 0) {
      setMsg("Add at least one category (e.g. General, 10000).");
      return;
    }
    const current =
      pack ??
      defaultPropertyBudgetPack({
        propertyId,
        propertyName: selectedProperty.name,
        fiscalYear,
      });
    const custom: CustomBudgetDepartment = {
      id: `custom-${crypto.randomUUID().slice(0, 8)}`,
      title: customTitle.trim(),
      blurb: "Custom department budget",
      categories,
    };
    const next = await ensurePack(propertyId, selectedProperty.name, fiscalYear, {
      enabledBuiltIns: current.enabledBuiltIns,
      customDepartments: [...current.customDepartments, custom],
      createdAt: current.createdAt,
    });
    if (hasYearBudget) {
      const rows = createPropertyYearBudgetLines({
        propertyId,
        propertyName: selectedProperty.name,
        fiscalYear,
        pack: {
          ...next,
          enabledBuiltIns: [],
          customDepartments: [custom],
        },
      });
      await saveAll([...items, ...rows]);
    }
    setCustomTitle("");
    setCustomCats("General, 10000");
    setDeptId(custom.id);
    setMsg(`Added ${custom.title}`);
    setTimeout(() => setMsg(null), 2500);
  }

  async function removeCustomDepartment(id: string) {
    if (!propertyId || !selectedProperty || !pack) return;
    await ensurePack(propertyId, selectedProperty.name, fiscalYear, {
      enabledBuiltIns: pack.enabledBuiltIns,
      customDepartments: pack.customDepartments.filter((c) => c.id !== id),
      createdAt: pack.createdAt,
    });
    if (deptId === id) setDeptId(null);
    setMsg("Custom department removed from this year.");
    setTimeout(() => setMsg(null), 2500);
  }

  const monthFilter = period === "year" ? undefined : period;

  const lineSpend = useMemo(() => {
    const map = new Map<string, { approved: number; pending: number }>();
    for (const line of lines) {
      map.set(
        line.id,
        spendForBudgetCategory({
          department: line.department,
          categoryKey: line.categoryKey,
          fiscalYear,
          month: monthFilter,
          propertyName: selectedProperty?.name,
          smReceipts,
          deptExpenses,
          maintDocs,
          payableInvoices,
        })
      );
    }
    return map;
  }, [
    lines,
    fiscalYear,
    monthFilter,
    selectedProperty?.name,
    smReceipts,
    deptExpenses,
    maintDocs,
    payableInvoices,
  ]);

  const periodTotal = lines.reduce((s, l) => {
    const v = Number(amountDraft(l));
    return s + (Number.isFinite(v) ? v : amountForLine(l));
  }, 0);

  const overallApproved = lines.reduce(
    (s, l) => s + (lineSpend.get(l.id)?.approved ?? 0),
    0
  );
  const overallPending = lines.reduce(
    (s, l) => s + (lineSpend.get(l.id)?.pending ?? 0),
    0
  );

  const companyTotals = companyCompareRows.find((r) => r.year === fiscalYear);

  // —— Company net ——
  if (companyView) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Company net budget</h2>
            <p className="text-sm opacity-65">
              Revenue from AR (Paid invoices only) · budgets across all
              properties.
            </p>
          </div>
          <label className="form-control">
            <span className="label-text mb-1 text-xs">Focus year</span>
            <select
              className="select select-bordered select-sm bg-white"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
            >
              {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        <RevenueBudgetBars
          title="Company — AR revenue vs budget"
          rows={companyCompareRows}
        />

        {companyTotals ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label={`${fiscalYear} AR revenue (Paid)`}
              value={
                companyTotals.revenue > 0
                  ? money(companyTotals.revenue)
                  : "No AR data"
              }
              tone="green"
            />
            <StatTile
              label={`${fiscalYear} budget`}
              value={money(companyTotals.budget)}
              tone="red"
            />
            <StatTile
              label={`${fiscalYear} net`}
              value={money(companyTotals.net)}
              tone={companyTotals.net >= 0 ? "green" : "red"}
            />
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Property</th>
                <th>AR revenue</th>
                <th>Budget</th>
                <th>Net</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {companyByProperty.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-emerald-800">
                    {p.revenue > 0 ? money(p.revenue) : "—"}
                  </td>
                  <td className="text-red-800">{money(p.budget)}</td>
                  <td
                    className={
                      p.net >= 0 ? "text-emerald-800" : "text-red-800"
                    }
                  >
                    {money(p.net)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => pushPropertyParam(p.id)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // —— All properties ——
  if (!propertyId) {
    return (
      <div className="space-y-4">
        <p className="max-w-2xl text-sm opacity-65">
          Revenue is calculated from Accounts Receivable (Paid invoices only).
          Pick a property to set which department budgets apply and edit
          categories.
        </p>

        <RevenueBudgetBars
          title="Company — AR revenue vs budget"
          rows={companyCompareRows}
        />

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => pushPropertyParam(COMPANY_BUDGET_VIEW)}
        >
          Open company net budget
        </button>

        {(loading || propsLoading) && (
          <p className="text-sm opacity-60">Loading…</p>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}

        {propertyOptions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 px-4 py-6 text-sm opacity-65">
            No managed properties yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {propertyOptions.map((p) => {
              const priorRev = propertyRevenueFromAr({
                receivables: allReceivables,
                invoices,
                propertyId: p.id,
                propertyName: p.name,
                fiscalYear: thisYear - 1,
              });
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pushPropertyParam(p.id)}
                  className="rounded-2xl border border-[var(--harbor-deep)]/15 bg-white/95 px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]/40"
                >
                  <p className="font-semibold">{p.name}</p>
                  <p className="mt-1 text-xs opacity-60">
                    {thisYear - 1} AR (Paid):{" "}
                    {priorRev > 0 ? money(priorRev) : "No AR data"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // —— Property workspace (tabs) ——
  return (
    <div className="space-y-4">
      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
        onClick={() => pushPropertyParam(null)}
      >
        <ArrowLeft className="h-4 w-4" />
        All properties
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{selectedProperty?.name}</h2>
          <p className="text-sm opacity-65">
            AR revenue (Paid) · toggle departments · edit live budget bars
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="form-control">
            <span className="label-text mb-1 text-xs">Fiscal year</span>
            <select
              className="select select-bordered select-sm bg-white"
              value={fiscalYear}
              onChange={(e) => {
                setFiscalYear(Number(e.target.value));
                setDeptId(null);
                setManagePack(false);
              }}
            >
              {yearsWithBudgets.map((y) => (
                <option key={y} value={y}>
                  {y}
                  {y === thisYear - 1
                    ? " (prior)"
                    : y === thisYear
                      ? " (current)"
                      : y === thisYear + 1
                        ? " (next)"
                        : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <RevenueBudgetBars
        title={`${selectedProperty?.name} — AR revenue vs budget`}
        rows={propertyCompareRows}
      />

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 px-4 py-3 text-sm">
        <span className="opacity-65">Prior-year AR (Paid) for planning · </span>
        {arRevenueThisFocus > 0 ? (
          <strong className="text-emerald-800">
            {money(arRevenueThisFocus)}
          </strong>
        ) : (
          <span className="opacity-55">No AR data for {fiscalYear - 1}</span>
        )}
        <span className="opacity-45">
          {" "}
          · sourced from Accounts Receivable, not editable here
        </span>
      </div>

      {msg && <p className="text-sm text-emerald-800">{msg}</p>}

      {!hasYearBudget ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/80 p-5">
          <p className="text-sm opacity-70">
            No {fiscalYear} budget for this property yet.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-neutral btn-sm gap-1"
              onClick={() => void createBudgetForYear()}
            >
              <Plus className="h-4 w-4" />
              Create {fiscalYear} budget
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void createBudgetForYear({ copyPrior: true })}
            >
              Create from {fiscalYear - 1}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Department tabs + add/remove */}
          <div className="flex flex-wrap items-center gap-1 border-b border-[var(--harbor-deep)]/15 pb-2">
            {activeDepts.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  deptId === d.id
                    ? "bg-[var(--harbor-deep)] text-[var(--harbor-sand)]"
                    : "bg-white/80 text-[var(--harbor-ink)]/75 hover:bg-white"
                }`}
                onClick={() => {
                  setDeptId(d.id);
                  setEditBudgets(false);
                  setDrafts({});
                  setPeriod("year");
                  setManagePack(false);
                }}
              >
                {d.title}
                <span className="ml-1.5 text-[10px] opacity-70">
                  {money(deptTotals[d.id] ?? 0)}
                </span>
              </button>
            ))}
            <button
              type="button"
              className={`rounded-lg border border-dashed px-3 py-1.5 text-sm font-medium transition ${
                managePack
                  ? "border-[var(--harbor-deep)] bg-[var(--harbor-deep)]/10 text-[var(--harbor-ink)]"
                  : "border-[var(--harbor-deep)]/35 bg-white/70 text-[var(--harbor-ink)]/70 hover:border-[var(--harbor-deep)]/55 hover:bg-white"
              }`}
              onClick={() => setManagePack((v) => !v)}
            >
              {managePack ? "Close" : "Add or remove budget"}
            </button>
          </div>

          {managePack ? (
            <div className="space-y-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 shadow-sm">
              <p className="text-sm font-medium">
                Add or remove a budget for {fiscalYear}
              </p>
              <p className="text-xs opacity-60">
                Turn built-in departments on or off, remove a custom one, or add
                a new department with its own categories.
              </p>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide opacity-55">
                  Built-in departments
                </p>
                <div className="flex flex-wrap gap-2">
                  {MGMT_BUDGET_DEPARTMENTS.map((d) => {
                    const on = pack?.enabledBuiltIns.includes(d.id) ?? true;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        className={`btn btn-sm ${on ? "btn-neutral" : "btn-outline"}`}
                        onClick={() => void toggleBuiltIn(d.id, !on)}
                      >
                        {on ? "Remove " : "Add "}
                        {d.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(pack?.customDepartments.length ?? 0) > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide opacity-55">
                    Custom departments
                  </p>
                  <ul className="space-y-1 text-sm">
                    {pack!.customDepartments.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[var(--harbor-deep)]/[0.04] px-3 py-2"
                      >
                        <span>
                          {c.title}{" "}
                          <span className="opacity-55">
                            ({c.categories.length} categories)
                          </span>
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs gap-1 text-red-700"
                          onClick={() => void removeCustomDepartment(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-2 border-t border-base-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
                  Add a custom department
                </p>
                <input
                  className="input input-bordered input-sm w-full bg-white"
                  placeholder="Department name (e.g. Landscaping)"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
                <textarea
                  className="textarea textarea-bordered textarea-sm w-full bg-white"
                  rows={2}
                  placeholder={
                    "Categories — one per line:\nGeneral, 10000\nTravel, 5000"
                  }
                  value={customCats}
                  onChange={(e) => setCustomCats(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-neutral btn-sm"
                  onClick={() => void addCustomDepartment()}
                >
                  Add department
                </button>
              </div>
            </div>
          ) : null}

          {activeDept && !managePack ? (
            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-3 shadow-sm space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold leading-tight">
                    {activeDept.title} · {fiscalYear}
                  </h3>
                  <p className="text-[11px] opacity-60">{activeDept.blurb}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg border border-[#8aa3b5]/45 bg-[#d5dee5] px-3 py-1 text-right">
                    <p className="text-[9px] uppercase tracking-wide opacity-55">
                      {periodLabel(period)} budget
                    </p>
                    <p className="text-lg font-semibold leading-tight text-[#2f4556]">
                      {money(periodTotal)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-xs ${editBudgets ? "btn-neutral" : "btn-outline"}`}
                    onClick={() => setEditBudgets((v) => !v)}
                  >
                    {editBudgets ? "Done editing" : "Adjust budgets"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className={`btn btn-xs ${period === "year" ? "btn-neutral" : "btn-outline"}`}
                  onClick={() => {
                    setPeriod("year");
                    setDrafts({});
                  }}
                >
                  Year
                </button>
                {MONTH_LABELS.map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    className={`btn btn-xs ${period === idx ? "btn-neutral" : "btn-outline"}`}
                    onClick={() => {
                      setPeriod(idx as BudgetPeriodView);
                      setDrafts({});
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-[11px] font-medium">
                  <span>Overall</span>
                  <span>
                    {money(overallApproved)} spent
                    {overallPending > 0
                      ? ` · ${money(overallPending)} pending`
                      : ""}
                    {" · "}
                    {overallApproved > periodTotal
                      ? `${money(overallApproved - periodTotal)} over`
                      : `${money(Math.max(0, periodTotal - overallApproved))} left`}
                  </span>
                </div>
                <BudgetFillBar
                  budgeted={periodTotal}
                  approved={overallApproved}
                  pending={overallPending}
                />
              </div>

              <div className="space-y-1">
                {lines.map((line) => {
                  const spend = lineSpend.get(line.id) ?? {
                    approved: 0,
                    pending: 0,
                  };
                  const budgeted = amountForLine(line);
                  return (
                    <div key={line.id} className="space-y-1">
                      <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2 sm:grid-cols-[9rem_1fr]">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold leading-none text-[#2f4556]">
                            {line.label}
                          </p>
                          <p className="truncate text-[9px] leading-tight opacity-55">
                            {spend.approved > budgeted && budgeted > 0
                              ? `Over by ${money(spend.approved - budgeted)}`
                              : period === "year"
                                ? "Full year"
                                : MONTH_LABELS[period]}
                          </p>
                        </div>
                        <BudgetFillBar
                          budgeted={budgeted}
                          approved={spend.approved}
                          pending={spend.pending}
                          compact
                        />
                      </div>
                      {editBudgets ? (
                        <div className="ml-[7.5rem] flex flex-wrap items-center gap-2 sm:ml-[9rem]">
                          <input
                            className="input input-bordered input-xs w-28 bg-white"
                            value={amountDraft(line)}
                            onChange={(e) =>
                              setDrafts((d) => ({
                                ...d,
                                [draftKey(line.id)]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-neutral btn-xs"
                            onClick={() => void saveLine(line)}
                          >
                            Save
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {editBudgets ? (
                <button
                  type="button"
                  className="btn btn-neutral btn-sm"
                  onClick={() => void saveAllVisible()}
                >
                  Save all {activeDept.title}
                </button>
              ) : (
                <p className="text-[10px] opacity-50">
                  Solid = approved · translucent = pending · red = over budget.
                  Switch tabs above to jump departments without leaving this
                  property.
                </p>
              )}
            </div>
          ) : !managePack ? (
            <p className="text-sm opacity-60">
              No departments enabled. Use Add or remove budget to add some.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red";
}) {
  return (
    <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 px-4 py-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wide opacity-55">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === "green" ? "text-emerald-800" : "text-red-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function DepartmentBudgetsDashboard() {
  return (
    <Suspense fallback={<p className="text-sm opacity-60">Loading budgets…</p>}>
      <DepartmentBudgetsDashboardInner />
    </Suspense>
  );
}
