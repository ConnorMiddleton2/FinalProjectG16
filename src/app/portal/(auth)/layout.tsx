/**
 * Auth route group for current-tenant login / signup / reset-password.
 * Intentionally bare — pages render TenantAuthShell themselves.
 */
export default function PortalAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
