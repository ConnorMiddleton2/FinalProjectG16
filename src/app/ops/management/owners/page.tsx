import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { OwnersAccountsDashboard } from "@/components/mgmt/OwnersAccountsDashboard";

export default async function Page() {
  await requireOpsModule("management");
  return (
    <MgShell
      title="Owner accounts"
      subtitle="View current owners, login credentials, linked properties, and reset passwords when needed."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/owners"
    >
      <OwnersAccountsDashboard />
    </MgShell>
  );
}
