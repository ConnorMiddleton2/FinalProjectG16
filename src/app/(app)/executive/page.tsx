import { RoleWorkspace } from "@/components/RoleWorkspace";
import { requirePageAccess } from "@/lib/effective-role";

export default async function ExecutivePage() {
  await requirePageAccess("/executive");

  return (
    <RoleWorkspace
      role="executive"
      title="Executive oversight workspace"
      summary="Executives review portfolio health, major approvals, and profitability without performing day-to-day billing edits."
      upcomingModules={[
        "Company KPI summary",
        "Portfolio performance by property",
        "Major expense approval queue",
        "Profitability and fee overview",
      ]}
    />
  );
}
