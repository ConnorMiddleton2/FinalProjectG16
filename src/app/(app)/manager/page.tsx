import { RoleWorkspace } from "@/components/RoleWorkspace";

export default function ManagerPage() {
  return (
    <RoleWorkspace
      role="manager"
      title="Property manager operations"
      summary="Managers will run leasing, tenant relationships, maintenance coordination, and collections."
      upcomingModules={[
        "Properties and units",
        "Leases and renewals",
        "Work order board",
        "Rent roll / AR follow-up",
      ]}
    />
  );
}
