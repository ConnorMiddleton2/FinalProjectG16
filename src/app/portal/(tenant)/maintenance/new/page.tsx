import { MaintenanceRequestForm } from "@/components/portal/maintenance/MaintenanceRequestForm";
import { getCurrentPortalTenant } from "@/lib/portal/auth-server";
import { getTenantPortalSession } from "@/lib/tenant-portal-accounts";

export default async function NewMaintenancePage() {
  const [session, account] = await Promise.all([
    getCurrentPortalTenant(),
    getTenantPortalSession(),
  ]);

  return (
    <MaintenanceRequestForm
      propertyName={account?.propertyName || session?.propertyName || ""}
      unit={account?.unit || session?.unit || ""}
      tenantName={
        account?.fullName || session?.displayName || "Tenant"
      }
    />
  );
}
