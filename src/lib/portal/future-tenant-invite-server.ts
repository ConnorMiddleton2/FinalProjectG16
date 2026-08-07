/**
 * Server-side invitation validation for future-tenant registration.
 * Uses an in-memory + durable demo registry (shared_records when available).
 * BACKEND_TODO: lease_invitations table + RLS.
 */

import { createClient } from "@/lib/supabase/server";
import {
  normalizeInviteCode,
  normalizeUnitNumber,
  type TenantInviteRecord,
} from "@/lib/portal/tenant-invite";

type InviteRow = TenantInviteRecord & {
  expiresAt: string;
  usedByUserId?: string | null;
  usedAt?: string | null;
  applicationId?: string | null;
  maxUses: number;
  useCount: number;
};

const STATIC_INVITES: InviteRow[] = [
  {
    code: "DEMO204",
    unit: "204",
    propertyLabel: "CPMC Demo Residences · Unit 204",
    demoFixture: true,
    expiresAt: "2027-12-31T23:59:59.000Z",
    usedByUserId: null,
    usedAt: null,
    applicationId: "app-demo-204",
    maxUses: 25,
    useCount: 0,
  },
  {
    code: "PIER12-210",
    unit: "210",
    propertyLabel: "Pier 12 · Suite 210",
    demoFixture: true,
    expiresAt: "2027-12-31T23:59:59.000Z",
    usedByUserId: null,
    usedAt: null,
    applicationId: "app-pier12-210",
    maxUses: 25,
    useCount: 0,
  },
];

const COLLECTION = "future_tenant_invites";

export type ClaimInviteResult =
  | {
      ok: true;
      invite: {
        code: string;
        unit: string;
        propertyLabel: string;
        applicationId: string | null;
      };
    }
  | { ok: false; message: string };

async function loadInviteOverrides(): Promise<Record<string, InviteRow>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shared_records")
      .select("id, payload")
      .eq("collection", COLLECTION);
    if (error || !data) return {};
    const map: Record<string, InviteRow> = {};
    for (const row of data) {
      const payload = (row.payload ?? {}) as InviteRow;
      if (payload.code) map[normalizeInviteCode(payload.code)] = payload;
    }
    return map;
  } catch {
    return {};
  }
}

async function persistInvite(invite: InviteRow) {
  try {
    const supabase = await createClient();
    await supabase.from("shared_records").upsert(
      {
        id: `invite-${invite.code}`,
        collection: COLLECTION,
        payload: invite as unknown as Record<string, unknown>,
      },
      { onConflict: "collection,id" }
    );
  } catch {
    /* Demo environments may lack write access — validation still runs in-memory. */
  }
}

function mergeInvite(
  base: InviteRow,
  override?: InviteRow
): InviteRow {
  if (!override) return { ...base };
  return { ...base, ...override, code: base.code };
}

/**
 * Validates and claims an invitation for a newly registered future tenant.
 * Prevents expired / exhausted codes and unit mismatches.
 */
export async function claimFutureTenantInvitation(input: {
  invitationCode: string;
  unitNumber: string;
  userId: string;
}): Promise<ClaimInviteResult> {
  const code = normalizeInviteCode(input.invitationCode);
  const unit = normalizeUnitNumber(input.unitNumber);
  if (!code) {
    return { ok: false, message: "Invitation or registration code is required." };
  }
  if (!unit) {
    return { ok: false, message: "Property or unit number is required." };
  }

  const base = STATIC_INVITES.find((row) => row.code === code);
  if (!base) {
    return {
      ok: false,
      message:
        "That invitation code is not valid. Public registration without an invite is not allowed.",
    };
  }

  const overrides = await loadInviteOverrides();
  const invite = mergeInvite(base, overrides[code]);

  if (normalizeUnitNumber(invite.unit) !== unit) {
    return {
      ok: false,
      message:
        "The unit number does not match this invitation. You cannot claim another applicant’s unit.",
    };
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return {
      ok: false,
      message: "This invitation code has expired. Contact CPMC leasing.",
    };
  }

  if (invite.useCount >= invite.maxUses) {
    return {
      ok: false,
      message: "This invitation code has already been fully used.",
    };
  }

  if (
    invite.usedByUserId &&
    invite.usedByUserId !== input.userId &&
    invite.maxUses <= 1
  ) {
    return {
      ok: false,
      message: "This invitation code is already linked to another account.",
    };
  }

  const next: InviteRow = {
    ...invite,
    useCount: invite.useCount + 1,
    usedByUserId: input.userId,
    usedAt: new Date().toISOString(),
  };
  await persistInvite(next);

  return {
    ok: true,
    invite: {
      code: next.code,
      unit: next.unit,
      propertyLabel: next.propertyLabel,
      applicationId: next.applicationId ?? null,
    },
  };
}
