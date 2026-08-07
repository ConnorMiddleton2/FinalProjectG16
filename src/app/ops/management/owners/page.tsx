import { Suspense } from "react";
import { requireOpsModule } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { OwnersHubDashboard } from "@/components/mgmt/OwnersHubDashboard";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireOpsModule("management");
  const { tab } = await searchParams;
  const initialTab = tab === "applications" ? "applications" : "accounts";

  return (
    <MgShell
      title="Owner Accounts & Applications"
      subtitle="Owner logins and linked assets, plus diligence applications and contracts — switch tabs below."
      backHref="/ops/management"
      backLabel="Back to Management"
      activeNavHref="/ops/management/owners"
    >
      <Suspense
        fallback={
          <p className="text-sm opacity-60">Loading owner workspace…</p>
        }
      >
        <OwnersHubDashboard initialTab={initialTab} />
      </Suspense>
    </MgShell>
  );
}
