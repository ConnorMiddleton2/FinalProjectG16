import { RoleWorkspace } from "@/components/RoleWorkspace";
import { requirePageAccess } from "@/lib/effective-role";

export default async function ManagerPage() {
  await requirePageAccess("/manager");

  return (
    <RoleWorkspace
      role="manager"
      title="Property manager operations"
      summary="Managers run leasing, tenant relationships, maintenance coordination, and collections follow-up."
      upcomingModules={[
        "Properties and units",
        "Leases and renewals",
        "Work order board",
        "Rent roll / AR follow-up",
      ]}
    />
  );
}
