import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { ownerLogout } from "@/app/owners/actions";
import { getCurrentOwner } from "@/lib/owner-auth";
import { OwnerPortalDashboard } from "@/components/OwnerPortalDashboard";

export default async function OwnerDashboardPage() {
  const owner = await getCurrentOwner();
  if (!owner) {
    redirect("/owners");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Owner dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm opacity-80 sm:inline">
              {owner.email}
            </span>
            <form action={ownerLogout}>
              <button
                type="submit"
                className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Welcome
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Welcome, {owner.fullName}
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Review Harborline messages, sign management contracts, and respond to
            capital expenditure requests.
          </p>
        </div>

        <OwnerPortalDashboard owner={owner} />
      </main>
    </div>
  );
}
