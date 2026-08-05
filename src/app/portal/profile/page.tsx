import { PortalPlaceholderPage } from "@/components/portal/PortalPlaceholderPage";

export default function PortalProfilePage() {
  return (
    <PortalPlaceholderPage
      actions={[{ href: "/portal", label: "Back to dashboard" }]}
    />
  );
}
