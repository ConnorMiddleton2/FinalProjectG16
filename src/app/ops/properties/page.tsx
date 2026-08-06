import { PropertiesDashboard } from "@/components/PropertiesDashboard";
import { countPendingOwnerApplications } from "@/lib/owner-auth";
import { requireOpsModule } from "@/lib/team-auth";

export default async function PropertiesPage() {
  await requireOpsModule("properties");

  const pendingApplicationCount = await countPendingOwnerApplications();

  return (
    <PropertiesDashboard pendingApplicationCount={pendingApplicationCount} />
  );
}
