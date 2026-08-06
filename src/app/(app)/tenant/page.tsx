import { redirect } from "next/navigation";

/** Staff app /tenant route redirects into the Current Tenant Portal. */
export default function TenantPage() {
  redirect("/portal");
}
