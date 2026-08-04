import { RoleWorkspace } from "@/components/RoleWorkspace";
import { requirePageAccess } from "@/lib/effective-role";

export default async function AccountingPage() {
  const role = await requirePageAccess("/accounting");

  if (role === "executive") {
    return (
      <RoleWorkspace
        role="executive"
        title="Profitability reports"
        summary="Executives can review profitability and fee results here. Editing day-to-day accounting transactions stays with Accounting and Billing."
        upcomingModules={[
          "Profitability by property / owner",
          "Management fee overview",
          "Exception watchlist",
          "Read-only AR summary",
        ]}
      />
    );
  }

  return (
    <RoleWorkspace
      role="accounting"
      title="Accounting and billing workspace"
      summary="Accounting monitors receivables, deposits, revenue timing, and property profitability, and can edit billing transactions."
      upcomingModules={[
        "Rent invoices and receipts",
        "Security deposit liability tracking",
        "Unearned vs earned rent views",
        "Profitability by property / owner",
      ]}
    />
  );
}
