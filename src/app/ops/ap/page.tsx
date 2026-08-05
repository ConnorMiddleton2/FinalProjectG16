import { AccountsPayableDashboard } from "@/components/AccountsPayableShell";
import { requireOpsModule } from "@/lib/team-auth";

export default async function AccountsPayablePage() {
  await requireOpsModule("ap");

  return <AccountsPayableDashboard />;
}
