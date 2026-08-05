import { redirect } from "next/navigation";
import { hasTeamAccess } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { ApprovalsDashboard } from "@/components/mgmt/ApprovalsDashboard";

export default async function Page() {
  if (!(await hasTeamAccess())) redirect("/team");
  return (
    <MgShell
      title="Approve receipts & invoices"
      subtitle="Approve department expenses so they solidify against budgets."
      backHref="/ops/management"
      backLabel="Back to Management"
    >
      <ApprovalsDashboard />
    </MgShell>
  );
}
