import { RoleWorkspace } from "@/components/RoleWorkspace";
import { requirePageAccess } from "@/lib/effective-role";

export default async function VendorPage() {
  const role = await requirePageAccess("/vendor");

  if (role === "maintenance") {
    return (
      <RoleWorkspace
        role="maintenance"
        title="Vendor assignments"
        summary="Coordinators use this view to assign and monitor vendors/technicians. Tenant payment records and profitability reports remain blocked."
        upcomingModules={[
          "Vendor roster",
          "Assignment by work order",
          "Cost estimates vs actuals",
          "Completion follow-up",
        ]}
      />
    );
  }

  return (
    <RoleWorkspace
      role="vendor"
      title="Vendor / technician workspace"
      summary="Vendors and field technicians see assigned jobs, confirm completion, and capture time and materials — not tenant payments or profitability."
      upcomingModules={[
        "Assigned work orders",
        "Arrival / completion confirmation",
        "Time and materials entry",
        "Ad hoc work / approval requests",
      ]}
    />
  );
}
