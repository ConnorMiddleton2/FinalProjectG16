import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import { MgSideNav } from "@/components/mgmt/MgSideNav";

const tileClass =
  "border border-[#8aa3b5]/55 bg-[#b7c9d6] text-[#2f4556] shadow-[0_1px_2px_rgba(47,69,86,0.10)] transition hover:-translate-y-0.5 hover:bg-[#a9bdcd] hover:border-[#7a95a9]/65";

export { MG_NAV } from "@/components/mgmt/mg-nav";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  /** When set, show left-side links to other Management workspaces. */
  activeNavHref?: string;
  children: React.ReactNode;
};

export function MgShell({
  title,
  subtitle,
  backHref = "/ops",
  backLabel = "Back to operations",
  activeNavHref,
  children,
}: Props) {
  const showSideNav = Boolean(activeNavHref);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Management</p>
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
              ? "grid gap-6 lg:grid-cols-[14.5rem_minmax(0,1fr)]"
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
