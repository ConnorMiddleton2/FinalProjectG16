"use server";

import { claimFutureTenantInvitation } from "@/lib/portal/future-tenant-invite-server";
import { createClient } from "@/lib/supabase/server";
import { getPortalDemoSessionFromCookie } from "@/lib/portal/portal-demo-auth-server";

export async function claimFutureTenantInviteAction(input: {
  invitationCode: string;
  unitNumber: string;
  userId: string;
}) {
  return claimFutureTenantInvitation(input);
}

/**
 * Transition an approved future tenant to current tenant after move-in requirements
 * and lease start are confirmed. Preserves auth identity (no duplicate accounts).
 */
export async function convertFutureTenantToCurrentAction(input: {
  leaseStartDate: string;
  readinessComplete: boolean;
  /** Management-attested lease start confirmation (demo / staff action). */
  managementConfirmed?: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!input.readinessComplete) {
    return {
      ok: false,
      message:
        "Move-in requirements are incomplete. Finish blocking checklist items first.",
    };
  }

  const start = new Date(`${input.leaseStartDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, message: "Invalid lease start date." };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leaseStarted = start.getTime() <= today.getTime();
  if (!leaseStarted && !input.managementConfirmed) {
    return {
      ok: false,
      message:
        "Lease has not started yet. Management must confirm lease start before converting to current tenant.",
    };
  }

  const demo = await getPortalDemoSessionFromCookie();
  if (demo) {
    // Demo cookie sessions flip lifecycle on the client after this succeeds.
    return { ok: true };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, message: "You must be signed in to complete this step." };
    }

    const meta = user.user_metadata ?? {};
    if (meta.tenant_lifecycle === "current") {
      return { ok: true };
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        ...meta,
        tenant_lifecycle: "current",
      },
    });
    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Could not update tenant lifecycle.",
    };
  }
}
