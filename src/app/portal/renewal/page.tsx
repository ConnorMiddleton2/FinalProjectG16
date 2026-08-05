import { PortalPlaceholderPage } from "@/components/portal/PortalPlaceholderPage";

export default function PortalRenewalPage() {
  return (
    <PortalPlaceholderPage
      actions={[
        { href: "/portal/lease", label: "Lease information" },
        { href: "/portal/move-out", label: "Move-out notice" },
      ]}
    />
  );
}
