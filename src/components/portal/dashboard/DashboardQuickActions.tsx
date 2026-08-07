import Link from "next/link";
import { ScrollText, TriangleAlert, Wallet } from "lucide-react";

const ACTIONS = [
  {
    href: "/portal/payments",
    label: "Payments",
    description: "Amount due, late fees, and history",
    icon: Wallet,
  },
  {
    href: "/portal/maintenance/new",
    label: "Submit Maintenance Request",
    description: "Report an issue in your space",
    icon: TriangleAlert,
  },
  {
    href: "/portal/lease",
    label: "View Lease",
    description: "Review terms and dates",
    icon: ScrollText,
  },
] as const;

export function DashboardQuickActions() {
  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 shadow-sm"
      aria-labelledby="dashboard-quick-actions-heading"
    >
      <h2
        id="dashboard-quick-actions-heading"
        className="text-lg font-semibold text-[var(--harbor-ink)]"
      >
        Quick actions
      </h2>
      <ul className="mt-4 grid gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className="flex min-h-14 items-start gap-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-3 py-3 transition hover:border-[var(--harbor-mid)]/40 hover:bg-[var(--harbor-mist)]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
              >
                <span className="mt-0.5 rounded-lg bg-[var(--harbor-ink)] p-2 text-[var(--harbor-sand)]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[var(--harbor-ink)]">
                    {action.label}
                  </span>
                  <span className="block text-xs text-[var(--harbor-ink)]/60">
                    {action.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
