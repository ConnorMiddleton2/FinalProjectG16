import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, PanelLeftOpen } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import {
  allowedModulesForNav,
  getTeamSession,
  hasTeamAccess,
} from "@/lib/team-auth";
import {
  filterOpsWindows,
  OPS_DEPARTMENT_WINDOWS,
} from "@/lib/ops-windows";

export default async function OpsPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  const session = await getTeamSession();
  const allowed = allowedModulesForNav(session);
  const windows = filterOpsWindows(OPS_DEPARTMENT_WINDOWS, allowed);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 pl-14 sm:pl-6">
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

      <main className="mx-auto max-w-6xl space-y-12 px-6 py-10 pl-14 sm:pl-6">
        <section className="relative overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-[linear-gradient(135deg,#0b2a32_0%,#134e5a_48%,#1f7a8c_100%)] px-6 py-10 text-[var(--harbor-sand)] shadow-sm sm:px-10 sm:py-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 12% 20%, #f3efe6 0%, transparent 42%), radial-gradient(circle at 88% 78%, #f0c27a 0%, transparent 36%)",
            }}
          />
          <div className="relative max-w-2xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--harbor-sand)]/70">
              Harborline
            </p>
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
              Operations
            </h1>
            <p className="text-base leading-relaxed text-[var(--harbor-sand)]/80 sm:text-lg">
              Team home for Harborline’s background windows. Use the{" "}
              <span className="font-semibold text-[var(--harbor-sand)]">
                Windows
              </span>{" "}
              control on the left edge anytime to jump between departments you
              are allowed to open.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--harbor-sand)]/25 bg-[var(--harbor-sand)]/10 px-3 py-1.5 text-sm text-[var(--harbor-sand)]/90">
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
              <span>
                Look for the vertical{" "}
                <span className="font-semibold">Windows</span> tab on the left
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
              Team windows
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--harbor-ink)]/65">
              Open a department workspace below, or switch later from the
              Windows menu. Only modules HR has granted appear here.
            </p>
          </div>

          {windows.length === 0 ? (
            <p className="rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 px-5 py-6 text-sm text-[var(--harbor-ink)]/70 shadow-sm">
              No department windows are enabled for your account yet. Ask HR to
              grant module access on your employee profile.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--harbor-deep)]/10 overflow-hidden rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 shadow-sm">
              {windows.map(({ href, label, hint, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-start gap-4 px-5 py-4 transition hover:bg-[var(--harbor-mist)]/55"
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--harbor-ink)] text-[var(--harbor-sand)] transition group-hover:bg-[var(--harbor-deep)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-[var(--harbor-ink)]">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-sm text-[var(--harbor-ink)]/60">
                        {hint}
                      </span>
                    </span>
                    <span className="mt-2 text-sm font-medium text-[var(--harbor-mid)] opacity-0 transition group-hover:opacity-100">
                      Open
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-[var(--harbor-ink)]/50">
            You can open this home anytime from Windows → Operations home.
          </p>
        </section>
      </main>
    </div>
  );
}
