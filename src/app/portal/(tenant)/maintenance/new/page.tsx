import { MaintenanceRequestForm } from "@/components/portal/maintenance/MaintenanceRequestForm";
import { getCurrentPortalTenant } from "@/lib/portal/auth-server";

export default async function NewMaintenancePage() {
  const session = await getCurrentPortalTenant();
  const defaultPropertyOrUnit = [session?.propertyName, session?.unit]
    .filter(Boolean)
    .join(" · ");

  return (
    <MaintenanceRequestForm defaultPropertyOrUnit={defaultPropertyOrUnit} />
  );
}
