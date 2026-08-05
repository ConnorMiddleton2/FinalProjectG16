import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Megaphone,
  Wallet,
} from "lucide-react";
import { requireOpsModule } from "@/lib/team-auth";
import { SmShell, tileClass } from "@/components/sm/SmShell";

const categories = [
  {
    title: "Advertisement campaigns and costs",
    href: "/ops/sales-marketing/campaigns",
    icon: Megaphone,
    blurb:
      "Track Facebook, Instagram, Google ads, sponsorships, events, spend, and ROI.",
  },
  {
    title: "Tenant applications",
    href: "/ops/sales-marketing/applications",
    icon: ClipboardList,
    blurb:
      "Review applications, log outreach, and offer tour times from your calendar.",
  },
  {
    title: "Calendar",
    href: "/ops/sales-marketing/calendar",
    icon: CalendarDays,
    blurb:
      "Schedule tours, media events, and meetings by day, week, month, or year.",
  },
  {
    title: "Budget",
    href: "/ops/sales-marketing/budget",
    icon: Wallet,
    blurb:
      "See approved vs pending spend and submit receipts with S&M codes.",
  },
] as const;

export default async function SalesMarketingHubPage() {
  await requireOpsModule("sales-marketing");

  return (
    <SmShell
      title="Sales & Marketing"
      subtitle="Choose a workspace. All entries sync to the shared team database."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map(({ title, href, icon: Icon, blurb }) => (
          <Link
            key={href}
            href={href}
            className={`flex min-h-36 flex-col justify-between rounded-2xl px-5 py-5 text-left ${tileClass}`}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-6 w-6 shrink-0 opacity-80" />
              <div>
                <p className="text-lg font-semibold leading-snug">{title}</p>
                <p className="mt-2 text-sm opacity-75">{blurb}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SmShell>
  );
}
