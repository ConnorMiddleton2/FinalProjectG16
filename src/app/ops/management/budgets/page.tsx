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
      subtitle="Per-property budgets by year and month. Revenue comes from Accounts Receivable (Paid invoices)."
      backHref="/ops/management"
      activeNavHref="/ops/management/budgets"
    >
      <DepartmentBudgetsDashboard />
    </MgShell>
  );
}
