import { redirect } from "next/navigation";
import { PropertiesDashboard } from "@/components/PropertiesDashboard";
import { countPendingOwnerApplications } from "@/lib/owner-auth";
import { hasTeamAccess } from "@/lib/team-auth";

export default async function PropertiesPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  const pendingApplicationCount = await countPendingOwnerApplications();

  return (
    <PropertiesDashboard pendingApplicationCount={pendingApplicationCount} />
  );
}
