import { redirect } from "next/navigation";
import { hasTeamAccess } from "@/lib/team-auth";
import { SmShell } from "@/components/sm/SmShell";
import { CampaignsDashboard } from "@/components/sm/CampaignsDashboard";

export default async function SmCampaignsPage() {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  return (
    <SmShell
      title="Advertisement campaigns and costs"
      subtitle="List every sales and marketing campaign — ads, sponsorships, events — with spend and ROI."
      backHref="/ops/sales-marketing"
      backLabel="Back to Sales & Marketing"
      activeNavHref="/ops/sales-marketing/campaigns"
    >
      <CampaignsDashboard />
    </SmShell>
  );
}
