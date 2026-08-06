import { FutureUnitDetailPage } from "@/components/portal/future/FutureUnitDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FutureUnitDetailRoutePage({ params }: Props) {
  const { id } = await params;
  return <FutureUnitDetailPage unitId={id} />;
}
