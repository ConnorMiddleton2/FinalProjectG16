import { getCurrentPortalTenant } from "@/lib/portal/auth-server";
import { CurrentTenantDashboard } from "@/components/portal/dashboard/CurrentTenantDashboard";
import { ProspectPortalHome } from "@/components/portal/ProspectPortalHome";

export default async function PortalDashboardPage() {
  const session = await getCurrentPortalTenant();
  const status = session?.accountStatus;

  if (
    status === "prospect" ||
    status === "pending_application" ||
    status === "pending_lease"
  ) {
    return <ProspectPortalHome />;
  }

  return <CurrentTenantDashboard />;
}
