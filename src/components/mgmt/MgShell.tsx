import Link from "next/link";
import { OpsBrandHomeLink } from "@/components/OpsBrandHomeLink";
import { ArrowLeft, LogOut } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import { MgSideNav } from "@/components/mgmt/MgSideNav";

const tileClass =
  "border border-[var(--harbor-border)] bg-[var(--harbor-card)] text-[var(--harbor-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]/40 hover:shadow-md";

export { MG_NAV } from "@/components/mgmt/mg-nav";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  /** When set, show left-side links to other Management workspaces. */
  activeNavHref?: string;
  /** Wider content column for data-heavy pages (analytics, ledgers). */
  wide?: boolean;
  children: React.ReactNode;
};

export function MgShell({
  title,
  subtitle,
  backHref = "/ops",
  backLabel = "Back to operations",
  activeNavHref,
  wide = false,
  children,
}: Props) {
  const showSideNav = Boolean(activeNavHref);
  const maxW = wide ? "max-w-[1600px]" : showSideNav ? "max-w-7xl" : "max-w-6xl";

  return (
    <div className="min-h-screen bg-[var(--harbor-sand)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className={`mx-auto flex ${maxW} items-center justify-between gap-4 px-4 py-4 sm:px-6`}>
          <OpsBrandHomeLink subtitle="Management" />
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

      <div className={`mx-auto px-4 py-10 sm:px-6 ${maxW}`}>
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div
          className={
            showSideNav
              ? "grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]"
              : "space-y-6"
          }
        >
          {showSideNav && activeNavHref ? (
            <MgSideNav activeNavHref={activeNavHref} />
          ) : null}

          <main className="min-w-0 space-y-6">
            <div>
              <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 max-w-3xl text-[var(--harbor-ink)]/65">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export { tileClass };
