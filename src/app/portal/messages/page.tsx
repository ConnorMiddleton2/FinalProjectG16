import { PortalPlaceholder } from "@/components/portal/PortalPlaceholder";

export default function MessagesPage() {
  return (
    <PortalPlaceholder
      title="Messages"
      description="Contact Harborline leasing and keep application conversations in one place."
      related={[{ href: "/portal/tours", label: "Schedule a tour" }]}
    />
  );
}