import { redirect } from "next/navigation";
import Link from "next/link";
import { OpsBrandHomeLink } from "@/components/OpsBrandHomeLink";
import { LogOut } from "lucide-react";
import { TenantProfileView } from "@/components/TenantProfileView";
import { teamLogout } from "@/app/team/actions";
import { hasTeamAccess } from "@/lib/team-auth";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OpsTenantDetailPage({ params }: Props) {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  const { id } = await params;

  return (
    <div className="min-h-screen bg-[var(--harbor-sand)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <OpsBrandHomeLink subtitle="Tenant profile" />
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
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <TenantProfileView tenantId={id} />
        <p className="text-center text-xs opacity-50">
          <Link href="/ops" className="underline-offset-2 hover:underline">
            Operations console
          </Link>
        </p>
      </main>
    </div>
  );
}
