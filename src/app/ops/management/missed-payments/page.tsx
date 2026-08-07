import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { MissedPaymentsDashboard } from "@/components/mgmt/MissedPaymentsDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Overdue tenants"
      subtitle="Delinquent tenants — review applications, payment & outreach history, generate state-aware next steps, or mark evicted."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/missed-payments"
    >
      <MissedPaymentsDashboard />
    </MgShell>
  );
}
