import { redirect } from "next/navigation";
import { TenantDashboard } from "@/components/TenantDashboard";
import { hasTeamAccess } from "@/lib/team-auth";

export default async function OpsTenantPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return <TenantDashboard />;
}
