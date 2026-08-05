import { MaintenanceRequestDetail } from "@/components/portal/maintenance/MaintenanceRequestDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PortalMaintenanceDetailPage({ params }: Props) {
  const { id } = await params;

  return <MaintenanceRequestDetail requestId={id} />;
}
