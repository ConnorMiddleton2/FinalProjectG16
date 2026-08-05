import Link from "next/link";
import {
  Bell,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  FileWarning,
  MessagesSquare,
  ScrollText,
} from "lucide-react";
import type { DashboardSummary } from "@/lib/portal/dashboard-types";
import { paymentStatusClass } from "@/lib/portal/dashboard-status";

type Props = {
  summary: DashboardSummary;
};

const cards = [
  {
    key: "rent",
    label: "Next rent amount",
    href: "/portal/payments/make",
    icon: CircleDollarSign,
    value: (s: DashboardSummary) => s.nextRentAmount,
  },
  {
    key: "due",
    label: "Rent due date",
    href: "/portal/payments",
    icon: CalendarClock,
    value: (s: DashboardSummary) => s.rentDueDate,
  },
  {
    key: "status",
    label: "Payment status",
    href: "/portal/payments",
    icon: FileWarning,
    value: (s: DashboardSummary) => s.paymentStatus,
    isStatus: true as const,
  },
  {
    key: "lease-end",
    label: "Lease end date",
    href: "/portal/lease",
    icon: ScrollText,
    value: (s: DashboardSummary) => s.leaseEndDate,
  },
  {
    key: "maint",
    label: "Open maintenance",
    href: "/portal/maintenance",
    icon: ClipboardList,
    value: (s: DashboardSummary) => String(s.openMaintenanceCount),
  },
  {
    key: "ann",
    label: "Unread announcements",
    href: "/portal/announcements",
    icon: Bell,
    value: (s: DashboardSummary) => String(s.unreadAnnouncements),
  },
  {
    key: "msg",
    label: "Unread messages",
    href: "/portal/messages",
    icon: MessagesSquare,
    value: (s: DashboardSummary) => String(s.unreadMessages),
  },
] as const;

export function DashboardSummaryCards({ summary }: Props) {
  return (
    <section aria-labelledby="dashboard-summary-heading">
      <h2 id="dashboard-summary-heading" className="sr-only">
        Account summary
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const value = card.value(summary);
          return (
            <li key={card.key}>
              <Link
                href={card.href}
                className="flex h-full flex-col gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
              >
                <span className="flex items-center gap-2 text-sm text-[var(--harbor-ink)]/60">
                  <Icon
                    className="h-4 w-4 text-[var(--harbor-mid)]"
                    aria-hidden="true"
                  />
                  {card.label}
                </span>
                {"isStatus" in card && card.isStatus ? (
                  <span
                    className={`badge badge-lg w-fit ${paymentStatusClass(summary.paymentStatus)}`}
                  >
                    {value}
                  </span>
                ) : (
                  <span className="font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
                    {value}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
