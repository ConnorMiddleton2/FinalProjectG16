import { redirect } from "next/navigation";
import { getCurrentOwner } from "@/lib/owner-auth";

/** Public status lookup removed — signed-in owners use the dashboard. */
export default async function OwnerStatusLookupRedirect() {
  const owner = await getCurrentOwner();
  redirect(owner ? "/owners/dashboard" : "/owners");
}
