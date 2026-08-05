"use client";

import { useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { money } from "@/lib/management";

type GroupBy = "property" | "city" | "type";

export function PropertyAnalyticsDashboard() {
  const { items: properties, loading, error } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const [groupBy, setGroupBy] = useState<GroupBy>("property");

  const rows = useMemo(() => {
    if (groupBy === "property") {
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
  }, [properties, groupBy]);

  const demoFallback =
    rows.length === 0
      ? [
          {
            id: "demo-1",
            label: "Harborline Commons",
            sub: "Demo asset",
            occupancy: 94,
            revenue: 2100000,
            noi: 840000,
            margin: 40,
            tenants: 28,
          },
          {
            id: "demo-2",
            label: "Pierpoint Tower",
            sub: "Demo asset",
            occupancy: 88,
            revenue: 1600000,
            noi: 576000,
            margin: 36,
            tenants: 19,
          },
        ]
      : rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm opacity-65">
          High-level margin, occupancy, and rent performance by property or
          group.
        </p>
        <select
          className="select select-bordered select-sm bg-white"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
        >
          <option value="property">By property</option>
          <option value="city">By city</option>
          <option value="type">By property type</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm opacity-60">Loading properties…</p>}

      <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Occupancy</th>
              <th>Ann. revenue</th>
              <th>NOI</th>
              <th>Margin</th>
              <th>Tenants</th>
            </tr>
          </thead>
          <tbody>
            {demoFallback.map((r) => (
              <tr key={r.id}>
                <td>
                  <p className="font-medium">{r.label}</p>
                  <p className="text-xs opacity-55">{r.sub}</p>
                </td>
                <td>{r.occupancy ? `${r.occupancy.toFixed(0)}%` : "—"}</td>
                <td>{money(r.revenue)}</td>
                <td>{money(r.noi)}</td>
                <td>{r.margin ? `${r.margin.toFixed(1)}%` : "—"}</td>
                <td>{r.tenants || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
