"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CircleDollarSign,
} from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  formatPropertyAddress,
} from "@/lib/management-contract";
import type { WorkOrder } from "@/lib/maintenance";
import {
  AMOUNT_DUE_HELPER,
  MANAGEMENT_REVIEW_DAYS,
  buildTenantCollectionsSnapshot,
  formatIsoDisplay,
  MISSING_TENANT_CONTACT_MESSAGE,
  type CollectionsAccountState,
  type CollectionsNotice,
  type ManagementAlert,
} from "@/lib/collections";
import {
  getRentPeriodLabel,
  tenantAmountDue,
  type RentalReceivable,
} from "@/lib/rental-receivables";
import {
  ManagedPropertyLink,
  resolveUniqueManagedPropertyId,
} from "@/components/ManagedPropertyLink";
import {
  formatCurrency,
  formatOptionalLeaseDate,
  formatOptionalRent,
  getLeaseEnd,
  getLeaseStart,
  getMonthlyRent,
  getPaymentMethod,
  getPaymentStatus,
  paymentStatusLabel,
  tenantCategoryLabel,
  type TenantRecord,
} from "@/lib/tenants";
import { paymentMethodLabel } from "@/lib/payment-methods";
import {
  daysRemainingOnLease,
  deriveTenantActivity,
  formatDaysRemaining,
  leaseSummaryText,
  matchWorkOrdersForTenant,
  tenantWarnings,
} from "@/lib/tenant-profile";
import { TenantCollectionsSection } from "@/components/TenantCollectionsSection";

type Props = {
  tenantId: string;
};

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : "border-[var(--harbor-deep)]/10 bg-white/90";
  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide opacity-55">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--harbor-ink)]">
        {value}
      </p>
    </div>
  );
}

export function TenantProfileView({ tenantId }: Props) {
  const {
    items: tenants,
    loading: tenantsLoading,
    error: tenantsError,
  } = useSharedCollection<TenantRecord>(COLLECTIONS.tenants);
  const { items: properties } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const { items: workOrders } = useSharedCollection<WorkOrder>(
    COLLECTIONS.workOrders
  );
  const { items: receivables } = useSharedCollection<RentalReceivable>(
    COLLECTIONS.rentalReceivables
  );
  const { items: notices } = useSharedCollection<CollectionsNotice>(
    COLLECTIONS.collectionsNotices
  );
  const { items: accountStates } =
    useSharedCollection<CollectionsAccountState>(
      COLLECTIONS.collectionsAccountState
    );
  const { items: alerts } = useSharedCollection<ManagementAlert>(
    COLLECTIONS.managementAlerts
  );

  const tenant = useMemo(
    () => tenants.find((t) => t.id === tenantId) ?? null,
    [tenants, tenantId]
  );

  const property = useMemo(() => {
    if (!tenant) return null;
    const uniqueId = resolveUniqueManagedPropertyId(
      properties,
      tenant.propertyLeased
    );
    if (!uniqueId) return null;
    return properties.find((p) => p.id === uniqueId) ?? null;
  }, [properties, tenant]);

  const relatedOrders = useMemo(
    () => (tenant ? matchWorkOrdersForTenant(workOrders, tenant) : []),
    [workOrders, tenant]
  );

  const activity = useMemo(
    () =>
      tenant ? deriveTenantActivity(tenant, property, relatedOrders) : [],
    [tenant, property, relatedOrders]
  );

  const collectionsSnap = useMemo(
    () =>
      tenant
        ? buildTenantCollectionsSnapshot(
            tenant,
            receivables,
            notices,
            accountStates,
            alerts
          )
        : null,
    [tenant, receivables, notices, accountStates, alerts]
  );

  if (tenantsLoading) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--harbor-deep)]/20 bg-white/70 px-4 py-10 text-center text-sm">
        <span className="loading loading-spinner loading-sm mr-2" />
        Loading tenant profile…
      </div>
    );
  }

  if (tenantsError) {
    return (
      <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
        <p className="font-semibold">Could not load tenant profile</p>
        <p className="mt-1">{tenantsError}</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Link
          href="/ops/tenant"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tenant master list
        </Link>
        <div className="rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 px-6 py-12 text-center">
          <p className="font-medium text-[var(--harbor-ink)]">Tenant not found</p>
          <p className="mt-1 text-sm opacity-60">
            This record may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const payment = getPaymentStatus(tenant);
  const amountDue = tenantAmountDue(tenant.id, receivables);
  const rent = getMonthlyRent(tenant);
  const daysLeft = daysRemainingOnLease(tenant);
  const warnings = tenantWarnings(tenant);
  const hasArOverdue =
    !!collectionsSnap &&
    collectionsSnap.overdueRentBalance > 0 &&
    collectionsSnap.daysOverdue >= 1;
  const unpaidPeriod =
    hasArOverdue && collectionsSnap.qualifyingObligations[0]
      ? getRentPeriodLabel(collectionsSnap.qualifyingObligations[0].receivable)
      : "—";
  const reviewStatusLabel = !collectionsSnap
    ? "—"
    : collectionsSnap.openAlert
      ? `Open alert (${collectionsSnap.openAlert.reviewStatus.replace(/_/g, " ")})`
      : collectionsSnap.managementReviewRequired ||
          collectionsSnap.daysOverdue >= 90
        ? "Required (internal)"
        : "Not required";
  const propertyId = property?.id ?? null;

  return (
    <div className="space-y-6">
      <Link
        href="/ops/tenant"
        className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tenant master list
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide opacity-55">
            Management tenant profile
          </p>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            {tenant.name}
          </h1>
          <p className="mt-2 text-[var(--harbor-ink)]/65">
            <ManagedPropertyLink
              propertyName={tenant.propertyLeased}
              propertyId={propertyId}
            />
            {tenant.unit ? ` · ${tenant.unit}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-outline capitalize">
            {tenantCategoryLabel(tenant.category)}
          </span>
          <span className="badge badge-outline capitalize">
            {paymentStatusLabel(payment)}
          </span>
          <span
            className={`badge capitalize ${
              getPaymentMethod(tenant) === "ach"
                ? "badge-success badge-outline"
                : "badge-ghost"
            }`}
          >
            {paymentMethodLabel(getPaymentMethod(tenant))}
          </span>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div
              key={w.id}
              className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                w.tone === "danger"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{w.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label="Amount due"
          value={formatCurrency(amountDue)}
          tone={amountDue > 0 ? "danger" : "default"}
        />
        <SummaryCard
          label="Monthly rent"
          value={formatOptionalRent(rent)}
        />
        <SummaryCard
          label="Days remaining on lease"
          value={formatDaysRemaining(daysLeft)}
          tone={
            daysLeft != null && daysLeft <= 90 && daysLeft >= 0
              ? "warn"
              : daysLeft != null && daysLeft < 0
                ? "danger"
                : "default"
          }
        />
        <SummaryCard
          label="Payment status"
          value={paymentStatusLabel(payment)}
          tone={
            payment === "late"
              ? "danger"
              : payment === "partial"
                ? "warn"
                : "default"
          }
        />
        <SummaryCard
          label="Payment method"
          value={paymentMethodLabel(getPaymentMethod(tenant))}
        />
        <SummaryCard
          label="Lease status"
          value={tenantCategoryLabel(tenant.category)}
        />
      </div>

      <p className="text-sm text-[var(--harbor-ink)]/70">
        {AMOUNT_DUE_HELPER}
      </p>

      {hasArOverdue && collectionsSnap && (
        <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50/60 p-5 shadow-sm">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--harbor-ink)]">
              <CircleDollarSign className="h-5 w-5 text-red-700" />
              Overdue rent (collections)
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
              Qualifying unpaid base rent used for days late, 30/60/90 aging,
              weekly notices, and automatic 60-day management review. This is
              the overdue portion of Amount due, not a second master-list
              balance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Overdue rent"
              value={formatCurrency(collectionsSnap.overdueRentBalance)}
              tone="danger"
            />
            <SummaryCard
              label="Days late"
              value={String(collectionsSnap.daysOverdue)}
              tone={
                collectionsSnap.daysOverdue >= MANAGEMENT_REVIEW_DAYS
                  ? "danger"
                  : "warn"
              }
            />
            <SummaryCard
              label="Oldest unpaid rent due date"
              value={formatIsoDisplay(collectionsSnap.oldestUnpaidDueDate)}
              tone="danger"
            />
            <SummaryCard
              label="Unpaid rent period"
              value={unpaidPeriod}
              tone="warn"
            />
            <SummaryCard
              label="Next scheduled notice"
              value={
                collectionsSnap.nextNoticeDate
                  ? formatIsoDisplay(collectionsSnap.nextNoticeDate)
                  : "—"
              }
            />
            <SummaryCard
              label="Collections stage"
              value={collectionsSnap.stageLabel}
              tone={
                collectionsSnap.stage === "days_90_review" ? "danger" : "warn"
              }
            />
            <SummaryCard
              label="Management review status"
              value={reviewStatusLabel}
              tone={
                collectionsSnap.managementReviewRequired ||
                collectionsSnap.daysOverdue >= 90
                  ? "danger"
                  : "default"
              }
            />
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--harbor-ink)]">
            <CalendarClock className="h-5 w-5 text-[var(--harbor-mid)]" />
            Current lease summary
          </h2>
          <p className="mt-3 text-sm text-[var(--harbor-ink)]/75">
            {leaseSummaryText(tenant)}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-base-200 py-2">
              <dt className="opacity-60">Lease start</dt>
              <dd className="font-medium">
                {formatOptionalLeaseDate(getLeaseStart(tenant))}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-base-200 py-2">
              <dt className="opacity-60">Lease end</dt>
              <dd className="font-medium">
                {formatOptionalLeaseDate(getLeaseEnd(tenant))}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-base-200 py-2">
              <dt className="opacity-60">Unit / suite</dt>
              <dd className="font-medium">{tenant.unit || "Not entered"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--harbor-ink)]">
            <Building2 className="h-5 w-5 text-[var(--harbor-mid)]" />
            Property summary
          </h2>
          {property ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-base-200 py-2">
                <dt className="opacity-60">Managed property</dt>
                <dd className="font-medium">
                  <ManagedPropertyLink
                    propertyName={property.propertyName}
                    propertyId={property.id}
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-base-200 py-2">
                <dt className="opacity-60">Address</dt>
                <dd className="max-w-[14rem] text-right font-medium">
                  {formatPropertyAddress(property) || "Not entered"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-base-200 py-2">
                <dt className="opacity-60">Owner</dt>
                <dd className="font-medium">
                  {property.ownerLegalName || "Not entered"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-base-200 py-2">
                <dt className="opacity-60">Property type</dt>
                <dd className="font-medium capitalize">
                  {property.propertyType}
                </dd>
              </div>
              <Link
                href={`/ops/properties/${encodeURIComponent(property.id)}`}
                className="btn btn-ghost btn-sm mt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
                aria-label={`Open property detail for ${property.propertyName}`}
              >
                Open property detail
              </Link>
            </dl>
          ) : (
            <p className="mt-3 text-sm opacity-60">
              No managed property record matches “{tenant.propertyLeased}”.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--harbor-ink)]">
            <CircleDollarSign className="h-5 w-5 text-[var(--harbor-mid)]" />
            Payment summary
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-base-200 py-2">
              <dt className="opacity-60">Status</dt>
              <dd className="font-medium capitalize">
                {paymentStatusLabel(payment)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-base-200 py-2">
              <dt className="opacity-60">Amount due</dt>
              <dd className="font-medium">{formatCurrency(amountDue)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-base-200 py-2">
              <dt className="opacity-60">Overdue rent</dt>
              <dd className="font-medium">
                {formatCurrency(collectionsSnap?.overdueRentBalance ?? 0)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="opacity-60">Monthly rent</dt>
              <dd className="font-medium">{formatOptionalRent(rent)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs opacity-55">
            Transaction history is not linked to this management tenant record.
            No payment processing is available here. {AMOUNT_DUE_HELPER}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Contact information
          </h2>
          <p className="mt-3 text-sm opacity-60">
            {MISSING_TENANT_CONTACT_MESSAGE}
          </p>
        </section>
      </div>

      <TenantCollectionsSection tenant={tenant} />

      <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
          Maintenance summary
        </h2>
        <p className="mt-1 text-xs opacity-55">
          Read-only work orders soft-matched by property (and unit when present).
          No maintenance entry from this screen.
        </p>
        {relatedOrders.length === 0 ? (
          <p className="mt-4 text-sm opacity-60">
            No connected maintenance records for this tenant’s property/unit.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {relatedOrders.slice(0, 6).map((wo) => (
              <li
                key={wo.id}
                className="rounded-lg border border-base-200 px-3 py-2 text-sm"
              >
                <p className="font-medium text-[var(--harbor-ink)]">{wo.title}</p>
                <p className="text-xs opacity-60">
                  {wo.status.replace("_", " ")} · {wo.category}
                  {wo.createdAt ? ` · ${wo.createdAt.slice(0, 10)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">Notes</h2>
        <p className="mt-3 text-sm opacity-60">
          No notes field is available on this management tenant record.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm opacity-60">
            No recent activity history is available yet.
          </p>
        ) : (
          <ol className="mt-4 space-y-3 border-l border-[var(--harbor-mid)]/30 pl-4">
            {activity.map((item) => (
              <li key={item.id} className="relative text-sm">
                <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-[var(--harbor-mid)]" />
                <p className="font-medium text-[var(--harbor-ink)]">
                  {item.label}
                </p>
                <p className="text-xs opacity-55">{item.date}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
