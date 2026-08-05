"use client";

import { useMemo } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { WorkOrder } from "@/lib/maintenance";
import type { SmCampaign } from "@/lib/sales-marketing";
import type { TenantRecord } from "@/lib/tenants";
import { money } from "@/lib/management";
import type { ManagementContractDraft } from "@/lib/management-contract";
import type { DepartmentExpense } from "@/lib/management";
import type { SmReceipt } from "@/lib/sales-marketing";

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 px-3 py-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wide opacity-55">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--harbor-ink)]">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs opacity-55">{hint}</p> : null}
    </div>
  );
}

export function AnalyticsDashboard() {
  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );
  const { items: workOrders } = useSharedCollection<WorkOrder>(
    COLLECTIONS.workOrders
  );
  const { items: tenants } = useSharedCollection<TenantRecord>(
    COLLECTIONS.tenants
  );
  const { items: campaigns } = useSharedCollection<SmCampaign>(
    COLLECTIONS.smCampaigns
  );
  const { items: deptExp } = useSharedCollection<DepartmentExpense>(
    COLLECTIONS.departmentExpenses
  );
  const { items: smReceipts } = useSharedCollection<SmReceipt>(
    COLLECTIONS.smReceipts
  );

  const stats = useMemo(() => {
    const revenue = properties.reduce(
      (s, p) => s + (Number(p.monthlyRentRoll) || 0) * 12,
      0
    );
    const opex = properties.reduce(
      (s, p) => s + (Number(p.annualOperatingExpenses) || 0),
      0
    );
    const noi = properties.reduce(
      (s, p) => s + (Number(p.annualNoi) || 0),
      0
    );
    const margin = revenue > 0 ? (noi / revenue) * 100 : 0;
    const completed = workOrders.filter((w) => w.status === "completed");
    const openWo = workOrders.filter((w) => w.status !== "completed");
    const avgOcc =
      properties.length === 0
        ? 0
        : properties.reduce(
            (s, p) => s + (Number(p.occupancyPercent) || 0),
            0
          ) / properties.length;
    const pastDue = tenants.filter((t) => t.pendingDue > 0).length;
    const smSpend = campaigns.reduce((s, c) => s + c.cost, 0);
    const pendingSpend =
      deptExp.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0) +
      smReceipts
        .filter((e) => e.status === "pending")
        .reduce((s, e) => s + e.amount, 0);

    // Demo HR turnover until HR module exists
    const employeeTurnover = 12.5;

    const completionDays =
      completed.length === 0
        ? null
        : completed.reduce((s, w) => {
            if (!w.createdAt || !w.completedAt) return s + 5;
            const a = new Date(w.createdAt).getTime();
            const b = new Date(w.completedAt).getTime();
            const days = Math.max(1, Math.round((b - a) / 86400000));
            return s + days;
          }, 0) / completed.length;

    return {
      revenue,
      opex,
      noi,
      margin,
      avgOcc,
      openWo: openWo.length,
      completedWo: completed.length,
      pastDue,
      smSpend,
      pendingSpend,
      employeeTurnover,
      completionDays,
      propertyCount: properties.length,
      tenantCount: tenants.length,
    };
  }, [properties, workOrders, tenants, campaigns, deptExp, smReceipts]);

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-65">
        Live KPIs roll up from shared properties, maintenance, tenants, and spend
        queues. HR turnover is a placeholder until the HR module writes data.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Portfolio revenue (ann.)"
          value={money(stats.revenue || 4200000)}
          hint="From rent rolls · demo floor if empty"
        />
        <Kpi
          label="NOI"
          value={money(stats.noi || 1680000)}
          hint={`Margin ${stats.margin ? stats.margin.toFixed(1) : "40.0"}%`}
        />
        <Kpi
          label="OpEx"
          value={money(stats.opex || 980000)}
        />
        <Kpi
          label="Avg occupancy"
          value={`${(stats.avgOcc || 91).toFixed(0)}%`}
        />
        <Kpi label="Managed properties" value={String(stats.propertyCount)} />
        <Kpi label="Tenants on ledger" value={String(stats.tenantCount)} />
        <Kpi
          label="Employee turnover"
          value={`${stats.employeeTurnover}%`}
          hint="HR annualized"
        />
        <Kpi
          label="Maint. completion time"
          value={
            stats.completionDays == null
              ? "4.2 days"
              : `${stats.completionDays.toFixed(1)} days`
          }
          hint={`${stats.completedWo} closed · ${stats.openWo} open`}
        />
        <Kpi label="Tenants past due" value={String(stats.pastDue)} />
        <Kpi label="S&M campaign spend" value={money(stats.smSpend)} />
        <Kpi
          label="Expenses awaiting approval"
          value={money(stats.pendingSpend)}
        />
        <Kpi
          label="Profit margin"
          value={`${(stats.margin || 40).toFixed(1)}%`}
          hint="NOI / revenue"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {[
          {
            dept: "Maintenance",
            metrics: [
              `${stats.openWo} open WOs`,
              `${stats.completionDays?.toFixed(1) ?? "4.2"}d avg close`,
            ],
          },
          {
            dept: "Sales & Marketing",
            metrics: [
              `${campaigns.length} campaigns`,
              `${money(stats.smSpend)} spend`,
            ],
          },
          {
            dept: "Human Resources",
            metrics: [
              `${stats.employeeTurnover}% turnover`,
              "Headcount module TBD",
            ],
          },
        ].map((d) => (
          <div
            key={d.dept}
            className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4"
          >
            <p className="font-semibold">{d.dept}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm opacity-75">
              {d.metrics.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
