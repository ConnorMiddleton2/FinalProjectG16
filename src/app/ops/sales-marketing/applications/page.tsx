import { requireOpsModule } from "@/lib/team-auth";
import { SmShell } from "@/components/sm/SmShell";
import { ApplicationsDashboard } from "@/components/sm/ApplicationsDashboard";

export default async function SmApplicationsPage() {
  await requireOpsModule("sales-marketing");

  return (
    <SmShell
      title="Tenant applications"
      subtitle="Review applications, log calls/texts, and offer tour times that match your calendar."
      backHref="/ops/sales-marketing"
      backLabel="Back to Sales & Marketing"
      activeNavHref="/ops/sales-marketing/applications"
    >
      <ApplicationsDashboard />
    </SmShell>
  );
}
