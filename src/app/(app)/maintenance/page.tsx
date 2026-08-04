import { RoleWorkspace } from "@/components/RoleWorkspace";
import { requirePageAccess } from "@/lib/effective-role";

export default async function MaintenancePage() {
  const role = await requirePageAccess("/maintenance");

  if (role === "manager") {
    return (
      <RoleWorkspace
        role="manager"
        title="Work-order board"
        summary="Property managers coordinate maintenance from this board. Dispatch details are owned by the Maintenance Coordinator; accounting edits stay out of scope."
        upcomingModules={[
          "Open work orders by property",
          "Priority and SLA follow-up",
          "Vendor status snapshot",
          "Tenant request triage",
        ]}
      />
    );
  }

  return (
    <RoleWorkspace
      role="maintenance"
      title="Maintenance coordinator workspace"
      summary="Coordinators dispatch work orders, assign vendors/technicians, and track maintenance costs — without tenant payment or GL access."
      upcomingModules={[
        "Open work-order board",
        "Vendor / technician assignment",
        "Cost tracking by property",
        "Completion review",
      ]}
    />
  );
}
