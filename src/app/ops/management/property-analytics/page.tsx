import { redirect } from "next/navigation";

/** Property analytics now lives under the combined Analytics dashboard. */
export default function PropertyAnalyticsRedirect() {
  redirect("/ops/management/analytics");
}
