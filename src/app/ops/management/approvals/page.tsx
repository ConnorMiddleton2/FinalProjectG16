import { redirect } from "next/navigation";
import { hasTeamAccess } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { ApprovalsDashboard } from "@/components/mgmt/ApprovalsDashboard";

export default async function Page() {
  if (!(await hasTeamAccess())) redirect("/team");
  return (
    <MgShell
      title="Approve receipts & invoices"
      subtitle="Approve department expenses, then send them to Accounts Payable."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/approvals"
    >
      <ApprovalsDashboard />
    </MgShell>
  );
}
