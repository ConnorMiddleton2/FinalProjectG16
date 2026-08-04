import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  ClipboardList,
  KeyRound,
  LineChart,
  LogOut,
  Wrench,
} from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import { hasTeamAccess } from "@/lib/team-auth";

const modules = [
  {
    title: "Owners & properties",
    text: "Portfolio engagements, buildings, units, and management contracts.",
    href: "/owner",
    icon: Building2,
  },
  {
    title: "Leasing & tenants",
    text: "Lease terms, renewals, deposits, and tenant communication.",
    href: "/manager",
    icon: KeyRound,
  },
  {
    title: "Maintenance",
    text: "Work orders, vendors, and costs tied to each property.",
    href: "/maintenance",
    icon: Wrench,
  },
  {
    title: "Billing & AR",
    text: "Rent invoices, receipts, late fees, and collections.",
    href: "/accounting",
    icon: ClipboardList,
  },
  {
    title: "Accounting / GAAP",
    text: "Deposit liability, earned rent, and property profitability.",
    href: "/accounting",
    icon: LineChart,
  },
];

export default async function OpsPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Background management</p>
          </div>
          <form action={teamLogout}>
            <button type="submit" className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Operations console
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/70">
            You are signed in with company credentials. Open a module to continue
            building or demo the contract-to-cash workflow.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/workspace" className="btn btn-neutral btn-sm">
              Open role hub
            </Link>
            <Link href="/login" className="btn btn-outline btn-sm">
              Personal staff login (Supabase)
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.title}
                href={mod.href}
                className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]"
              >
                <Icon className="h-5 w-5 text-[var(--harbor-mid)]" />
                <h2 className="mt-3 text-lg font-semibold text-[var(--harbor-ink)]">
                  {mod.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">{mod.text}</p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
