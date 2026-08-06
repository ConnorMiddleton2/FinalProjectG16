import type { ManagementContractDraft } from "@/lib/management-contract";
import type { LivePortfolioMetrics } from "@/lib/property-live-metrics";
import {
  getPaymentStatus,
  isLeaseExpiringWithinDays,
  type TenantRecord,
} from "@/lib/tenants";

export type CompositionMetric =
  | "tenantCount"
  | "occupiedUnits"
  | "vacantUnits"
  | "liveOccupancy"
  | "rentRoll"
  | "ar";

export const COMPOSITION_METRICS: {
  value: CompositionMetric;
  label: string;
  hint: string;
}[] = [
  {
    value: "tenantCount",
    label: "Current tenants",
    hint: "Live current tenants linked to each property (same isCurrentTenant rule as the Tenant master list).",
  },
  {
    value: "occupiedUnits",
    label: "Occupied units",
    hint: "Distinct current property + unit assignments.",
  },
  {
    value: "vacantUnits",
    label: "Vacant units",
    hint: "Total units minus occupied units (floored at zero).",
  },
  {
    value: "liveOccupancy",
    label: "Live occupancy",
    hint: "Occupied units ÷ total units for each property.",
  },
  {
    value: "rentRoll",
    label: "Monthly rent roll",
    hint: "Sum of monthly rent for uniquely linked current tenants.",
  },
  {
    value: "ar",
    label: "Outstanding A/R",
    hint: "Open receivable balances for uniquely linked tenants.",
  },
];

export const PROPERTY_CHART_COLORS = [
  "#1f7a8c",
  "#134e5a",
  "#c47b3a",
  "#3d6b4f",
  "#6b4f8a",
  "#8c4a5a",
];

export function metricValueForProperty(
  c: ManagementContractDraft,
  metric: CompositionMetric,
  live?: LivePortfolioMetrics | null
): number {
  const m = live?.byPropertyId[c.id];
  switch (metric) {
    case "tenantCount":
      return m?.currentTenants ?? 0;
    case "occupiedUnits":
      return m?.occupiedUnits ?? 0;
    case "vacantUnits":
      return m?.vacantUnits ?? 0;
    case "liveOccupancy":
      return m?.liveOccupancyPercent ?? 0;
    case "rentRoll":
      return m?.monthlyRentRoll ?? 0;
    case "ar":
      return m?.outstandingAr ?? 0;
    default:
      return 0;
  }
}

export type CompositionSlice = {
  id: string;
  label: string;
  value: number;
  percent: number;
  color: string;
};

export function buildCompositionSlices(
  contracts: ManagementContractDraft[],
  metric: CompositionMetric,
  live?: LivePortfolioMetrics | null
): CompositionSlice[] {
  const rows = contracts.map((c, i) => ({
    id: c.id,
    label: c.propertyName || "Untitled",
    value: metricValueForProperty(c, metric, live),
    color: PROPERTY_CHART_COLORS[i % PROPERTY_CHART_COLORS.length],
  }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows.map((r) => ({
    ...r,
    percent: total > 0 ? (r.value / total) * 100 : 0,
  }));
}

export type PortfolioInsight = {
  id: string;
  text: string;
  tone?: "default" | "warn" | "danger";
  propertyId?: string;
};

export function buildPortfolioInsights(
  contracts: ManagementContractDraft[],
  tenants: TenantRecord[],
  live?: LivePortfolioMetrics | null
): PortfolioInsight[] {
  if (contracts.length === 0 || !live) return [];

  const insights: PortfolioInsight[] = [];
  const withUnits = contracts.filter(
    (c) => (live.byPropertyId[c.id]?.totalUnits ?? 0) > 0
  );

  if (withUnits.length > 0) {
    const byOcc = [...withUnits].sort((a, b) => {
      const ao = live.byPropertyId[a.id]?.liveOccupancyPercent ?? 0;
      const bo = live.byPropertyId[b.id]?.liveOccupancyPercent ?? 0;
      return bo - ao;
    });
    const highest = byOcc[0];
    const lowest = byOcc[byOcc.length - 1];
    const hi = live.byPropertyId[highest.id]?.liveOccupancyPercent ?? 0;
    const lo = live.byPropertyId[lowest.id]?.liveOccupancyPercent ?? 0;
    insights.push({
      id: "highest-live-occ",
      text: `${highest.propertyName} has the highest live occupancy (${hi.toFixed(0)}%).`,
      propertyId: highest.id,
    });
    insights.push({
      id: "lowest-live-occ",
      text: `${lowest.propertyName} has the lowest live occupancy (${lo.toFixed(0)}%).`,
      tone: "warn",
      propertyId: lowest.id,
    });
  }

  const byVacant = [...contracts].sort(
    (a, b) =>
      (live.byPropertyId[b.id]?.vacantUnits ?? 0) -
      (live.byPropertyId[a.id]?.vacantUnits ?? 0)
  );
  if ((live.byPropertyId[byVacant[0]?.id]?.vacantUnits ?? 0) > 0) {
    const top = byVacant[0];
    insights.push({
      id: "most-vacant",
      text: `${top.propertyName} has the most vacant units (${live.byPropertyId[top.id].vacantUnits}).`,
      tone: "warn",
      propertyId: top.id,
    });
  }

  const byAr = [...contracts].sort(
    (a, b) =>
      (live.byPropertyId[b.id]?.outstandingAr ?? 0) -
      (live.byPropertyId[a.id]?.outstandingAr ?? 0)
  );
  if ((live.byPropertyId[byAr[0]?.id]?.outstandingAr ?? 0) > 0) {
    const top = byAr[0];
    const amt = live.byPropertyId[top.id].outstandingAr;
    insights.push({
      id: "highest-ar",
      text: `${top.propertyName} has the highest outstanding A/R ($${amt.toLocaleString()}).`,
      tone: "danger",
      propertyId: top.id,
    });
  }

  const delinquent = tenants.filter(
    (t) => getPaymentStatus(t) === "late" || t.category === "past_due"
  ).length;
  insights.push({
    id: "delinquent-tenants",
    text: `${delinquent} delinquent tenant${delinquent === 1 ? "" : "s"} across the portfolio.`,
    tone: delinquent > 0 ? "danger" : "default",
  });

  const expiring = tenants.filter((t) =>
    isLeaseExpiringWithinDays(t, 90)
  ).length;
  insights.push({
    id: "expiring-leases",
    text: `${expiring} lease${expiring === 1 ? "" : "s"} expiring within 90 days.`,
    tone: expiring > 0 ? "warn" : "default",
  });

  return insights;
}

export type LeaseRiskBuckets = {
  within90: number;
  within180: number;
  within365: number;
};

export function leaseRiskBuckets(tenants: TenantRecord[]): LeaseRiskBuckets {
  return {
    within90: tenants.filter((t) => isLeaseExpiringWithinDays(t, 90)).length,
    within180: tenants.filter((t) => isLeaseExpiringWithinDays(t, 180)).length,
    within365: tenants.filter((t) => isLeaseExpiringWithinDays(t, 365)).length,
  };
}

export function propertyPortfolioShares(
  contract: ManagementContractDraft,
  all: ManagementContractDraft[],
  live?: LivePortfolioMetrics | null
) {
  const rentTotal = live?.monthlyRentRoll ?? 0;
  const arTotal = live?.outstandingAr ?? 0;
  const occTotal = live?.occupiedUnits ?? 0;
  const rent = live?.byPropertyId[contract.id]?.monthlyRentRoll ?? 0;
  const ar = live?.byPropertyId[contract.id]?.outstandingAr ?? 0;
  const occ = live?.byPropertyId[contract.id]?.occupiedUnits ?? 0;
  return {
    rentShare: rentTotal > 0 ? (rent / rentTotal) * 100 : null,
    arShare: arTotal > 0 ? (ar / arTotal) * 100 : null,
    occupiedShare: occTotal > 0 ? (occ / occTotal) * 100 : null,
  };
}
