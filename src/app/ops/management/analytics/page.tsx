import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { AnalyticsDashboard } from "@/components/mgmt/AnalyticsDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Business analytics"
      subtitle="Company-wide KPIs across departments, people, and operations."
      backHref="/ops/management"
      backLabel="Back to Management"
    >
      <AnalyticsDashboard />
    </MgShell>
  );
}
