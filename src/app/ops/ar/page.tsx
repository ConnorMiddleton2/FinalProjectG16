import { AccountsReceivableDashboard } from "@/components/AccountsReceivableDashboard";
import { requireOpsModule } from "@/lib/team-auth";

export default async function AccountsReceivablePage() {
  await requireOpsModule("ar");

  return <AccountsReceivableDashboard />;
}
