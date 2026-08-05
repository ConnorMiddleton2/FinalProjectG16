import { PartyInviteWorkflow } from "@/components/portal/PartyInviteWorkflow";

type Props = { params: Promise<{ token: string }> };

export default async function PartyInvitePage({ params }: Props) {
  const { token } = await params;
  return <PartyInviteWorkflow token={token} />;
}
