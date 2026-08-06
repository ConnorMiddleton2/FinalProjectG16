import { HrDashboard } from "@/components/HrShell";
import { requireOpsModule } from "@/lib/team-auth";

export default async function HumanResourcesPage() {
  await requireOpsModule("hr");

  return <HrDashboard />;
}
