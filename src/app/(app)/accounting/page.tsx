import { RoleWorkspace } from "@/components/RoleWorkspace";

export default function AccountingPage() {
  return (
    <RoleWorkspace
      role="accounting"
      title="Accounting and billing workspace"
      summary="Accounting will monitor receivables, deposits, revenue timing, and property profitability."
      upcomingModules={[
        "Rent invoices and receipts",
        "Security deposit liability tracking",
        "Unearned vs earned rent views",
        "Profitability by property / owner",
      ]}
    />
  );
}
