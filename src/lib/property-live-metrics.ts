/**
 * Live Properties metrics from Tenant master list + rental_receivables.
 * Does not use managed_properties.tenantCount or occupancyPercent.
 *
 * Future complete unit roster (not created yet):
 *   collection: property_units
 *   fields: id, propertyId, unitId|unitLabel, status?, active?
 * When that roster exists for a property, vacancy listing derives from it.
 * Until then: unitsSuites totals + distinct current occupied units; no invented vacant suite IDs.
 */

import {
  parseMetricNumber,
  type ManagementContractDraft,
} from "@/lib/management-contract";
import {
  isCanceledReceivable,
  normalizeCustomerId,
  openReceivableAmount,
  type RentalReceivable,
} from "@/lib/rental-receivables";
import {
  getLeaseEnd,
  getMonthlyRent,
  getPaymentStatus,
  isCurrentTenant,
  isLeaseExpiringWithinDays,
  softPropertyNamesMatch,
  type TenantRecord,
} from "@/lib/tenants";

export const LIVE_TENANT_OCCUPANCY_HELPER =
  "Live tenant and occupancy metrics are derived from current tenant assignments linked to managed properties.";

export const VACANT_UNITS_HELPER =
  "Vacant units are calculated as total managed units minus distinct occupied units from current tenant assignments.";

export const NO_COMPLETE_UNIT_ROSTER_NOTE =
  "Specific vacant units are unavailable because no complete unit roster is connected.";

export const NO_PROPERTY_ROSTER_NOTE =
  "No separate property roster records are connected. Current occupancy is derived from the management Tenant master list.";

/** Documented future unit-roster contract (do not create records now). */
export const FUTURE_PROPERTY_UNITS_CONTRACT = {
  collection: "property_units",
  fields: [
    "id",
    "propertyId",
    "unitId or unitLabel",
    "status (optional)",
    "active (optional)",
  ],
} as const;

export type TenantPropertyLinkExclusion = {
  tenantId: string;
  tenantName: string;
  reason: "missing_property_match" | "ambiguous_property_match" | "missing_unit";
  detail: string;
};

export type OccupiedUnitRow = {
  unitLabel: string;
  unitKey: string;
  tenantId: string;
  tenantName: string;
  leaseStatus: string;
  leaseEnd: string;
  delinquent: boolean;
};

export type LivePropertyMetrics = {
  propertyId: string;
  propertyName: string;
  currentTenants: number;
  occupiedUnits: number;
  totalUnits: number;
  vacantUnits: number;
  liveOccupancyPercent: number | null;
  /** Sum of monthlyRent for uniquely linked current tenants. */
  monthlyRentRoll: number;
  /** Sum of open A/R for uniquely linked tenants (all master-list tenants on property). */
  outstandingAr: number;
  occupiedUnitRows: OccupiedUnitRow[];
  currentTenantIds: string[];
  /** Always false until property_units (or equivalent) is connected. */
  hasCompleteUnitRoster: boolean;
  specificVacantUnitLabels: string[];
};

export type LivePortfolioMetrics = {
  currentTenants: number;
  totalTenantRecords: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  liveOccupancyPercent: number | null;
  monthlyRentRoll: number;
  outstandingAr: number;
  byPropertyId: Record<string, LivePropertyMetrics>;
  exclusions: TenantPropertyLinkExclusion[];
};

function tenantExplicitPropertyId(t: TenantRecord): string | null {
  const raw = (t as TenantRecord & { propertyId?: unknown }).propertyId;
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return id || null;
}

export function resolveTenantManagedPropertyId(
  tenant: TenantRecord,
  properties: ManagementContractDraft[]
): {
  propertyId: string | null;
  exclusionReason?: "missing_property_match" | "ambiguous_property_match";
} {
  const explicit = tenantExplicitPropertyId(tenant);
  if (explicit) {
    if (properties.some((p) => p.id === explicit)) {
      return { propertyId: explicit };
    }
    return { propertyId: null, exclusionReason: "missing_property_match" };
  }

  const name = (tenant.propertyLeased || "").trim();
  if (!name) {
    return { propertyId: null, exclusionReason: "missing_property_match" };
  }
  const matches = properties.filter((p) =>
    softPropertyNamesMatch(p.propertyName, name)
  );
  if (matches.length === 1) return { propertyId: matches[0].id };
  if (matches.length === 0) {
    return { propertyId: null, exclusionReason: "missing_property_match" };
  }
  return { propertyId: null, exclusionReason: "ambiguous_property_match" };
}

export function normalizeUnitKey(unit: string): string {
  return unit.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hasUsableUnit(unit: string | undefined | null): boolean {
  return typeof unit === "string" && unit.trim().length > 0;
}

export function liveOccupancyPercent(
  occupiedUnits: number,
  totalUnits: number
): number | null {
  if (totalUnits <= 0) return null;
  return (occupiedUnits / totalUnits) * 100;
}

export function vacantUnitsCount(
  totalUnits: number,
  occupiedUnits: number
): number {
  return Math.max(0, totalUnits - occupiedUnits);
}

export function formatLiveOccupancy(
  occupiedUnits: number,
  totalUnits: number
): string {
  const pct = liveOccupancyPercent(occupiedUnits, totalUnits);
  if (pct == null) return "—";
  return `${pct.toFixed(0)}%`;
}

function leaseStatusForOccupied(t: TenantRecord, now: Date): string {
  if (isLeaseExpiringWithinDays(t, 90, now)) return "Expiring";
  if (t.category === "vacating") return "Vacating";
  if (t.category === "past_due") return "Past due";
  if (t.category === "pending") return "Pending";
  return "Current";
}

function isDelinquent(t: TenantRecord): boolean {
  return getPaymentStatus(t) === "late" || t.category === "past_due";
}

/**
 * No complete unit roster is connected today (property_tenants is an optional
 * occupied-tenant roster, not a full unit inventory). Returns empty vacant labels.
 */
export function resolveCompleteUnitRoster(_input: {
  propertyId: string;
}): {
  complete: boolean;
  unitLabels: string[];
} {
  return { complete: false, unitLabels: [] };
}

export function buildLivePortfolioMetrics(
  contracts: ManagementContractDraft[],
  tenants: TenantRecord[],
  receivables: RentalReceivable[] = [],
  now = new Date()
): LivePortfolioMetrics {
  const byPropertyId: Record<string, LivePropertyMetrics> = {};
  for (const c of contracts) {
    byPropertyId[c.id] = {
      propertyId: c.id,
      propertyName: c.propertyName,
      currentTenants: 0,
      occupiedUnits: 0,
      totalUnits: parseMetricNumber(c.unitsSuites),
      vacantUnits: 0,
      liveOccupancyPercent: null,
      monthlyRentRoll: 0,
      outstandingAr: 0,
      occupiedUnitRows: [],
      currentTenantIds: [],
      hasCompleteUnitRoster: false,
      specificVacantUnitLabels: [],
    };
  }

  const occupiedByProperty = new Map<
    string,
    Map<string, OccupiedUnitRow>
  >();
  const exclusions: TenantPropertyLinkExclusion[] = [];
  let currentTenants = 0;

  // Open A/R by normalized tenant id (all open rows; canceled/void excluded).
  const arByTenant = new Map<string, number>();
  for (const r of receivables) {
    if (isCanceledReceivable(r)) continue;
    const open = openReceivableAmount(r);
    if (open <= 0) continue;
    const id = normalizeCustomerId(r.customerId);
    arByTenant.set(id, (arByTenant.get(id) ?? 0) + open);
  }

  // Link every master-list tenant for A/R attribution; occupancy uses current only.
  for (const t of tenants) {
    const link = resolveTenantManagedPropertyId(t, contracts);
    if (link.propertyId && byPropertyId[link.propertyId]) {
      const ar = arByTenant.get(normalizeCustomerId(t.id)) ?? 0;
      byPropertyId[link.propertyId].outstandingAr += ar;
    }
  }

  for (const t of tenants) {
    if (!isCurrentTenant(t, now)) continue;
    currentTenants += 1;

    const link = resolveTenantManagedPropertyId(t, contracts);
    if (!link.propertyId) {
      exclusions.push({
        tenantId: t.id,
        tenantName: t.name,
        reason: link.exclusionReason ?? "missing_property_match",
        detail:
          link.exclusionReason === "ambiguous_property_match"
            ? `Ambiguous property name match for “${t.propertyLeased}”.`
            : `No unique managed property for “${t.propertyLeased || "(empty)"}”.`,
      });
      continue;
    }

    const metrics = byPropertyId[link.propertyId];
    if (!metrics) {
      exclusions.push({
        tenantId: t.id,
        tenantName: t.name,
        reason: "missing_property_match",
        detail: `Resolved propertyId ${link.propertyId} is not in the current managed set.`,
      });
      continue;
    }

    metrics.currentTenants += 1;
    metrics.currentTenantIds.push(t.id);
    metrics.monthlyRentRoll += getMonthlyRent(t);

    if (!hasUsableUnit(t.unit)) {
      exclusions.push({
        tenantId: t.id,
        tenantName: t.name,
        reason: "missing_unit",
        detail: `Current tenant at ${metrics.propertyName} has no usable unit — counted in Current tenants, not Occupied units.`,
      });
      continue;
    }

    const unitKey = normalizeUnitKey(t.unit);
    let unitMap = occupiedByProperty.get(link.propertyId);
    if (!unitMap) {
      unitMap = new Map();
      occupiedByProperty.set(link.propertyId, unitMap);
    }
    if (!unitMap.has(unitKey)) {
      unitMap.set(unitKey, {
        unitLabel: t.unit.trim(),
        unitKey,
        tenantId: t.id,
        tenantName: t.name,
        leaseStatus: leaseStatusForOccupied(t, now),
        leaseEnd: getLeaseEnd(t),
        delinquent: isDelinquent(t),
      });
    }
  }

  const totalUnits = contracts.reduce(
    (s, c) => s + parseMetricNumber(c.unitsSuites),
    0
  );

  let occupiedUnits = 0;
  let monthlyRentRoll = 0;
  let outstandingAr = 0;

  for (const id of Object.keys(byPropertyId)) {
    const m = byPropertyId[id];
    const unitMap = occupiedByProperty.get(id);
    m.occupiedUnitRows = unitMap
      ? Array.from(unitMap.values()).sort((a, b) =>
          a.unitLabel.localeCompare(b.unitLabel)
        )
      : [];
    m.occupiedUnits = m.occupiedUnitRows.length;
    occupiedUnits += m.occupiedUnits;

    const roster = resolveCompleteUnitRoster({ propertyId: id });
    m.hasCompleteUnitRoster = roster.complete;
    if (roster.complete) {
      m.totalUnits = roster.unitLabels.length;
      const occupiedKeys = new Set(m.occupiedUnitRows.map((r) => r.unitKey));
      m.specificVacantUnitLabels = roster.unitLabels.filter(
        (label) => !occupiedKeys.has(normalizeUnitKey(label))
      );
      m.vacantUnits = m.specificVacantUnitLabels.length;
      // Recompute occupied against roster match count if needed later.
    } else {
      m.vacantUnits = vacantUnitsCount(m.totalUnits, m.occupiedUnits);
      m.specificVacantUnitLabels = [];
    }

    m.liveOccupancyPercent = liveOccupancyPercent(
      m.occupiedUnits,
      m.totalUnits
    );
    monthlyRentRoll += m.monthlyRentRoll;
    outstandingAr += m.outstandingAr;
  }

  return {
    currentTenants,
    totalTenantRecords: tenants.length,
    totalUnits,
    occupiedUnits,
    vacantUnits: vacantUnitsCount(totalUnits, occupiedUnits),
    liveOccupancyPercent: liveOccupancyPercent(occupiedUnits, totalUnits),
    monthlyRentRoll,
    outstandingAr,
    byPropertyId,
    exclusions,
  };
}

export function liveMetricsForProperty(
  portfolio: LivePortfolioMetrics,
  propertyId: string
): LivePropertyMetrics | null {
  return portfolio.byPropertyId[propertyId] ?? null;
}
