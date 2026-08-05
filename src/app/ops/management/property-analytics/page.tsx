import { redirect } from "next/navigation";
import { hasTeamAccess } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { PropertyAnalyticsDashboard } from "@/components/mgmt/PropertyAnalyticsDashboard";

export default async function Page() {
  if (!(await hasTeamAccess())) redirect("/team");
  return (
    <MgShell
      title="Property analytics"
      subtitle="Profit margin, occupancy, and performance by property or group."
      backHref="/ops/management"
      backLabel="Back to Management"
    >
      <PropertyAnalyticsDashboard />
    </MgShell>
  );
}
