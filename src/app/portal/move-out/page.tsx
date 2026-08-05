import { PortalPlaceholderPage } from "@/components/portal/PortalPlaceholderPage";

export default function PortalMoveOutPage() {
  return (
    <PortalPlaceholderPage
      actions={[
        { href: "/portal/lease", label: "Lease information" },
        { href: "/portal/renewal", label: "Renewal request" },
      ]}
    />
  );
}
