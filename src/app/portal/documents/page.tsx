import { PortalPlaceholderPage } from "@/components/portal/PortalPlaceholderPage";

export default function PortalDocumentsPage() {
  return (
    <PortalPlaceholderPage
      actions={[{ href: "/portal/lease", label: "Lease information" }]}
    />
  );
}
