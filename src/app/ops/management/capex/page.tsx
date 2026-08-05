import { redirect } from "next/navigation";
import { hasTeamAccess } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { CapExDashboard } from "@/components/mgmt/CapExDashboard";

export default async function Page() {
  if (!(await hasTeamAccess())) redirect("/team");
  return (
    <MgShell
      title="Capital expenditures"
      subtitle="Create CapEx from the portfolio (owner locked to the property), attach vendor invoices, and submit to the owner portal with email."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/capex"
    >
      <CapExDashboard />
    </MgShell>
  );
}
