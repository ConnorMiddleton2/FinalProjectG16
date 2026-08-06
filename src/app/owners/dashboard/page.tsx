import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ClipboardList,
  FilePlus2,
  KeyRound,
} from "lucide-react";
import { OwnerChangePasswordForm } from "@/components/OwnerChangePasswordForm";
import { OwnerEmptyState } from "@/components/OwnerEmptyState";
import { OwnerPortalHeader } from "@/components/OwnerPortalHeader";
import { OwnerPropertyRevenuePanel } from "@/components/OwnerPropertyRevenuePanel";
import { OwnerBankActivityPanel } from "@/components/OwnerBankActivityPanel";
import { OwnerShell } from "@/components/OwnerShell";
import { getCurrentOwner, readOwnerApplications } from "@/lib/owner-auth";
import { getPendingApprovalsForOwner } from "@/lib/owner-approvals";
import { buildOwnerPortfolioFinancials } from "@/lib/owner-property-financials";
import {
  ensureDemoOwnerProperty,
  getPropertiesForOwner,
  ownerFacingFeeSummary,
} from "@/lib/owner-properties";

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function OwnerDashboardPage() {
  const owner = await getCurrentOwner();
  if (!owner) {
    redirect("/owners");
  }

  await ensureDemoOwnerProperty(owner);
  const properties = await getPropertiesForOwner(owner);
  const pendingApprovals = await getPendingApprovalsForOwner(owner.email);
  const financials = await buildOwnerPortfolioFinancials(owner, {
    trendMonths: 6,
  });
  const myApplications = (await readOwnerApplications())
    .filter((a) => a.email.toLowerCase() === owner.email.toLowerCase())
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const openApplications = myApplications.filter((a) =>
    ["pending", "needs_info", "awaiting_signature"].includes(a.status)
  );

  return (
    <OwnerShell
      header={
        <OwnerPortalHeader
          subtitle="Owner dashboard"
          pendingApprovals={pendingApprovals.length}
        />
      }
    >
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="owner-muted inline-flex items-center gap-2 text-sm transition hover:text-[var(--harbor-ink)] welcome-rise"
        >
          <ArrowLeft className="h-4 w-4" />
          Welcome
        </Link>

        <div className="welcome-rise-delay">
          <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
            Welcome, {owner.fullName}
          </h1>
          <p className="owner-muted mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
            Track management applications and assets already under Harborline
            contracts from this dashboard.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/owners/dashboard/apply"
              className="owner-btn-primary owner-btn-primary-sm"
            >
              Submit application
            </Link>
            <Link
              href="/owners/dashboard/contracts"
              className="owner-btn-secondary owner-btn-secondary-sm"
            >
              View management contracts
            </Link>
            <Link
              href="/owners/dashboard/approvals"
              className="owner-btn-secondary owner-btn-secondary-sm"
            >
              Expenditure approvals
            </Link>
          </div>
        </div>

        {owner.mustChangePassword ? (
          <div className="owner-card border-[color-mix(in_srgb,var(--harbor-glow)_55%,transparent)] bg-[color-mix(in_srgb,var(--harbor-glow)_16%,white)] p-5 welcome-rise">
            <div className="mb-3 flex items-center gap-2 text-[var(--harbor-ink)]">
              <KeyRound className="h-5 w-5" />
              <h2 className="font-semibold">Change your temporary password</h2>
            </div>
            <p className="owner-muted mb-4 text-sm">
              Your account was provisioned with a temporary password. Set a new
              one before continuing day-to-day use.
            </p>
            <OwnerChangePasswordForm />
          </div>
        ) : null}

        {pendingApprovals.length > 0 ? (
          <div className="owner-card border-[color-mix(in_srgb,var(--harbor-glow)_50%,transparent)] bg-[color-mix(in_srgb,var(--harbor-glow)_14%,white)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[var(--harbor-ink)]">
                    Action needed
                  </h2>
                  <span className="owner-badge-pulse badge badge-warning badge-sm">
                    {pendingApprovals.length}
                  </span>
                </div>
                <p className="owner-muted mt-1 text-sm">
                  {pendingApprovals.length} expenditure
                  {pendingApprovals.length === 1 ? "" : "s"} waiting for your
                  approval.
                </p>
              </div>
              <Link
                href="/owners/dashboard/approvals"
                className="owner-btn-primary owner-btn-primary-sm"
              >
                Review approvals
              </Link>
            </div>
          </div>
        ) : null}

        {properties.length > 0 ? (
          <OwnerPropertyRevenuePanel financials={financials} />
        ) : null}

        <OwnerBankActivityPanel owner={owner} />

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[var(--harbor-mid)]">
              <ClipboardList className="h-5 w-5" />
              <h2 className="owner-section-title">Your applications</h2>
              {openApplications.length > 0 ? (
                <span className="badge badge-warning badge-sm">
                  {openApplications.length} open
                </span>
              ) : null}
            </div>
            <Link
              href="/owners/dashboard/apply"
              className="text-sm font-semibold text-[var(--harbor-mid)] hover:underline"
            >
              New application
            </Link>
          </div>

          {myApplications.length === 0 ? (
            <OwnerEmptyState
              icon={ClipboardList}
              title="No applications yet"
              description="Submit a property for Harborline management. Pending applications appear here for you and for the management team."
              actionHref="/owners/dashboard/apply"
              actionLabel="Submit application"
            />
          ) : (
            <ul className="owner-stagger space-y-3">
              {myApplications.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/owners/status/${app.id}?email=${encodeURIComponent(owner.email)}`}
                    className="owner-card owner-card-interactive group flex items-start justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--harbor-ink)]">
                        {app.companyName || app.fullName}
                      </p>
                      <p className="owner-muted mt-1 text-sm capitalize">
                        {statusLabel(app.status)}
                        {" · "}
                        {app.properties.length} propert
                        {app.properties.length === 1 ? "y" : "ies"}
                        {app.contractId || app.contractSentAt
                          ? " · Contract ready to review"
                          : ""}
                      </p>
                      <p className="owner-muted mt-0.5 text-xs">
                        Submitted{" "}
                        {new Date(app.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[var(--harbor-mid)] opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--harbor-mid)]">
            <Building2 className="h-5 w-5" />
            <h2 className="owner-section-title">
              Assets under management contracts
            </h2>
          </div>

          {properties.length === 0 ? (
            <OwnerEmptyState
              icon={Building2}
              title="No managed assets yet"
              description="After management approves your application and the contract is signed, your properties appear here."
              actionHref="/owners/dashboard/apply"
              actionLabel="Submit application"
            />
          ) : (
            <div className="owner-stagger grid gap-4 sm:grid-cols-2">
              {properties.map((property) => (
                <Link
                  key={property.id}
                  href={`/owners/dashboard/properties/${property.id}`}
                  className="owner-card owner-card-interactive group p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-[var(--harbor-ink)]">
                        {property.propertyName || "Untitled property"}
                      </h3>
                      <p className="owner-muted mt-1 text-sm">
                        {[property.streetAddress, property.city, property.state]
                          .filter(Boolean)
                          .join(", ") || "Address pending"}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[var(--harbor-mid)] opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide opacity-55">
                        Type
                      </dt>
                      <dd className="mt-0.5 font-medium capitalize">
                        {property.propertyType}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide opacity-55">
                        Occupancy
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {property.occupancyPercent
                          ? `${property.occupancyPercent}%`
                          : "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-wide opacity-55">
                        Management fee
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {ownerFacingFeeSummary(property)}
                      </dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="owner-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="rounded-xl bg-[var(--harbor-ink)] p-2.5 text-[var(--harbor-sand)]">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--harbor-ink)]">
                Add another asset
              </h2>
              <p className="owner-muted mt-1 max-w-xl text-sm leading-relaxed">
                Submit additional properties for management review. Open
                applications stay visible above until approved or closed.
              </p>
            </div>
          </div>
          <Link
            href="/owners/dashboard/apply"
            className="owner-btn-secondary owner-btn-secondary-sm shrink-0"
          >
            Submit application
          </Link>
        </section>

        {!owner.mustChangePassword ? (
          <details className="owner-card group p-5">
            <summary className="cursor-pointer list-none font-semibold text-[var(--harbor-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                Account security
                <span className="owner-muted text-xs font-normal group-open:hidden">
                  Change password
                </span>
              </span>
            </summary>
            <div className="mt-4 border-t border-[var(--harbor-deep)]/10 pt-4">
              <OwnerChangePasswordForm />
            </div>
          </details>
        ) : null}
      </main>
    </OwnerShell>
  );
}
