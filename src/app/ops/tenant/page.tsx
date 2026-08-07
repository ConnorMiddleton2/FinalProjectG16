import { Suspense } from "react";
import { TenantDashboard } from "@/components/TenantDashboard";
import { requireOpsModule } from "@/lib/team-auth";

export default async function OpsTenantPage() {
  await requireOpsModule("tenant");

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm opacity-60">
          Loading tenants…
        </div>
      }
    >
      <TenantDashboard />
    </Suspense>
  );
}
