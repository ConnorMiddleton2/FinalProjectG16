"use client";

import { useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { money } from "@/lib/management";
import {
  ChartCard,
  GroupedBarChart,
  HorizontalBarChart,
} from "@/components/mgmt/AnalyticsCharts";

type GroupBy = "property" | "city" | "type";

type Props = {
  propertyId?: string;
};

export function PropertyAnalyticsDashboard({ propertyId = "all" }: Props) {
  const { items: allProperties, loading, error } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const [groupBy, setGroupBy] = useState<GroupBy>("property");

  const properties = useMemo(() => {
    if (propertyId === "all") return allProperties;
    return allProperties.filter((p) => p.id === propertyId);
  }, [allProperties, propertyId]);

  const rows = useMemo(() => {
    if (groupBy === "property" || propertyId !== "all") {
      return properties.map((p) => {
        const rentRoll = Number(p.monthlyRentRoll) || 0;
        const annualRev = rentRoll * 12 || Number(p.annualGpr) || 0;
        const noi = Number(p.annualNoi) || annualRev * 0.4;
        const margin = annualRev > 0 ? (noi / annualRev) * 100 : 0;
        return {
          id: p.id,
          label: p.propertyName || "Untitled",
          sub: [p.city, p.state].filter(Boolean).join(", "),
          occupancy: Number(p.occupancyPercent) || 0,
          revenue: annualRev,
          noi,
          margin,
          tenants: Number(p.tenantCount) || 0,
        };
      });
    }

    const map = new Map<
      string,
      {
        id: string;
        label: string;
        sub: string;
        occupancy: number[];
        revenue: number;
        noi: number;
        tenants: number;
      }
    >();

    for (const p of properties) {
      const key =
        groupBy === "city"
          ? p.city || "Unspecified city"
          : p.propertyType || "other";
      const rentRoll = Number(p.monthlyRentRoll) || 0;
      const annualRev = rentRoll * 12 || Number(p.annualGpr) || 0;
      const noi = Number(p.annualNoi) || annualRev * 0.4;
      const existing = map.get(key) ?? {
        id: key,
        label: key,
        sub: groupBy === "city" ? "City group" : "Asset type group",
        occupancy: [] as number[],
        revenue: 0,
        noi: 0,
        tenants: 0,
      };
      existing.revenue += annualRev;
      existing.noi += noi;
      existing.tenants += Number(p.tenantCount) || 0;
      if (p.occupancyPercent) {
        existing.occupancy.push(Number(p.occupancyPercent));
      }
      map.set(key, existing);
    }

    return Array.from(map.values()).map((g) => ({
      id: g.id,
      label: g.label,
      sub: g.sub,
      occupancy:
        g.occupancy.length === 0
          ? 0
          : g.occupancy.reduce((a, b) => a + b, 0) / g.occupancy.length,
      revenue: g.revenue,
      noi: g.noi,
      margin: g.revenue > 0 ? (g.noi / g.revenue) * 100 : 0,
      tenants: g.tenants,
    }));
  }, [properties, groupBy, propertyId]);

  const chartRows = useMemo(
    () => [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    [rows]
  );

  const single = propertyId !== "all" && rows[0] ? rows[0] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm opacity-65">
          {single
            ? "Key numbers for the selected property — rent, NOI, occupancy, and tenants."
            : "Compare properties (or group by city / type). Longer bars mean more rent or higher occupancy."}
        </p>
        {propertyId === "all" ? (
          <select
            className="select select-bordered select-sm bg-white"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          >
            <option value="property">Compare properties</option>
            <option value="city">Group by city</option>
            <option value="type">Group by property type</option>
          </select>
        ) : null}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm opacity-60">Loading properties…</p>}

      {single ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3">
            <p className="text-xs opacity-55">Yearly rent</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {money(single.revenue)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3">
            <p className="text-xs opacity-55">NOI (left after expenses)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {money(single.noi)}
            </p>
            <p className="text-xs opacity-50">{single.margin.toFixed(0)}% margin</p>
          </div>
          <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3">
            <p className="text-xs opacity-55">Occupancy</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {single.occupancy ? `${single.occupancy.toFixed(0)}%` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3">
            <p className="text-xs opacity-55">Tenants on file</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {single.tenants || "—"}
            </p>
            <p className="text-xs opacity-50">{single.sub || "—"}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Yearly rent vs NOI"
          subtitle="Teal = what remains after operating expenses"
        >
          {chartRows.length === 0 ? (
            <p className="text-sm opacity-55">No property data yet.</p>
          ) : (
            <GroupedBarChart
              categories={chartRows.map((r) =>
                r.label.length > 14 ? `${r.label.slice(0, 13)}…` : r.label
              )}
              series={[
                {
                  key: "rev",
                  label: "Yearly rent",
                  color: "var(--harbor-deep)",
                  values: chartRows.map((r) => r.revenue),
                },
                {
                  key: "noi",
                  label: "NOI",
                  color: "#0d9488",
                  values: chartRows.map((r) => r.noi),
                },
              ]}
              formatValue={(n) => money(n)}
              height={200}
            />
          )}
        </ChartCard>

        <ChartCard
          title="How full are the buildings?"
          subtitle="100% = fully occupied"
        >
          {chartRows.length === 0 ? (
            <p className="text-sm opacity-55">No occupancy data yet.</p>
          ) : (
            <HorizontalBarChart
              rows={chartRows.map((r) => ({
                id: r.id,
                label: r.label,
                value: r.occupancy,
                color:
                  r.occupancy >= 90
                    ? "#0d9488"
                    : r.occupancy >= 75
                      ? "#b45309"
                      : "#be123c",
              }))}
              formatValue={(n) => `${n.toFixed(0)}%`}
              maxValue={100}
            />
          )}
        </ChartCard>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 shadow-sm">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Property / group</th>
              <th>Occupancy</th>
              <th>Yearly rent</th>
              <th>NOI</th>
              <th>Margin</th>
              <th>Tenants</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center opacity-55">
                  No properties to show for this filter.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-xs opacity-55">{r.sub}</p>
                  </td>
                  <td>{r.occupancy ? `${r.occupancy.toFixed(0)}%` : "—"}</td>
                  <td className="tabular-nums">{money(r.revenue)}</td>
                  <td className="tabular-nums">{money(r.noi)}</td>
                  <td>{r.margin ? `${r.margin.toFixed(1)}%` : "—"}</td>
                  <td>{r.tenants || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
