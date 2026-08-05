import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { ApprovalsDashboard } from "@/components/mgmt/ApprovalsDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Approve receipts & invoices"
      subtitle="Approve department expenses, then send them to Accounts Payable."
      backHref="/ops/management"
      backLabel="Back to Management"
    >
      <ApprovalsDashboard />
    </MgShell>
  );
}
