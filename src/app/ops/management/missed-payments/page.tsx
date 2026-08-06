import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { MissedPaymentsDashboard } from "@/components/mgmt/MissedPaymentsDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Missed payments"
      subtitle="Delinquency track records, foreclosure risk, and escalation steps."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/missed-payments"
    >
      <MissedPaymentsDashboard />
    </MgShell>
  );
}
