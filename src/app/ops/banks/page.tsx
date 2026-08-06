import { requireOpsModule } from "@/lib/team-auth";
import { BanksDashboard } from "@/components/BanksDashboard";

export default async function BanksPage() {
  await requireOpsModule("banks");
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <div>
        <p className="text-sm uppercase tracking-wide opacity-55">Operations</p>
        <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
          Bank accounts
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/70">
          Property operating accounts and Harborline corporate cash. Tenant rent
          lands here, fees sweep to corporate, expenses and owner remittances
          leave from the property ledger.
        </p>
      </div>
      <BanksDashboard />
    </main>
  );
}
