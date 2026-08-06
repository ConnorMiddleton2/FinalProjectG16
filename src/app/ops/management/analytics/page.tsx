import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { CombinedAnalyticsDashboard } from "@/components/mgmt/CombinedAnalyticsDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Analytics"
      subtitle="Business KPIs, property performance, and accountant financial statement packages."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/analytics"
    >
      <CombinedAnalyticsDashboard />
    </MgShell>
  );
}
