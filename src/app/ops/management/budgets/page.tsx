import { redirect } from "next/navigation";
import { hasTeamAccess } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { DepartmentBudgetsDashboard } from "@/components/mgmt/DepartmentBudgetsDashboard";

export default async function ManagementBudgetsPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return (
    <MgShell
      title="Department budgets"
      subtitle="Set category budgets for Maintenance, Sales & Marketing, and Executive."
      backHref="/ops/management"
    >
      <DepartmentBudgetsDashboard />
    </MgShell>
  );
}
