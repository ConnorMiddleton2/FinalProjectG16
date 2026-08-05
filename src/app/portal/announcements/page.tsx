import { PortalPlaceholderPage } from "@/components/portal/PortalPlaceholderPage";

export default function PortalAnnouncementsPage() {
  return (
    <PortalPlaceholderPage
      actions={[{ href: "/portal/messages", label: "Messages" }]}
    />
  );
}
