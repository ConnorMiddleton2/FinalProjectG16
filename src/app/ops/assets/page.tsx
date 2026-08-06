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
          Fixed assets by property — cost basis, depreciation method, and
          placed-in-service dates that feed Management financial statements.
        </p>
      </div>
      <AssetsDashboard />
    </main>
  );
}
