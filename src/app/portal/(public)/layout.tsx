import { headers } from "next/headers";
import { PortalPublicShell } from "@/components/portal/PortalPublicShell";

/**
 * Public portal routes (future-tenant apply, unauthorized).
 * Uses lightweight public chrome — not the current-tenant nav shell.
 */
export default async function PortalPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname =
    headerList.get("x-portal-pathname") ??
    headerList.get("next-url") ??
    "/portal/apply";

  return (
    <PortalPublicShell pathname={pathname}>{children}</PortalPublicShell>
  );
}
