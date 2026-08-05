import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Wrench, Users } from "lucide-react";
import { OwnerEmptyState } from "@/components/OwnerEmptyState";
import { OwnerPortalHeader } from "@/components/OwnerPortalHeader";
import { OwnerShell } from "@/components/OwnerShell";
import { getCurrentOwner } from "@/lib/owner-auth";
import { getPendingApprovalsForOwner } from "@/lib/owner-approvals";
import { categoryLabel, statusLabel } from "@/lib/maintenance";
import {
  getOwnerPropertyById,
  getTenantsForProperty,
  getWorkOrdersForProperty,
  ownerFacingFeeSummary,
} from "@/lib/owner-properties";

export default async function OwnerPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const owner = await getCurrentOwner();
  if (!owner) {
    redirect("/owners");
  }

  const { id } = await params;
  const property = await getOwnerPropertyById(owner, id);
  if (!property) {
    notFound();
  }

  const [tenants, workOrders, pendingApprovals] = await Promise.all([
    getTenantsForProperty(property),
    getWorkOrdersForProperty(property),
    getPendingApprovalsForOwner(owner.email),
  ]);

  const openOrders = workOrders.filter((w) => w.status !== "completed");

  return (
    <OwnerShell
      header={
        <OwnerPortalHeader
          subtitle="Owner property"
          pendingApprovals={pendingApprovals.length}
        />
      }
    >
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/owners/dashboard"
          className="owner-muted inline-flex items-center gap-2 text-sm transition hover:text-[var(--harbor-ink)] welcome-rise"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Link>

        <div className="welcome-rise-delay">
          <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
            {property.propertyName}
          </h1>
          <p className="owner-muted mt-2">
            {[property.streetAddress, property.city, property.state, property.zip]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>

        <section className="owner-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Type", property.propertyType],
            ["Rentable SF", property.rentableSf || "—"],
            ["Units / suites", property.unitsSuites || "—"],
            [
              "Occupancy",
              property.occupancyPercent
                ? `${property.occupancyPercent}%`
                : "—",
            ],
            ["Tenants", property.tenantCount || String(tenants.length) || "—"],
            [
              "Monthly rent roll",
              property.monthlyRentRoll ? `$${property.monthlyRentRoll}` : "—",
            ],
            ["AR balance", property.arBalance ? `$${property.arBalance}` : "—"],
            ["Mgmt fee", ownerFacingFeeSummary(property)],
          ].map(([label, value]) => (
            <div key={label} className="owner-card p-4">
              <p className="text-xs uppercase tracking-wide opacity-55">{label}</p>
              <p className="mt-1 font-semibold capitalize text-[var(--harbor-ink)]">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="owner-card p-5">
          <h2 className="owner-section-title">Engagement</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide opacity-55">
                Owner entity
              </dt>
              <dd className="mt-0.5 font-medium">
                {property.ownerLegalName || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide opacity-55">
                Assigned manager
              </dt>
              <dd className="mt-0.5 font-medium">
                {property.assignedManager || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide opacity-55">
                Contract start
              </dt>
              <dd className="mt-0.5 font-medium">
                {property.contractStartDate || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide opacity-55">
                Contract end
              </dt>
              <dd className="mt-0.5 font-medium">
                {property.contractEndDate || "—"}
              </dd>
            </div>
          </dl>
          <Link
            href={`/owners/dashboard/contracts/${property.id}`}
            className="owner-btn-secondary owner-btn-secondary-sm mt-4"
          >
            View full management contract
          </Link>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--harbor-mid)]" />
            <h2 className="owner-section-title">Tenant roster</h2>
          </div>
          {tenants.length === 0 ? (
            <OwnerEmptyState
              icon={Users}
              title="No tenant roster yet"
              description="Tenants linked to this property will appear here once Harborline adds them."
            />
          ) : (
            <div className="owner-card overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Unit</th>
                    <th>Lease</th>
                    <th>Rent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td className="font-medium">{t.name}</td>
                      <td>{t.unit || "—"}</td>
                      <td className="text-sm">
                        {t.leaseStart || "—"} → {t.leaseEnd || "—"}
                      </td>
                      <td>{t.monthlyRent ? `$${t.monthlyRent}` : "—"}</td>
                      <td className="capitalize">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-[var(--harbor-mid)]" />
            <h2 className="owner-section-title">
              Maintenance ({openOrders.length} open)
            </h2>
          </div>
          <p className="owner-muted text-sm">
            Read-only view of work orders at this property. Vendor contract terms
            and internal staff notes are not shown.
          </p>
          {workOrders.length === 0 ? (
            <OwnerEmptyState
              icon={Wrench}
              title="No work orders matched"
              description="Maintenance activity for this property will show here when Harborline logs work orders against it."
            />
          ) : (
            <ul className="owner-stagger space-y-3">
              {workOrders.map((wo) => (
                <li key={wo.id} className="owner-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--harbor-ink)]">
                        {wo.title}
                      </p>
                      <p className="owner-muted text-sm">
                        {categoryLabel(wo.category)} · Unit {wo.unit || "—"}
                      </p>
                    </div>
                    <span className="badge badge-outline">
                      {statusLabel(wo.status)}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="opacity-55">Vendor</dt>
                      <dd>{wo.vendorName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="opacity-55">Estimated</dt>
                      <dd>
                        {wo.estimatedCost ? `$${wo.estimatedCost}` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="opacity-55">Actual</dt>
                      <dd>{wo.actualCost ? `$${wo.actualCost}` : "—"}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </OwnerShell>
  );
}
