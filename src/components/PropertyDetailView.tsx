"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Percent,
  PlusCircle,
  Users,
} from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  emptyPropertyTenant,
  feeStructureLabel,
  type ManagementContractDraft,
  type SharedPropertyTenant,
} from "@/lib/management-contract";

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-base-200 py-2 text-sm last:border-0">
      <dt className="opacity-60">{label}</dt>
      <dd className="font-medium text-[var(--harbor-ink)]">{value || "—"}</dd>
    </div>
  );
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

  const tenants = useMemo(
    () => allTenants.filter((t) => t.propertyId === contract.id),
    [allTenants, contract.id]
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() =>
    emptyPropertyTenant(contract.id, contract.propertyName)
  );
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const activeTenants = tenants.filter((t) => t.status !== "vacant").length;
  const vacantTenants = tenants.filter((t) => t.status === "vacant").length;
  const address = [
    contract.streetAddress,
    [contract.city, contract.state].filter(Boolean).join(", "),
    contract.zip,
  ]
    .filter(Boolean)
    .join(" · ");

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
      setSavedMsg("Tenant saved to the shared team database.");
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
          <p className="mt-2 text-[var(--harbor-ink)]/65">{address || "No address"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline capitalize">
            {contract.propertyType}
          </span>
          {contract.exclusiveManagement && (
            <span className="badge badge-neutral">Exclusive</span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Occupancy"
          value={
            contract.occupancyPercent
              ? `${contract.occupancyPercent}%`
              : "—"
          }
        />
        <Metric
          label="Tenants"
          value={
            String(activeTenants || contract.tenantCount || "—")
          }
        />
        <Metric
          label="Rentable SF"
          value={contract.rentableSf ? `${contract.rentableSf}` : "—"}
        />
        <Metric
          label="Monthly rent roll"
          value={
            contract.monthlyRentRoll
              ? `$${Number(contract.monthlyRentRoll).toLocaleString()}`
              : "—"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailBlock title="Asset details">
          <dl>
            <Row label="Parcel / tax ID" value={contract.parcelTaxId} />
            <Row label="County" value={contract.county} />
            <Row label="Year built" value={contract.yearBuilt} />
            <Row label="Renovated" value={contract.yearRenovated} />
            <Row label="Buildings / floors" value={`${contract.buildings || "—"} / ${contract.floors || "—"}`} />
            <Row label="Units / suites" value={contract.unitsSuites} />
            <Row label="Gross SF" value={contract.grossSf} />
            <Row label="Parking" value={contract.parkingSpaces} />
            <Row label="Zoning" value={contract.zoning} />
            <Row label="Amenities" value={contract.amenities} />
          </dl>
        </DetailBlock>

        <DetailBlock title="Owner & management">
          <dl>
            <Row label="Owner" value={contract.ownerLegalName} />
            <Row label="Entity" value={contract.ownerEntityType} />
            <Row label="Contact" value={contract.ownerContactName} />
            <Row label="Email" value={contract.ownerEmail} />
            <Row label="Phone" value={contract.ownerPhone} />
            <Row
              label="Contract term"
              value={[contract.contractStartDate, contract.contractEndDate]
                .filter(Boolean)
                .join(" → ")}
            />
            <Row label="Renewals" value={contract.renewalOptions} />
            <Row
              label="Fee structure"
              value={feeStructureLabel(contract.feeStructure)}
            />
            <Row
              label="Mgmt fee"
              value={
                contract.feePercent
                  ? `${contract.feePercent}%`
                  : contract.feeFlatAmount
                    ? `$${contract.feeFlatAmount}`
                    : ""
              }
            />
            <Row label="Assigned manager" value={contract.assignedManager} />
          </dl>
        </DetailBlock>
      </div>

      <DetailBlock title="Operating metrics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label="Annual GPR"
            value={
              contract.annualGpr
                ? `$${Number(contract.annualGpr).toLocaleString()}`
                : "—"
            }
          />
          <Metric
            label="OpEx"
            value={
              contract.annualOperatingExpenses
                ? `$${Number(contract.annualOperatingExpenses).toLocaleString()}`
                : "—"
            }
          />
          <Metric
            label="NOI"
            value={
              contract.annualNoi
                ? `$${Number(contract.annualNoi).toLocaleString()}`
                : "—"
            }
          />
          <Metric
            label="Cap rate"
            value={
              contract.capRatePercent ? `${contract.capRatePercent}%` : "—"
            }
          />
          <Metric
            label="AR / arrears"
            value={
              contract.arBalance
                ? `$${Number(contract.arBalance).toLocaleString()}`
                : "—"
            }
          />
          <Metric
            label="Deposits held"
            value={
              contract.securityDepositsHeld
                ? `$${Number(contract.securityDepositsHeld).toLocaleString()}`
                : "—"
            }
          />
          <Metric
            label="Reserves"
            value={
              contract.reserveBalance
                ? `$${Number(contract.reserveBalance).toLocaleString()}`
                : "—"
            }
          />
          <Metric label="Lease structure" value={contract.camOrNnnStructure} />
          <Metric label="Insurance" value={contract.insuranceRequirements} />
        </div>
        {contract.majorLeaseExpirations ? (
          <p className="mt-4 text-sm text-[var(--harbor-ink)]/70">
            <span className="font-medium">Major lease expirations: </span>
            {contract.majorLeaseExpirations}
          </p>
        ) : null}
      </DetailBlock>

      <DetailBlock title="Tenant roster">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 opacity-70">
            <Users className="h-4 w-4" />
            {activeTenants} occupied
          </span>
          <span className="inline-flex items-center gap-1 opacity-70">
            <Building2 className="h-4 w-4" />
            {vacantTenants} vacant
          </span>
          <span className="inline-flex items-center gap-1 opacity-70">
            <Percent className="h-4 w-4" />
            {contract.occupancyPercent
              ? `${contract.occupancyPercent}% occupancy`
              : "Occupancy not set"}
          </span>
          <button
            type="button"
            className="btn btn-neutral btn-xs gap-1 ml-auto"
            onClick={() => setShowForm((v) => !v)}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {showForm ? "Hide" : "Add tenant"}
          </button>
        </div>

        {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
        {savedMsg && (
          <p className="mb-2 text-sm text-emerald-800">{savedMsg}</p>
        )}
        {loading && (
          <p className="mb-2 text-sm opacity-60">Loading shared roster…</p>
        )}

        {showForm && (
          <form
            onSubmit={handleAddTenant}
            className="mb-4 grid gap-2 rounded-xl border border-base-300 bg-base-100 p-3 sm:grid-cols-2 lg:grid-cols-3"
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
            <input
              className="input input-bordered input-sm"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              className="input input-bordered input-sm"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              type="date"
              className="input input-bordered input-sm"
              value={form.leaseStart}
              onChange={(e) =>
                setForm((f) => ({ ...f, leaseStart: e.target.value }))
              }
            />
            <input
              type="date"
              className="input input-bordered input-sm"
              value={form.leaseEnd}
              onChange={(e) =>
                setForm((f) => ({ ...f, leaseEnd: e.target.value }))
              }
            />
            <input
              className="input input-bordered input-sm"
              placeholder="SF"
              value={form.sqft}
              onChange={(e) => setForm((f) => ({ ...f, sqft: e.target.value }))}
            />
            <input
              className="input input-bordered input-sm"
              placeholder="Rent / mo"
              value={form.monthlyRent}
              onChange={(e) =>
                setForm((f) => ({ ...f, monthlyRent: e.target.value }))
              }
            />
            <select
              className="select select-bordered select-sm"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as SharedPropertyTenant["status"],
                }))
              }
            >
              <option value="active">active</option>
              <option value="notice">notice</option>
              <option value="vacant">vacant</option>
            </select>
            <button type="submit" className="btn btn-neutral btn-sm">
              Save to shared database
            </button>
          </form>
        )}

        {tenants.length === 0 ? (
          <p className="text-sm opacity-60">
            No tenants on the shared roster yet. Add one so classmates see it.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-base-300">
            <table className="table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Tenant</th>
                  <th>Lease</th>
                  <th>SF</th>
                  <th>Rent / mo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="font-medium">{t.unit}</td>
                    <td>
                      <p>{t.name}</p>
                      {(t.email || t.phone) && (
                        <p className="text-xs opacity-60">
                          {[t.email, t.phone].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="text-sm">
                      {t.leaseStart || t.leaseEnd
                        ? `${t.leaseStart || "—"} → ${t.leaseEnd || "—"}`
                        : "—"}
                    </td>
                    <td>{t.sqft || "—"}</td>
                    <td>
                      {t.monthlyRent
                        ? `$${Number(t.monthlyRent).toLocaleString()}`
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          t.status === "active"
                            ? "badge-success"
                            : t.status === "notice"
                              ? "badge-warning"
                              : "badge-ghost"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailBlock>

      {(contract.knownIssues ||
        contract.preferredVendors ||
        contract.specialTerms ||
        contract.notes) && (
        <DetailBlock title="Operations notes">
          <dl>
            <Row label="Known issues" value={contract.knownIssues} />
            <Row label="Preferred vendors" value={contract.preferredVendors} />
            <Row label="Special terms" value={contract.specialTerms} />
            <Row label="Notes" value={contract.notes} />
          </dl>
        </DetailBlock>
      )}
    </div>
  );
}
