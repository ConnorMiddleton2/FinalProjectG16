import { requireOpsModule } from "@/lib/team-auth";
import { AssetsDashboard } from "@/components/AssetsDashboard";

export default async function AssetsPage() {
  await requireOpsModule("assets");
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <div>
        <p className="text-sm uppercase tracking-wide opacity-55">Operations</p>
        <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
          Assets
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/70">
          Owner equipment and PP&amp;E tracked by property for operations.
          These records belong to the property owner by default — they are not
          on CPMC&apos;s books unless ownership is set to the management
          company.
        </p>
      </div>
      <AssetsDashboard />
    </main>
  );
}
