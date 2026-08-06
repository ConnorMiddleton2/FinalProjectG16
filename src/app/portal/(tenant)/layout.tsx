import { requirePortalTenant } from "@/lib/portal/auth-server";
import { headers } from "next/headers";
import { PortalShell } from "@/components/portal/PortalShell";

/**
 * Private current-tenant portal routes.
 * Requires authenticated Supabase user with profiles.role === "tenant".
 */
export default async function PortalTenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const nextPath =
    headerList.get("x-portal-pathname") ??
    headerList.get("next-url") ??
    "/portal";

  const session = await requirePortalTenant(
    nextPath.startsWith("/portal") ? nextPath : "/portal"
  );

  return (
    <PortalShell
      email={session.email}
      displayName={session.displayName}
      isSignedIn
    >
      {children}
    </PortalShell>
  );
}
