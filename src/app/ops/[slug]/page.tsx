import Link from "next/link";
import { OpsBrandHomeLink } from "@/components/OpsBrandHomeLink";
import { notFound } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import { requireOpsModule } from "@/lib/team-auth";

const DASHBOARDS: Record<string, { title: string; module: "ar" }> = {
  ar: { title: "Accounts Receivable", module: "ar" },
};


type Props = {
  params: Promise<{ slug: string }>;
};

export default async function OpsDashboardPage({ params }: Props) {
  const { slug } = await params;
  const dash = DASHBOARDS[slug];
  if (!dash) notFound();

  await requireOpsModule(dash.module);

  return (
    <div className="min-h-screen bg-[var(--harbor-sand)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <OpsBrandHomeLink subtitle="Background management" />
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
            {dash.title}
          </h1>
          <p className="mt-2 text-[var(--harbor-ink)]/65">
            This dashboard is intentionally blank for now. We will build it out
            later.
          </p>
        </div>

        <div className="min-h-64 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50" />
      </main>
    </div>
  );
}
