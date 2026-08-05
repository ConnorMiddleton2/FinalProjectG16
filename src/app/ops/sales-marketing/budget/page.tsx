import { redirect } from "next/navigation";
import { hasTeamAccess } from "@/lib/team-auth";
import { SmShell } from "@/components/sm/SmShell";
import { BudgetDashboard } from "@/components/sm/BudgetDashboard";

export default async function SmBudgetPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return (
    <SmShell
      title="Budget"
      subtitle="Track total budget vs approved spend, with pending submissions shown translucently."
      backHref="/ops/sales-marketing"
      backLabel="Back to Sales & Marketing"
      activeNavHref="/ops/sales-marketing/budget"
    >
      <BudgetDashboard />
    </SmShell>
  );
}
