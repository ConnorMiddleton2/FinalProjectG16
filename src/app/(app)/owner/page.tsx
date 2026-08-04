import { RoleWorkspace } from "@/components/RoleWorkspace";

export default function OwnerPage() {
  return (
    <RoleWorkspace
      role="owner"
      title="Owner portfolio workspace"
      summary="Owners will review property performance, approve major expenses, and see management-fee results."
      upcomingModules={[
        "Portfolio summary by property",
        "Owner statements",
        "Expense approval queue",
        "Management fee summary",
      ]}
    />
  );
}
