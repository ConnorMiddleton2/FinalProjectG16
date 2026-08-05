import { redirect } from "next/navigation";
import { hasTeamAccess } from "@/lib/team-auth";
import { MgShell } from "@/components/mgmt/MgShell";
import { MissedPaymentsDashboard } from "@/components/mgmt/MissedPaymentsDashboard";

export default async function Page() {
  if (!(await hasTeamAccess())) redirect("/team");
  return (
    <MgShell
      title="Missed payments"
      subtitle="Delinquency track records, foreclosure risk, and escalation steps."
      backHref="/ops/management"
      backLabel="Back to Management"
    >
      <MissedPaymentsDashboard />
    </MgShell>
  );
}
