import { RoleWorkspace } from "@/components/RoleWorkspace";

export default function MaintenancePage() {
  return (
    <RoleWorkspace
      role="maintenance"
      title="Maintenance technician workspace"
      summary="Technicians will see assigned work orders, document completion, and capture parts or labor."
      upcomingModules={[
        "Assigned work orders",
        "Arrival / completion confirmation",
        "Time and materials entry",
        "Ad hoc work / approval requests",
      ]}
    />
  );
}
