import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FilePlus2,
  KeyRound,
} from "lucide-react";
import { OwnerChangePasswordForm } from "@/components/OwnerChangePasswordForm";
import { OwnerPortalHeader } from "@/components/OwnerPortalHeader";
import { getCurrentOwner } from "@/lib/owner-auth";
import { getPendingApprovalsForOwner } from "@/lib/owner-approvals";
import {
  ensureDemoOwnerProperty,
  getPropertiesForOwner,
  ownerFacingFeeSummary,
} from "@/lib/owner-properties";

export default async function OwnerDashboardPage() {
  const owner = await getCurrentOwner();
  if (!owner) {
    redirect("/owners");
  }

  await ensureDemoOwnerProperty(owner);
  const properties = await getPropertiesForOwner(owner);
  const pendingApprovals = await getPendingApprovalsForOwner(owner.email);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <OwnerPortalHeader
        subtitle="Owner dashboard"
        pendingApprovals={pendingApprovals.length}
      />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Welcome
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Welcome, {owner.fullName}
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Portfolio overview for properties Harborline manages on your behalf.
            Review contracts, CapEx approvals, and account security here.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/owners/dashboard/contracts"
              className="btn btn-neutral btn-sm"
            >
              View management contracts
            </Link>
            <Link
              href="/owners/dashboard/approvals"
              className="btn btn-outline btn-sm"
            >
              Expenditure approvals
            </Link>
          </div>
        </div>

        {owner.mustChangePassword ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-amber-900">
              <KeyRound className="h-5 w-5" />
              <h2 className="font-semibold">Change your temporary password</h2>
            </div>
            <p className="mb-4 text-sm text-amber-900/80">
              Your account was provisioned with a temporary password. Set a new
              one before continuing day-to-day use.
            </p>
            <OwnerChangePasswordForm />
          </div>
        ) : null}

        {pendingApprovals.length > 0 ? (
          <div className="rounded-2xl border border-[var(--harbor-deep)]/15 bg-white/90 p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--harbor-ink)]">
              Action needed
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
              {pendingApprovals.length} expenditure
              {pendingApprovals.length === 1 ? "" : "s"} waiting for your
              approval.
            </p>
            <Link
              href="/owners/dashboard/approvals"
              className="btn btn-neutral btn-sm mt-3"
            >
              Review approvals
            </Link>
          </div>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--harbor-mid)]">
            <Building2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              Current properties
            </h2>
          </div>

          {properties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 p-6">
              <p className="text-sm text-[var(--harbor-ink)]/55">
                No managed properties are linked to your account yet. When
                Harborline approves your application or acquires a management
                contract under your email, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {properties.map((property) => (
                <Link
                  key={property.id}
                  href={`/owners/dashboard/properties/${property.id}`}
                  className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm transition hover:border-[var(--harbor-mid)]/40"
                >
                  <h3 className="text-lg font-semibold text-[var(--harbor-ink)]">
                    {property.propertyName || "Untitled property"}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                    {[property.streetAddress, property.city, property.state]
                      .filter(Boolean)
                      .join(", ") || "Address pending"}
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="opacity-55">Type</dt>
                      <dd className="font-medium capitalize">
                        {property.propertyType}
                      </dd>
                    </div>
                    <div>
                      <dt className="opacity-55">Occupancy</dt>
                      <dd className="font-medium">
                        {property.occupancyPercent
                          ? `${property.occupancyPercent}%`
                          : "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="opacity-55">Management fee</dt>
                      <dd className="font-medium">
                        {ownerFacingFeeSummary(property)}
                      </dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 p-6">
          <div className="flex items-center gap-2 text-[var(--harbor-mid)]">
            <FilePlus2 className="h-5 w-5" />
            <h2 className="font-semibold text-[var(--harbor-ink)]">
              Submit asset for management
            </h2>
          </div>
          <p className="mt-3 text-sm text-[var(--harbor-ink)]/55">
            Need Harborline to take on another property? Use{" "}
            <Link href="/owners" className="link link-primary">
              Apply for access
            </Link>{" "}
            with additional property details, or ask your property manager to
            acquire a management contract under {owner.email}.
          </p>
        </section>

        {!owner.mustChangePassword ? (
          <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-[var(--harbor-ink)]">
              Account security
            </h2>
            <OwnerChangePasswordForm />
          </section>
        ) : null}
      </main>
    </div>
  );
}
