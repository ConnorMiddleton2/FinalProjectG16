import { requirePortalTenant } from "@/lib/portal/auth-server";
import { headers } from "next/headers";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalSessionProvider } from "@/components/portal/PortalSessionContext";

/**
 * Private tenant portal routes.
 * Accepts tenant_accounts cookie (prospects), demo cookie, or Supabase tenant role.
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
    <PortalSessionProvider session={session}>
      <PortalShell
        email={session.email}
        displayName={session.displayName}
        isSignedIn
      >
        {children}
      </PortalShell>
    </PortalSessionProvider>
  );
}
