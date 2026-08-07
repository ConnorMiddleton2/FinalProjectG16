import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOpsModule } from "@/lib/team-auth";
import { BanksDashboard } from "@/components/BanksDashboard";

export default async function BanksPage() {
  await requireOpsModule("banks");
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <Link
        href="/ops"
        className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to operations
      </Link>
      <div>
        <p className="text-sm uppercase tracking-wide opacity-55">Operations</p>
        <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
          Bank accounts
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/70">
          Property operating accounts and CPMC corporate cash. Tenant rent
          lands here, fees sweep to corporate, expenses and owner remittances
          leave from the property ledger.
        </p>
      </div>
      <BanksDashboard />
    </main>
  );
}
