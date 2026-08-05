import Link from "next/link";
import type { TenantDashboardData } from "@/lib/portal/dashboard-types";
import {
  maintenanceStatusClass,
  paymentStatusClass,
} from "@/lib/portal/dashboard-status";

type Props = {
  data: TenantDashboardData;
};

export function DashboardSections({ data }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <UpcomingPaymentSection payment={data.upcomingPayment} />
      <RecentPaymentsSection payments={data.recentPayments} />
      <ActiveMaintenanceSection requests={data.activeMaintenance} />
      <AnnouncementsSection announcements={data.announcements} />
      <LeaseSummarySection lease={data.lease} />
    </div>
  );
}

function SectionShell({
  title,
  href,
  linkLabel,
  children,
  className = "",
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <section
      className={`rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 shadow-sm ${className}`}
      aria-labelledby={headingId}
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id={headingId}
          className="text-lg font-semibold text-[var(--harbor-ink)]"
        >
          {title}
        </h2>
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-[var(--harbor-mid)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
        >
          {linkLabel}
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--harbor-deep)]/20 bg-[var(--harbor-sand)]/30 px-3 py-4 text-sm text-[var(--harbor-ink)]/60">
      {children}
    </p>
  );
}

function UpcomingPaymentSection({
  payment,
}: {
  payment: TenantDashboardData["upcomingPayment"];
}) {
  return (
    <SectionShell
      title="Upcoming payment"
      href="/portal/payments/make"
      linkLabel="Pay now"
    >
      {!payment ? (
        <EmptyNote>No upcoming payment scheduled.</EmptyNote>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm text-[var(--harbor-ink)]/60">
                {payment.property}
              </p>
              <p className="font-display text-3xl tracking-tight text-[var(--harbor-ink)]">
                {payment.amount}
              </p>
            </div>
            <span className={`badge ${paymentStatusClass(payment.status)}`}>
              {payment.status}
            </span>
          </div>
          <p className="text-sm text-[var(--harbor-ink)]/70">
            {payment.label} due <strong>{payment.dueDate}</strong>
          </p>
          <Link
            href="/portal/payments/make"
            className="btn btn-neutral btn-sm"
          >
            Pay rent
          </Link>
        </div>
      )}
    </SectionShell>
  );
}

function RecentPaymentsSection({
  payments,
}: {
  payments: TenantDashboardData["recentPayments"];
}) {
  return (
    <SectionShell
      title="Recent payment activity"
      href="/portal/payments/history"
      linkLabel="View history"
    >
      {payments.length === 0 ? (
        <EmptyNote>No payment history yet.</EmptyNote>
      ) : (
        <ul className="divide-y divide-[var(--harbor-deep)]/10">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-[var(--harbor-ink)]">
                  {payment.label}
                </p>
                <p className="text-xs text-[var(--harbor-ink)]/55">
                  {payment.paidOn} · {payment.method}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--harbor-ink)]">
                  {payment.amount}
                </p>
                <span className={`badge badge-sm ${paymentStatusClass(payment.status)}`}>
                  {payment.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

function ActiveMaintenanceSection({
  requests,
}: {
  requests: TenantDashboardData["activeMaintenance"];
}) {
  return (
    <SectionShell
      title="Active maintenance requests"
      href="/portal/maintenance"
      linkLabel="View all"
    >
      {requests.length === 0 ? (
        <EmptyNote>No open maintenance requests.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/portal/maintenance/${request.id}`}
                className="block rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 px-3 py-3 transition hover:border-[var(--harbor-mid)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--harbor-ink)]">
                    {request.title}
                  </p>
                  <span
                    className={`badge badge-sm ${maintenanceStatusClass(request.status)}`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--harbor-ink)]/55">
                  {request.location} · Updated {request.updatedAt} ·{" "}
                  {request.priority} priority
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

function AnnouncementsSection({
  announcements,
}: {
  announcements: TenantDashboardData["announcements"];
}) {
  return (
    <SectionShell
      title="Recent property announcements"
      href="/portal/announcements"
      linkLabel="View all"
    >
      {announcements.length === 0 ? (
        <EmptyNote>No announcements right now.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {announcements.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-[var(--harbor-deep)]/10 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--harbor-ink)]">
                  {item.title}
                </p>
                {item.unread ? (
                  <span className="badge badge-sm badge-info">Unread</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[var(--harbor-ink)]/55">
                {item.postedAt}
              </p>
              <p className="mt-2 text-sm text-[var(--harbor-ink)]/70">
                {item.preview}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

function LeaseSummarySection({
  lease,
}: {
  lease: TenantDashboardData["lease"];
}) {
  return (
    <SectionShell
      title="Lease summary"
      href="/portal/lease"
      linkLabel="Full lease"
      className="lg:col-span-2"
    >
      {!lease ? (
        <EmptyNote>No active lease on file.</EmptyNote>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Property", value: lease.propertyName },
            { label: "Unit", value: lease.unit },
            { label: "Term", value: lease.term },
            { label: "Monthly rent", value: lease.monthlyRent },
            { label: "Security deposit", value: lease.securityDeposit },
            { label: "Lease end", value: lease.endDate },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded-xl bg-[var(--harbor-sand)]/40 px-3 py-3"
            >
              <dt className="text-xs uppercase tracking-wide text-[var(--harbor-ink)]/50">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-[var(--harbor-ink)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </SectionShell>
  );
}
