import { PortalPlaceholder } from "@/components/portal/PortalPlaceholder";

type Props = { params: Promise<{ applicationId: string }> };

export default async function ApplicationFeePage({ params }: Props) {
  const { applicationId } = await params;
  return <PortalPlaceholder title="Application fee" description={`Review the application fee for application ${applicationId}.`} />;
}