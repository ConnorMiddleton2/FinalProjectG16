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

type SummaryCard = {
  key: string;
  label: string;
  href?: string;
  icon: typeof CircleDollarSign;
  value: (s: DashboardSummary) => string;
  isStatus?: boolean;
};

const cards: SummaryCard[] = [
  {
    key: "rent",
    label: "Next rent amount",
    href: "/portal/payments",
    icon: CircleDollarSign,
    value: (s) => s.nextRentAmount,
  },
  {
    key: "due",
    label: "Rent due date",
    href: "/portal/payments",
    icon: CalendarClock,
    value: (s) => s.rentDueDate,
  },
  {
    key: "status",
    label: "Payment status",
    href: "/portal/payments",
    icon: FileWarning,
    value: (s) => s.paymentStatus,
    isStatus: true,
  },
  {
    key: "lease-end",
    label: "Lease end date",
    href: "/portal/lease",
    icon: ScrollText,
    value: (s) => s.leaseEndDate,
  },
  {
    key: "maint",
    label: "Open maintenance",
    href: "/portal/maintenance",
    icon: ClipboardList,
    value: (s) => String(s.openMaintenanceCount),
  },
  {
    key: "ann",
    label: "Unread announcements",
    href: "/portal/announcements",
    icon: Bell,
    value: (s) => String(s.unreadAnnouncements),
  },
  {
    key: "msg",
    label: "Unread messages",
    href: "/portal/messages",
    icon: MessagesSquare,
    value: (s) => String(s.unreadMessages),
  },
];

const cardClassName =
  "flex h-full flex-col gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 shadow-sm";

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
          const body = (
            <>
              <span className="flex items-center gap-2 text-sm text-[var(--harbor-muted)]">
                <Icon
                  className="h-4 w-4 text-[var(--harbor-mid)]"
                  aria-hidden="true"
                />
                {card.label}
              </span>
              {card.isStatus ? (
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
            </>
          );

          return (
            <li key={card.key}>
              {card.href ? (
                <Link
                  href={card.href}
                  className={`${cardClassName} portal-motion-safe transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]`}
                >
                  {body}
                </Link>
              ) : (
                <div className={cardClassName}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
