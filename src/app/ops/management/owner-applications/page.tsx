import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { OwnerApplicationsDashboard } from "@/components/mgmt/OwnerApplicationsDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Pending owner applications"
      subtitle="Diligence, inspections, meetings, submit for review (generates legal contract to owner portal), and provision access after they sign."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/owner-applications"
    >
      <OwnerApplicationsDashboard />
    </MgShell>
  );
}
