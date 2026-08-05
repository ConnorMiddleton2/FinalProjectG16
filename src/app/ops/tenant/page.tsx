import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { GiantHotdog } from "@/components/GiantHotdog";
import { teamLogout } from "@/app/team/actions";
import { hasTeamAccess } from "@/lib/team-auth";

export default async function OpsTenantPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Tenant</p>
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

      <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-6xl flex-col px-6 py-10">
        <Link
          href="/ops"
          className="mb-6 inline-flex w-fit items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to operations
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <GiantHotdog className="w-[min(92vw,640px)] h-auto drop-shadow-[0_28px_40px_rgba(11,42,50,0.28)] animate-[welcome-drift_4s_ease-in-out_infinite]" />
          <h1 className="mt-8 font-display text-4xl tracking-tight text-[var(--harbor-ink)] sm:text-5xl">
            Tenant dashboard
          </h1>
          <p className="mt-2 text-[var(--harbor-ink)]/60">
            Giant hotdog placeholder — more tenant tools coming later.
          </p>
        </div>
      </main>
    </div>
  );
}
