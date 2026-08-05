import { RoleWorkspace } from "@/components/RoleWorkspace";

/** Staff “View as Tenant” role shell — not the main-dash tenant portal. */
export default function TenantPage() {
  return (
    <RoleWorkspace
      role="tenant"
      title="Tenant portal"
      summary="Tenants will view lease terms, balances, payment history, and submit maintenance requests."
      upcomingModules={[
        "Lease summary",
        "Current balance and invoices",
        "Payment history",
        "Maintenance request form",
      ]}
    />
  );
}
