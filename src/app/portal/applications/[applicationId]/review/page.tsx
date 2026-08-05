import { PortalPlaceholder } from "@/components/portal/PortalPlaceholder";

type Props = { params: Promise<{ applicationId: string }> };

export default async function ApplicationReviewPage({ params }: Props) {
  const { applicationId } = await params;
  return <PortalPlaceholder title="Review and certification" description={`Review and certify application ${applicationId} before submission.`} />;
}