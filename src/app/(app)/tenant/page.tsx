import { RoleWorkspace } from "@/components/RoleWorkspace";
import { requirePageAccess } from "@/lib/effective-role";

export default async function TenantPage() {
  await requirePageAccess("/tenant");

  return (
    <RoleWorkspace
      role="tenant"
      title="Tenant portal"
      summary="Tenants view lease terms, balances, payment history, and submit maintenance requests — not internal profitability reports."
      upcomingModules={[
        "Lease summary",
        "Current balance and invoices",
        "Payment history",
        "Maintenance request form",
      ]}
    />
  );
}
