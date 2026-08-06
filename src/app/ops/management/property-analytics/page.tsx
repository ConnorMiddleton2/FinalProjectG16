import { redirect } from "next/navigation";
import { requireOpsModule } from "@/lib/team-auth";

/** Property analytics lives under the combined Analytics dashboard. */
export default async function PropertyAnalyticsRedirect() {
  await requireOpsModule("management");
  redirect("/ops/management/analytics");
}
