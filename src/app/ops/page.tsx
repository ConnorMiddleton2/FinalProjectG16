import { redirect } from "next/navigation";
import { EmployeeClockIn } from "@/components/EmployeeClockIn";
import { employeeDisplayName, departmentLabel } from "@/lib/hr";
import { getTeamSession, hasTeamAccess } from "@/lib/team-auth";

export default async function OpsPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  const session = await getTeamSession();
  const isEmployee = session?.kind === "employee";
  const welcomeName = isEmployee
    ? employeeDisplayName(session.employee)
    : null;
  const clockKey = isEmployee ? session.employee.id : "admin";
  const clockName = isEmployee
    ? employeeDisplayName(session.employee)
    : "Operations admin";
  const roleLabel = isEmployee
    ? session.employee.jobTitle?.trim() ||
      departmentLabel(session.employee.department) ||
      "Team member"
    : "Operations admin";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <main className="min-h-screen pl-72">
        <section className="relative flex min-h-screen items-center overflow-hidden px-6 py-16 sm:px-10 lg:px-14">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg,#0b2a32 0%,#134e5a 48%,#1f7a8c 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 14% 18%, #f3efe6 0%, transparent 42%), radial-gradient(circle at 86% 76%, #f0c27a 0%, transparent 38%)",
            }}
          />
          <div
            className="pointer-events-none absolute -right-24 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full opacity-20 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #f0c27a 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <div className="max-w-xl space-y-5 text-[var(--harbor-sand)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-sand)]/65">
                Harborline
              </p>
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {welcomeName ? (
                  <>
                    Welcome,
                    <span className="block text-[var(--harbor-glow)]">
                      {welcomeName}
                    </span>
                  </>
                ) : (
                  "Welcome aboard"
                )}
              </h1>
              <p className="max-w-md text-base leading-relaxed text-[var(--harbor-sand)]/78 sm:text-lg">
                You are signed in to Harborline operations. Open a department
                from the Windows menu whenever you are ready to work.
              </p>
              <p className="text-sm text-[var(--harbor-sand)]/55">{roleLabel}</p>
            </div>

            <div className="w-full max-w-sm shrink-0 lg:pb-1">
              <EmployeeClockIn
                employeeKey={clockKey}
                employeeName={clockName}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
