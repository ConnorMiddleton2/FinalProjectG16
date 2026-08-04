import { RoleWorkspace } from "@/components/RoleWorkspace";
import { requirePageAccess } from "@/lib/effective-role";

export default async function OwnerPage() {
  await requirePageAccess("/owner");

  return (
    <RoleWorkspace
      role="owner"
      title="Owner portfolio workspace"
      summary="Owners review property performance, approve major expenses, and see management-fee results — without editing accounting transactions."
      upcomingModules={[
        "Portfolio summary by property",
        "Owner statements",
        "Expense approval queue",
        "Management fee summary",
      ]}
    />
  );
}
