"use client";

import {
  ArrowLeft,
  Building2,
  Percent,
  Users,
} from "lucide-react";
import {
  feeStructureLabel,
  getPropertyTenants,
  type ManagementContractDraft,
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
  const tenants = getPropertyTenants(contract);
  const activeTenants = tenants.filter((t) => t.status !== "vacant").length;
  const vacantTenants = tenants.filter((t) => t.status === "vacant").length;
  const address = [
    contract.streetAddress,
    [contract.city, contract.state].filter(Boolean).join(", "),
    contract.zip,
  ]
    .filter(Boolean)
    .join(" · ");

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
            contract.tenantCount ||
            (activeTenants ? String(activeTenants) : "—")
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
        <div className="mb-3 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1 opacity-70">
            <Users className="h-4 w-4" />
            {activeTenants} occupied
          </span>
          <span className="inline-flex items-center gap-1 opacity-70">
            <Building2 className="h-4 w-4" />
            {vacantTenants} vacant shown
          </span>
          <span className="inline-flex items-center gap-1 opacity-70">
            <Percent className="h-4 w-4" />
            {contract.occupancyPercent
              ? `${contract.occupancyPercent}% occupancy`
              : "Occupancy not set"}
          </span>
        </div>

        {tenants.length === 0 ? (
          <p className="text-sm opacity-60">
            No tenants on file yet. Add tenant count and occupancy on intake to
            generate a starter roster, or save tenants with the property later.
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
