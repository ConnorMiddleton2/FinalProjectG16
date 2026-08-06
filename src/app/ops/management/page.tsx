import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Landmark,
  ScrollText,
  Wallet,
} from "lucide-react";
import { requireOpsModule } from "@/lib/team-auth";
import { MgShell, tileClass } from "@/components/mgmt/MgShell";

const categories = [
  {
    title: "Owner applications & contracts",
    href: "/ops/management/owner-applications",
    icon: ScrollText,
    blurb:
      "Diligence, manager-signed contracts to the owner portal, and temp passwords.",
  },
  {
    title: "Department budgets",
    href: "/ops/management/budgets",
    icon: Wallet,
    blurb:
      "Per-property category budgets by fiscal year and month, using prior-year revenue.",
  },
  {
    title: "Capital expenditures",
    href: "/ops/management/capex",
    icon: Landmark,
    blurb:
      "Major renovations and expenses — from maintenance or management — sent to owners for approval.",
  },
  {
    title: "Analytics",
    href: "/ops/management/analytics",
    icon: BarChart3,
    blurb:
      "Business KPIs and property performance — occupancy, NOI, margins, and more.",
  },
  {
    title: "Missed payments",
    href: "/ops/management/missed-payments",
    icon: AlertTriangle,
    blurb:
      "Delinquency track records, foreclosure risk, and step-by-step escalation.",
  },
  {
    title: "Approve receipts & invoices",
    href: "/ops/management/approvals",
    icon: ClipboardCheck,
    blurb:
      "Review expense details, approve, and send to Accounts Payable.",
  },
] as const;

export default async function ManagementHubPage() {
  await requireOpsModule("management");

  return (
    <MgShell
      title="Management"
      subtitle="Executive workspace for owners, CapEx, analytics, arrears, and spend approvals."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </MgShell>
  );
}
