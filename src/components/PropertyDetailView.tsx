"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, PlusCircle } from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  formatOptionalLeaseDate,
  getPaymentStatus,
  isCurrentTenant,
  isLeaseExpiringWithinDays,
  softPropertyNamesMatch,
  tenantCategoryLabel,
  type TenantRecord,
} from "@/lib/tenants";
import {
  emptyPropertyTenant,
  feeStructureLabel,
  formatMetricCurrency,
  formatPropertyAddress,
  type ManagementContractDraft,
  type SharedPropertyTenant,
} from "@/lib/management-contract";
import type { RentalReceivable } from "@/lib/rental-receivables";
import {
  buildLivePortfolioMetrics,
  formatLiveOccupancy,
  LIVE_TENANT_OCCUPANCY_HELPER,
  NO_COMPLETE_UNIT_ROSTER_NOTE,
  NO_PROPERTY_ROSTER_NOTE,
  resolveTenantManagedPropertyId,
  VACANT_UNITS_HELPER,
} from "@/lib/property-live-metrics";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/80 px-3 py-3">
      <p className="text-xs uppercase tracking-wide opacity-55">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--harbor-ink)]">
        {value || "—"}
      </p>
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-[var(--harbor-ink)]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const v = (value || "").trim();
  if (!v) return null;
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-base-200 py-2 text-sm last:border-0">
      <dt className="opacity-60">{label}</dt>
      <dd className="font-medium text-[var(--harbor-ink)]">{v}</dd>
    </div>
  );
}

function meaningful(value: string | undefined | null): boolean {
  const v = (value || "").trim();
  return !!v && v !== "—" && v.toLowerCase() !== "not entered";
}

type Props = {
  contract: ManagementContractDraft;
  onBack: () => void;
};

export function PropertyDetailView({ contract, onBack }: Props) {
  const {
    items: allTenants,
    saveOne: saveTenant,
    loading,
    error,
  } = useSharedCollection<SharedPropertyTenant>(COLLECTIONS.propertyTenants);
  const { items: masterTenants } = useSharedCollection<TenantRecord>(
    COLLECTIONS.tenants
  );
  const { items: allContracts } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const { items: receivables } = useSharedCollection<RentalReceivable>(
    COLLECTIONS.rentalReceivables
  );

  const rosterTenants = useMemo(
    () => allTenants.filter((t) => t.propertyId === contract.id),
    [allTenants, contract.id]
  );

  const linkedTenants = useMemo(
    () =>
      masterTenants.filter((t) => {
        const link = resolveTenantManagedPropertyId(t, allContracts);
        if (link.propertyId) return link.propertyId === contract.id;
        return softPropertyNamesMatch(t.propertyLeased, contract.propertyName);
      }),
    [masterTenants, allContracts, contract.id, contract.propertyName]
  );

  const livePortfolio = useMemo(
    () =>
      buildLivePortfolioMetrics(allContracts, masterTenants, receivables),
    [allContracts, masterTenants, receivables]
  );
  const liveProp = livePortfolio.byPropertyId[contract.id];
  const liveCurrentTenants = liveProp?.currentTenants ?? 0;
  const liveOccupiedUnits = liveProp?.occupiedUnits ?? 0;
  const liveVacantUnits = liveProp?.vacantUnits ?? 0;
  const liveTotalUnits = liveProp?.totalUnits ?? 0;
  const liveOccLabel = formatLiveOccupancy(liveOccupiedUnits, liveTotalUnits);
  const monthlyRentRoll = liveProp?.monthlyRentRoll ?? 0;
  const outstandingAr = liveProp?.outstandingAr ?? 0;
  const occupiedRows = liveProp?.occupiedUnitRows ?? [];
  const specificVacant = liveProp?.specificVacantUnitLabels ?? [];
  const hasCompleteRoster = liveProp?.hasCompleteUnitRoster ?? false;

  const currentLinked = linkedTenants.filter((t) => isCurrentTenant(t));
  const linkedDelinquent = linkedTenants.filter(
    (t) => getPaymentStatus(t) === "late" || t.category === "past_due"
  ).length;
  const linkedExpiring90 = linkedTenants.filter((t) =>
    isLeaseExpiringWithinDays(t, 90)
  ).length;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() =>
    emptyPropertyTenant(contract.id, contract.propertyName)
  );
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const address = formatPropertyAddress(contract);
  const feeLabel = [
    feeStructureLabel(contract.feeStructure),
    contract.feePercent ? `${contract.feePercent}%` : "",
    contract.feeFlatAmount ? `$${contract.feeFlatAmount}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const assetRows: { label: string; value: string }[] = [
    { label: "Parcel / tax ID", value: contract.parcelTaxId },
    { label: "County", value: contract.county },
    { label: "Year built", value: contract.yearBuilt },
    { label: "Renovated", value: contract.yearRenovated },
    {
      label: "Buildings / floors",
      value:
        meaningful(contract.buildings) || meaningful(contract.floors)
          ? `${contract.buildings || "—"} / ${contract.floors || "—"}`
          : "",
    },
    { label: "Gross SF", value: contract.grossSf },
    { label: "Parking", value: contract.parkingSpaces },
    { label: "Zoning", value: contract.zoning },
    { label: "Amenities", value: contract.amenities },
    { label: "Lease structure", value: contract.camOrNnnStructure },
    { label: "Insurance", value: contract.insuranceRequirements },
    { label: "Preferred vendors", value: contract.preferredVendors },
    { label: "Special terms", value: contract.specialTerms },
    { label: "Notes", value: contract.notes },
  ].filter((r) => meaningful(r.value));

  async function handleAddTenant(e: FormEvent) {
    e.preventDefault();
    if (!form.unit.trim() || !form.name.trim()) {
      setSavedMsg("Unit and tenant name are required.");
      return;
    }
    try {
      await saveTenant({
        ...form,
        id: crypto.randomUUID(),
        propertyId: contract.id,
        propertyName: contract.propertyName,
        unit: form.unit.trim(),
        name: form.name.trim(),
      });
      setForm(emptyPropertyTenant(contract.id, contract.propertyName));
      setShowForm(false);
      setSavedMsg("Roster tenant saved to the shared team database.");
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err) {
      setSavedMsg(
        err instanceof Error ? err.message : "Could not save tenant."
      );
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to properties
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide opacity-55">
            Managed property
          </p>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            {contract.propertyName || "Untitled property"}
          </h1>
          <p className="mt-2 text-[var(--harbor-ink)]/65">
            {address || "No address"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline capitalize">
            {contract.propertyType}
          </span>
          {contract.exclusiveManagement && (
            <span className="badge badge-neutral">Exclusive management</span>
          )}
        </div>
      </div>

      <p className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 px-4 py-3 text-sm text-[var(--harbor-ink)]/70">
        {LIVE_TENANT_OCCUPANCY_HELPER} {VACANT_UNITS_HELPER} Monthly rent roll
        and outstanding A/R are derived from linked tenant and receivable
        records.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Current tenants" value={String(liveCurrentTenants)} />
        <Metric
          label="Total units"
          value={liveTotalUnits > 0 ? String(liveTotalUnits) : "—"}
        />
        <Metric label="Occupied units" value={String(liveOccupiedUnits)} />
        <Metric label="Vacant units" value={String(liveVacantUnits)} />
        <Metric label="Live occupancy" value={liveOccLabel} />
        <Metric
          label="Monthly rent roll"
          value={formatMetricCurrency(monthlyRentRoll, "$0")}
        />
        <Metric
          label="Outstanding A/R"
          value={formatMetricCurrency(outstandingAr, "$0")}
        />
      </div>

      {liveProp?.liveOccupancyPercent != null && (
        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--harbor-ink)]">
              Live occupancy
            </span>
            <span className="opacity-70">{liveOccLabel}</span>
          </div>
          <progress
            className="progress progress-info w-full"
            value={Math.min(100, Math.max(0, liveProp.liveOccupancyPercent))}
            max={100}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailBlock title="Management">
          <dl>
            <Row label="Owner" value={contract.ownerLegalName} />
            <Row label="Owner entity" value={contract.ownerEntityType} />
            <Row label="Owner contact" value={contract.ownerContactName} />
            <Row label="Owner email" value={contract.ownerEmail} />
            <Row label="Owner phone" value={contract.ownerPhone} />
            <Row label="Assigned manager" value={contract.assignedManager} />
            <Row label="Agreement start" value={contract.contractStartDate} />
            <Row
              label="Agreement end / renewal"
              value={
                [contract.contractEndDate, contract.renewalOptions]
                  .filter(Boolean)
                  .join(" · ") || ""
              }
            />
            <Row label="Fee structure" value={feeLabel} />
          </dl>
        </DetailBlock>

        <DetailBlock title="Tenant activity">
          <p className="mb-3 text-sm text-[var(--harbor-ink)]/65">
            Linked management tenants for this property.{" "}
            {linkedDelinquent} delinquent · {linkedExpiring90} leases expiring
            within 90 days.
          </p>
          {currentLinked.length === 0 ? (
            <p className="text-sm opacity-60">
              No current tenants uniquely linked to this property.
            </p>
          ) : (
            <ul className="divide-y divide-base-200">
              {currentLinked.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <Link
                    href={`/ops/tenant/${encodeURIComponent(t.id)}`}
                    className="font-medium text-[var(--harbor-mid)] underline-offset-2 hover:underline"
                  >
                    {t.name}
                  </Link>
                  <span className="text-xs opacity-70">
                    {t.unit || "No unit"} · {tenantCategoryLabel(t.category)}
                    {getPaymentStatus(t) === "late" || t.category === "past_due"
                      ? " · Delinquent"
                      : ""}
                    {isLeaseExpiringWithinDays(t, 90)
                      ? " · Expiring ≤90d"
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {rosterTenants.length === 0 && (
            <p className="mt-3 text-xs text-[var(--harbor-ink)]/55">
              {NO_PROPERTY_ROSTER_NOTE}
            </p>
          )}
        </DetailBlock>
      </div>

      <DetailBlock title="Occupied units">
        {occupiedRows.length === 0 ? (
          <p className="text-sm opacity-60">
            No occupied units identified from current tenant assignments.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Tenant</th>
                  <th>Lease status</th>
                  <th>Lease end</th>
                  <th>Delinquency</th>
                </tr>
              </thead>
              <tbody>
                {occupiedRows.map((row) => (
                  <tr key={row.unitKey}>
                    <td className="font-medium">{row.unitLabel}</td>
                    <td>
                      <Link
                        href={`/ops/tenant/${encodeURIComponent(row.tenantId)}`}
                        className="text-[var(--harbor-mid)] underline-offset-2 hover:underline"
                      >
                        {row.tenantName}
                      </Link>
                    </td>
                    <td>{row.leaseStatus}</td>
                    <td>{formatOptionalLeaseDate(row.leaseEnd)}</td>
                    <td>{row.delinquent ? "Delinquent" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailBlock>

      <DetailBlock title="Vacant units">
        <p className="mb-2 text-sm">
          Calculated vacant units:{" "}
          <span className="font-semibold">{liveVacantUnits}</span>
        </p>
        {hasCompleteRoster && specificVacant.length > 0 ? (
          <ul className="list-inside list-disc text-sm">
            {specificVacant.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--harbor-ink)]/65">
            {NO_COMPLETE_UNIT_ROSTER_NOTE}
          </p>
        )}
        {occupiedRows.length > 0 && (
          <p className="mt-2 text-xs opacity-55">
            Known occupied identifiers:{" "}
            {occupiedRows.map((r) => r.unitLabel).join(", ")}
          </p>
        )}
      </DetailBlock>

      {rosterTenants.length > 0 && (
        <DetailBlock title="Property roster">
          <p className="mb-3 text-sm text-[var(--harbor-ink)]/65">
            Separate from the management Tenant master list. Not treated as a
            complete unit inventory.
          </p>
          <ul className="divide-y divide-base-200 text-sm">
            {rosterTenants.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 py-2">
                <span>
                  {t.unit} · {t.name}
                </span>
                <span className="opacity-60 capitalize">{t.status}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-ghost btn-xs mt-3 gap-1"
            onClick={() => setShowForm((v) => !v)}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {showForm ? "Hide form" : "Add roster tenant"}
          </button>
        </DetailBlock>
      )}

      {rosterTenants.length === 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            className="btn btn-ghost btn-xs gap-1"
            onClick={() => setShowForm((v) => !v)}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {showForm ? "Hide form" : "Add property roster tenant"}
          </button>
          {loading && <span className="opacity-55">Loading roster…</span>}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleAddTenant}
          className="grid gap-2 rounded-xl border border-base-300 bg-white/80 p-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input
            className="input input-bordered input-sm"
            placeholder="Unit"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            required
          />
          <input
            className="input input-bordered input-sm"
            placeholder="Tenant name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <button type="submit" className="btn btn-neutral btn-sm">
            Save roster row
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {savedMsg && <p className="text-sm text-emerald-800">{savedMsg}</p>}

      {assetRows.length > 0 && (
        <DetailBlock title="Optional asset details">
          <dl>
            {assetRows.map((r) => (
              <Row key={r.label} label={r.label} value={r.value} />
            ))}
          </dl>
        </DetailBlock>
      )}
    </div>
  );
}
