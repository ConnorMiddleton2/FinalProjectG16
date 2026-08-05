import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LogOut, Wrench, Users } from "lucide-react";
import { ownerLogout } from "@/app/owners/actions";
import { getCurrentOwner } from "@/lib/owner-auth";
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

  const [tenants, workOrders] = await Promise.all([
    getTenantsForProperty(property),
    getWorkOrdersForProperty(property),
  ]);

  const openOrders = workOrders.filter((w) => w.status !== "completed");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Owner property</p>
          </div>
          <form action={ownerLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <Link
          href="/owners/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            {property.propertyName}
          </h1>
          <p className="mt-2 text-[var(--harbor-ink)]/65">
            {[property.streetAddress, property.city, property.state, property.zip]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Type", property.propertyType],
            ["Rentable SF", property.rentableSf || "—"],
            ["Units / suites", property.unitsSuites || "—"],
            ["Occupancy", property.occupancyPercent ? `${property.occupancyPercent}%` : "—"],
            ["Tenants", property.tenantCount || String(tenants.length) || "—"],
            ["Monthly rent roll", property.monthlyRentRoll ? `$${property.monthlyRentRoll}` : "—"],
            ["AR balance", property.arBalance ? `$${property.arBalance}` : "—"],
            ["Mgmt fee", ownerFacingFeeSummary(property)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide opacity-55">{label}</p>
              <p className="mt-1 font-semibold capitalize text-[var(--harbor-ink)]">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
          <h2 className="font-semibold text-[var(--harbor-ink)]">Engagement</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="opacity-55">Owner entity</dt>
              <dd className="font-medium">{property.ownerLegalName || "—"}</dd>
            </div>
            <div>
              <dt className="opacity-55">Assigned manager</dt>
              <dd className="font-medium">{property.assignedManager || "—"}</dd>
            </div>
            <div>
              <dt className="opacity-55">Contract start</dt>
              <dd className="font-medium">{property.contractStartDate || "—"}</dd>
            </div>
            <div>
              <dt className="opacity-55">Contract end</dt>
              <dd className="font-medium">{property.contractEndDate || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--harbor-mid)]" />
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              Tenant roster
            </h2>
          </div>
          {tenants.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 p-5 text-sm opacity-60">
              No tenant roster linked to this property yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm">
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
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              Maintenance ({openOrders.length} open)
            </h2>
          </div>
          <p className="text-sm text-[var(--harbor-ink)]/55">
            Read-only view of work orders at this property. Vendor contract terms
            and internal staff notes are not shown.
          </p>
          {workOrders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 p-5 text-sm opacity-60">
              No work orders matched to this property.
            </p>
          ) : (
            <ul className="space-y-3">
              {workOrders.map((wo) => (
                <li
                  key={wo.id}
                  className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--harbor-ink)]">
                        {wo.title}
                      </p>
                      <p className="text-sm opacity-60">
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
    </div>
  );
}
