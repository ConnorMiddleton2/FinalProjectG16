import { PortalPlaceholderPage } from "@/components/portal/PortalPlaceholderPage";

export default function PortalMessagesPage() {
  return (
    <PortalPlaceholderPage
      actions={[{ href: "/portal/announcements", label: "Announcements" }]}
    />
  );
}
