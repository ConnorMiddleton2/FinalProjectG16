import { LeaseOfferReview } from "@/components/portal/LeaseOfferReview";

type Props = { params: Promise<{ offerId: string }> };

export default async function LeaseOfferPage({ params }: Props) {
  const { offerId } = await params;
  return <LeaseOfferReview offerId={offerId} />;
}
