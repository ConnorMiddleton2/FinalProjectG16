/**
 * Shared chrome for all `/portal` routes (public apply + private tenant app).
 * Auth gating for private pages lives in `(tenant)/layout.tsx`.
 */
export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
