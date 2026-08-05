import { redirect } from "next/navigation";
import { AccountsPayableDashboard } from "@/components/AccountsPayableDashboard";
import { hasTeamAccess } from "@/lib/team-auth";

export default async function AccountsPayablePage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return <AccountsPayableDashboard />;
}
