import { redirect } from "next/navigation";
import { clearOwnerSession } from "@/lib/owner-auth";
import { clearTenantPortalSession } from "@/lib/tenant-portal-accounts";
import { clearPortalDemoCookies } from "@/lib/portal/portal-demo-auth-server";

/** Sign out of tenant portal and clear overlapping owner/demo cookies. */
export async function GET() {
  await clearTenantPortalSession();
  await clearPortalDemoCookies();
  await clearOwnerSession();
  redirect("/portal/start");
}
