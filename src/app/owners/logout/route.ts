import { redirect } from "next/navigation";
import { clearOwnerSession } from "@/lib/owner-auth";
import { clearTenantPortalSession } from "@/lib/tenant-portal-accounts";
import { clearPortalDemoCookies } from "@/lib/portal/portal-demo-auth-server";

/** Sign out of owner portal and clear any lingering tenant portal cookies. */
export async function GET() {
  await clearOwnerSession();
  await clearTenantPortalSession();
  await clearPortalDemoCookies();
  redirect("/owners");
}
