"use server";

import { claimFutureTenantInvitation } from "@/lib/portal/future-tenant-invite-server";

/** Validate invitation + unit when creating a tenant portal account. */
export async function claimFutureTenantInviteAction(input: {
  invitationCode: string;
  unitNumber: string;
  userId: string;
}) {
  return claimFutureTenantInvitation(input);
}
