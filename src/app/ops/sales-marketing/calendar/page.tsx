import { requireOpsModule } from "@/lib/team-auth";
import { SmShell } from "@/components/sm/SmShell";
import { CalendarDashboard } from "@/components/sm/CalendarDashboard";

export default async function SmCalendarPage() {
  await requireOpsModule("sales-marketing");

  return (
    <SmShell
      title="Calendar"
      subtitle="Schedule tours, media events, and meetings. Filter by day, week, month, or year."
      backHref="/ops/sales-marketing"
      backLabel="Back to Sales & Marketing"
    >
      <CalendarDashboard />
    </SmShell>
  );
}
