import { redirect } from "next/navigation";
import { PropertyDetailPageClient } from "@/components/PropertyDetailPageClient";
import { hasTeamAccess } from "@/lib/team-auth";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OpsPropertyDetailPage({ params }: Props) {
  if (!(await hasTeamAccess())) {
    redirect("/team");
  }

  const { id } = await params;

  return <PropertyDetailPageClient propertyId={id} />;
}
