import { redirect } from "next/navigation";
import { OpsHomeActionTiles } from "@/components/OpsHomeActionTiles";
import { COMPANY_SHORT } from "@/lib/brand";
import { employeeDisplayName, departmentLabel } from "@/lib/hr";
import {
  filterOpsHomeActionTiles,
  loadOpsHomeActionTiles,
} from "@/lib/ops-home-actions";
import { createClient } from "@/lib/supabase/server";
import {
  allowedModulesForNav,
  getTeamSession,
  hasTeamAccess,
} from "@/lib/team-auth";

export default async function OpsPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  const session = await getTeamSession();
  const isEmployee = session?.kind === "employee";
  const welcomeName = isEmployee
    ? employeeDisplayName(session.employee)
    : "Admin User";
  const roleLabel = isEmployee
    ? session.employee.jobTitle?.trim() ||
      departmentLabel(session.employee.department) ||
      "Team member"
    : "Operations admin";

  let tiles = [] as Awaited<ReturnType<typeof loadOpsHomeActionTiles>>;
  try {
    const client = await createClient();
    tiles = filterOpsHomeActionTiles(
      await loadOpsHomeActionTiles(client),
      allowedModulesForNav(session)
    );
  } catch {
    tiles = [];
  }

  return (
    <div className="min-h-screen bg-[var(--harbor-sand)]">
      <main className="min-h-screen pl-72">
        <section className="relative flex min-h-screen flex-col overflow-hidden px-6 pb-8 pt-10 sm:px-8 sm:pt-12 lg:px-10">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, var(--harbor-ink) 0%, #0a5554 48%, var(--harbor-mid) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 14% 18%, var(--harbor-sand) 0%, transparent 42%), radial-gradient(circle at 86% 76%, var(--harbor-mid) 0%, transparent 38%)",
            }}
          />
          {/* Subtle white pattern field for empty space */}
          <div
            className="pointer-events-none absolute inset-0 ops-home-pattern opacity-[0.22]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 ops-home-pattern-fine opacity-[0.12]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-16 top-[12%] h-[22rem] w-[22rem] rounded-full border border-white/20 ops-home-drift"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-4 top-[18%] h-[14rem] w-[14rem] rounded-full border border-white/15 ops-home-drift-delayed"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-[8%] bottom-[28%] h-40 w-40 rounded-full border border-white/10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-[18%] top-[42%] h-3 w-3 rounded-full bg-white/25"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-[28%] top-[58%] h-2 w-2 rounded-full bg-white/20"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-[12%] top-[64%] h-1.5 w-1.5 rounded-full bg-white/30"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-24 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full opacity-20 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-2xl space-y-3 text-[var(--harbor-on-dark)]">
            <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Welcome,{" "}
              <span className="text-[var(--harbor-mist)]">{welcomeName}</span>
            </h1>
            <p className="text-lg font-medium text-[var(--harbor-on-dark)]/85 sm:text-xl">
              {roleLabel}
            </p>
            <p className="max-w-md pt-1 text-base leading-relaxed text-[var(--harbor-on-dark)]/70 sm:text-lg">
              You are signed in to {COMPANY_SHORT} operations. Open a department
              from the Windows menu whenever you are ready to work.
            </p>
          </div>

          <div className="relative mt-auto w-full max-w-5xl">
            <OpsHomeActionTiles tiles={tiles} />
          </div>
        </section>
      </main>
    </div>
  );
}
