import { PortalPlaceholder } from "@/components/portal/PortalPlaceholder";

type Props = { params: Promise<{ offerId: string }> };

export default async function LeaseOfferPage({ params }: Props) {
  const { offerId } = await params;
  return <PortalPlaceholder title="Lease offer" description={`Review the terms and next steps for lease offer ${offerId}.`} />;
}