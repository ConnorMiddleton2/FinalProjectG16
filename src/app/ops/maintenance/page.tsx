import { redirect } from "next/navigation";
import { MaintenanceDashboard } from "@/components/MaintenanceDashboard";
import { hasTeamAccess } from "@/lib/team-auth";

export default async function MaintenancePage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return <MaintenanceDashboard />;
}
