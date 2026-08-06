import { MaintenanceDashboard } from "@/components/MaintenanceDashboard";
import { requireOpsModule } from "@/lib/team-auth";

export default async function MaintenancePage() {
  await requireOpsModule("maintenance");

  return <MaintenanceDashboard />;
}
