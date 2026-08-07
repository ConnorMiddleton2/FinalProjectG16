import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { CombinedAnalyticsDashboard } from "@/components/mgmt/CombinedAnalyticsDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Analytics"
      subtitle="Pick a property to zoom in, review easy-to-read charts, then generate financial statements when you need them."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/analytics"
      wide
    >
      <CombinedAnalyticsDashboard />
    </MgShell>
  );
}
