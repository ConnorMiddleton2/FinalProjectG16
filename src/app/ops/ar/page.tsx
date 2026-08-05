import { redirect } from "next/navigation";
import { AccountsReceivableDashboard } from "@/components/AccountsReceivableDashboard";
import { hasTeamAccess } from "@/lib/team-auth";

export default async function AccountsReceivablePage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return <AccountsReceivableDashboard />;
}
