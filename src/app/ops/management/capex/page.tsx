import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { CapExDashboard } from "@/components/mgmt/CapExDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Capital expenditures"
      subtitle="Create or pull CapEx from maintenance, edit, and request owner approval for major renovations and expenses."
      backHref="/ops/management"
      backLabel="Back to Management"
    >
      <CapExDashboard />
    </MgShell>
  );
}
