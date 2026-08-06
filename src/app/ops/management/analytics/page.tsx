import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { CombinedAnalyticsDashboard } from "@/components/mgmt/CombinedAnalyticsDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Analytics"
      subtitle="Business KPIs and property performance in one place."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/analytics"
    >
      <CombinedAnalyticsDashboard />
    </MgShell>
  );
}
