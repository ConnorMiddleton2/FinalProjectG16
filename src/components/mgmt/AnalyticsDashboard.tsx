"use client";

import { useMemo } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { WorkOrder } from "@/lib/maintenance";
import type { SmCampaign } from "@/lib/sales-marketing";
import { softPropertyNamesMatch, type TenantRecord } from "@/lib/tenants";
import { money } from "@/lib/management";
import type { ManagementContractDraft } from "@/lib/management-contract";
import type { DepartmentExpense } from "@/lib/management";
import type { SmReceipt } from "@/lib/sales-marketing";
import {
  ChartCard,
  DonutChart,
  GroupedBarChart,
  HorizontalBarChart,
} from "@/components/mgmt/AnalyticsCharts";

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
    <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3.5 shadow-sm">
      <p className="text-xs font-medium text-[var(--harbor-ink)]/55">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--harbor-ink)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--harbor-ink)]/50">{hint}</p>
      ) : null}
    </div>
  );
}

type Props = {
  /** "all" or a managed property id */
  propertyId?: string;
};

export function AnalyticsDashboard({ propertyId = "all" }: Props) {
  const { items: allProperties } = useSharedCollection<ManagementContractDraft>(
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

  const properties = useMemo(() => {
    if (propertyId === "all") return allProperties;
    return allProperties.filter((p) => p.id === propertyId);
  }, [allProperties, propertyId]);

  const selectedName =
    propertyId === "all"
      ? null
      : allProperties.find((p) => p.id === propertyId)?.propertyName || "";

  const scopedTenants = useMemo(() => {
    if (propertyId === "all" || !selectedName) return tenants;
    return tenants.filter((t) =>
      softPropertyNamesMatch(t.propertyLeased, selectedName)
    );
  }, [tenants, propertyId, selectedName]);

  const scopedWorkOrders = useMemo(() => {
    if (propertyId === "all" || !selectedName) return workOrders;
    return workOrders.filter((w) =>
      softPropertyNamesMatch(w.property || "", selectedName)
    );
  }, [workOrders, propertyId, selectedName]);

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
    const completed = scopedWorkOrders.filter((w) => w.status === "completed");
    const openWo = scopedWorkOrders.filter((w) => w.status !== "completed");
    const avgOcc =
      properties.length === 0
        ? 0
        : properties.reduce(
            (s, p) => s + (Number(p.occupancyPercent) || 0),
            0
          ) / properties.length;
    const pastDue = scopedTenants.filter((t) => t.pendingDue > 0).length;
    const smSpend = campaigns.reduce((s, c) => s + c.cost, 0);
    const pendingSpend =
      deptExp.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0) +
      smReceipts
        .filter((e) => e.status === "pending")
        .reduce((s, e) => s + e.amount, 0);

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
      completionDays,
      propertyCount: properties.length,
      tenantCount: scopedTenants.length,
      campaignCount: campaigns.length,
      monthlyRent: properties.reduce(
        (s, p) => s + (Number(p.monthlyRentRoll) || 0),
        0
      ),
    };
  }, [
    properties,
    scopedWorkOrders,
    scopedTenants,
    campaigns,
    deptExp,
    smReceipts,
  ]);

  const topPropertiesByRent = useMemo(() => {
    const source = propertyId === "all" ? allProperties : properties;
    return [...source]
      .map((p) => ({
        id: p.id,
        label: p.propertyName || "Untitled",
        value: (Number(p.monthlyRentRoll) || 0) * 12 || Number(p.annualGpr) || 0,
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [allProperties, properties, propertyId]);

  const scopeHint =
    propertyId === "all" ? "Whole portfolio" : selectedName || "This property";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Yearly rent (what we bill)"
          value={money(stats.revenue)}
          hint={`${scopeHint} · ${money(stats.monthlyRent)}/mo`}
        />
        <Kpi
          label="Operating expenses"
          value={money(stats.opex)}
          hint="Property operating costs (annual)"
        />
        <Kpi
          label="NOI (rent minus expenses)"
          value={money(stats.noi)}
          hint={
            stats.revenue > 0
              ? `${stats.margin.toFixed(0)}% kept after OpEx`
              : "Add rent roll data to calculate"
          }
        />
        <Kpi
          label="Units filled (occupancy)"
          value={stats.propertyCount ? `${stats.avgOcc.toFixed(0)}%` : "—"}
          hint={
            propertyId === "all"
              ? `Average across ${stats.propertyCount} properties`
              : "This property"
          }
        />
        <Kpi
          label="Tenants behind on rent"
          value={String(stats.pastDue)}
          hint={`${stats.tenantCount} tenants in this view`}
        />
        <Kpi
          label="Open maintenance jobs"
          value={String(stats.openWo)}
          hint={
            stats.completionDays != null
              ? `${stats.completionDays.toFixed(1)} day avg to finish`
              : `${stats.completedWo} completed on file`
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Money in vs money out"
          subtitle="Yearly rent collected potential, operating costs, and what’s left (NOI)"
        >
          <GroupedBarChart
            categories={[propertyId === "all" ? "Portfolio" : "Property"]}
            series={[
              {
                key: "rev",
                label: "Yearly rent",
                color: "var(--harbor-deep)",
                values: [stats.revenue],
              },
              {
                key: "opex",
                label: "Expenses",
                color: "#b45309",
                values: [stats.opex],
              },
              {
                key: "noi",
                label: "NOI left over",
                color: "#0d9488",
                values: [stats.noi],
              },
            ]}
            formatValue={(n) => money(n)}
            height={160}
          />
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[var(--harbor-deep)]/[0.04] px-3 py-3 text-center text-xs">
            <p>
              <span className="opacity-55">Yearly rent</span>
              <br />
              <strong className="tabular-nums">{money(stats.revenue)}</strong>
            </p>
            <p>
              <span className="opacity-55">Expenses</span>
              <br />
              <strong className="tabular-nums">{money(stats.opex)}</strong>
            </p>
            <p>
              <span className="opacity-55">Left over (NOI)</span>
              <br />
              <strong className="tabular-nums">{money(stats.noi)}</strong>
            </p>
          </div>
        </ChartCard>

        <ChartCard
          title="Day-to-day operations"
          subtitle="Maintenance workload and who is current on rent"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DonutChart
              centerLabel="Jobs"
              centerValue={String(stats.openWo + stats.completedWo)}
              slices={[
                {
                  id: "open",
                  label: "Still open",
                  value: stats.openWo,
                  color: "#b45309",
                },
                {
                  id: "done",
                  label: "Finished",
                  value: stats.completedWo,
                  color: "#0d9488",
                },
              ]}
            />
            <DonutChart
              centerLabel="Tenants"
              centerValue={String(stats.tenantCount)}
              slices={[
                {
                  id: "ok",
                  label: "Paid up",
                  value: Math.max(0, stats.tenantCount - stats.pastDue),
                  color: "#0d9488",
                },
                {
                  id: "late",
                  label: "Behind",
                  value: stats.pastDue,
                  color: "#be123c",
                },
              ]}
            />
          </div>
        </ChartCard>

        <ChartCard
          title={
            propertyId === "all"
              ? "Which properties bring in the most rent?"
              : "This property’s yearly rent"
          }
          subtitle="Longer bars = higher annual rent roll"
        >
          <HorizontalBarChart
            rows={
              topPropertiesByRent.length > 0
                ? topPropertiesByRent
                : [{ id: "empty", label: "No rent-roll data yet", value: 0 }]
            }
            formatValue={(n) => money(n)}
          />
        </ChartCard>

        <ChartCard
          title="Other costs to watch"
          subtitle="Company-wide spend signals (not always limited to one property)"
        >
          <HorizontalBarChart
            rows={[
              {
                id: "sm",
                label: "Marketing campaign spend",
                value: Math.max(stats.smSpend, 0),
                color: "#0d9488",
              },
              {
                id: "pending",
                label: "Bills waiting for approval",
                value: Math.max(stats.pendingSpend, 0),
                color: "#b45309",
              },
              {
                id: "wo",
                label: "Open + finished work orders",
                value: stats.openWo + stats.completedWo,
                color: "var(--harbor-deep)",
              },
            ]}
            formatValue={(n) => (n >= 100 ? money(n) : String(n))}
          />
        </ChartCard>
      </div>
    </div>
  );
}
