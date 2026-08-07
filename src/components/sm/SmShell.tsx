import Link from "next/link";
import { OpsBrandHomeLink } from "@/components/OpsBrandHomeLink";
import { ArrowLeft, LogOut } from "lucide-react";
import { teamLogout } from "@/app/team/actions";

const tileClass =
  "border border-[var(--harbor-border)] bg-[var(--harbor-card)] text-[var(--harbor-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]/40 hover:shadow-md";

export const SM_NAV = [
  {
    href: "/ops/sales-marketing/campaigns",
    label: "Campaigns",
  },
  {
    href: "/ops/sales-marketing/applications",
    label: "Applications",
  },
  {
    href: "/ops/sales-marketing/calendar",
    label: "Calendar",
  },
  {
    href: "/ops/sales-marketing/budget",
    label: "Budget",
  },
] as const;

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  /** When set, show left-side links to other S&M workspaces. */
  activeNavHref?: string;
  children: React.ReactNode;
};

export function SmShell({
  title,
  subtitle,
  backHref = "/ops",
  backLabel = "Back to operations",
  activeNavHref,
  children,
}: Props) {
  const showSideNav = Boolean(activeNavHref);

  return (
    <div className="min-h-screen bg-[var(--harbor-sand)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <OpsBrandHomeLink subtitle="Sales & Marketing" />
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

      <div
        className={`mx-auto px-6 py-10 ${
          showSideNav ? "max-w-7xl" : "max-w-6xl"
        }`}
      >
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
          {showSideNav ? (
            <aside className="rounded-2xl border border-[var(--harbor-ink)] bg-[var(--harbor-ink)] p-3 text-[var(--harbor-on-dark)] lg:sticky lg:top-6 lg:self-start">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--harbor-on-dark)]/55">
                Sales & Marketing
              </p>
              <nav className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1.5">
                <Link
                  href="/ops/sales-marketing"
                  className="rounded-xl px-3 py-2 text-sm text-[var(--harbor-on-dark)]/80 transition hover:bg-white/10"
                >
                  Hub overview
                </Link>
                {SM_NAV.map((item) => {
                  const active = activeNavHref === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? "bg-[var(--harbor-mid)] text-[var(--harbor-on-dark)] shadow-sm"
                          : "text-[var(--harbor-on-dark)]/85 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          ) : null}

          <main className="min-w-0 space-y-6">
            <div>
              <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
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
