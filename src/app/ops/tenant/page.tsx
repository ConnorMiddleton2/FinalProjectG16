import { TenantDashboard } from "@/components/TenantDashboard";
import { requireOpsModule } from "@/lib/team-auth";

export default async function OpsTenantPage() {
  await requireOpsModule("tenant");

  return <TenantDashboard />;
}
