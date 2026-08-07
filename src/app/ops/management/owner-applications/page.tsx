import { redirect } from "next/navigation";
import { requireOpsModule } from "@/lib/team-auth";

/** Applications live under Owner Accounts & Applications. */
export default async function Page() {
  await requireOpsModule("management");
  redirect("/ops/management/owners?tab=applications");
}
