import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import { hasTeamAccess } from "@/lib/team-auth";
import { AccountsReceivableDashboard } from "@/components/AccountsReceivableDashboard";

export default async function AccountsReceivablePage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Accounts Receivable</p>
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

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <Link
          href="/ops"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to operations
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Accounts Receivable
          </h1>
          <p className="mt-2 text-[var(--harbor-ink)]/65">
            Tenant invoices and collections. Paid amounts drive Management
            budget revenue (not editable estimates).
          </p>
        </div>

        <AccountsReceivableDashboard />
      </main>
    </div>
  );
}
