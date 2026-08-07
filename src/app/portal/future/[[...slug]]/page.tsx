import { redirect } from "next/navigation";
import { PORTAL_START_PATH } from "@/lib/portal/auth";

/**
 * Former Future Tenant Portal routes — permanently redirected to the
 * single tenant entry (browse / apply / sign in).
 */
export default function LegacyFuturePortalRedirect({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  void params;
  redirect(PORTAL_START_PATH);
}
