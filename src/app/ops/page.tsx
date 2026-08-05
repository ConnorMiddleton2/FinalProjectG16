import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import { hasTeamAccess } from "@/lib/team-auth";

const categories = [
  { label: "Properties", href: "/ops/properties" },
  { label: "Maintenance", href: "/ops/maintenance" },
  { label: "Tenant", href: "/ops/tenant" },
  { label: "Accounts Payable", href: "/ops/ap" },
  { label: "Accounts Receivable", href: "/ops/ar" },
  { label: "Human Resources", href: "/ops/hr" },
] as const;

const tileClass =
  "border border-[#8aa3b5]/55 bg-[#b7c9d6] text-[#2f4556] shadow-[0_1px_2px_rgba(47,69,86,0.10)] transition hover:-translate-y-0.5 hover:bg-[#a9bdcd] hover:border-[#7a95a9]/65";

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
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
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
            Choose a dashboard category to open its workspace.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className={`flex min-h-28 items-center justify-center rounded-2xl px-5 py-6 text-center text-xl font-semibold ${tileClass}`}
              >
                {cat.label}
              </Link>
            ))}
          </div>

          <Link
            href="/ops/sales-marketing"
            className={`flex w-full items-center justify-center rounded-xl px-5 py-3 text-center text-base font-semibold ${tileClass}`}
          >
            Sales & Marketing
          </Link>

          <Link
            href="/ops/management"
            className={`flex w-full items-center justify-center rounded-xl px-5 py-3 text-center text-base font-semibold ${tileClass}`}
          >
            Management
          </Link>
        </div>
      </main>
    </div>
  );
}
