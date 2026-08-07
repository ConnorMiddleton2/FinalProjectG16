import { redirect } from "next/navigation";
import { PORTAL_APPLY_PATH } from "@/lib/portal/auth";

/** Legacy /portal/apply → public start-application form (no auth required). */
export default function PortalApplyRedirectPage() {
  redirect(PORTAL_APPLY_PATH);
}
