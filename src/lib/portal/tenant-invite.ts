/**
 * Invitation / registration codes for tenant signup.
 * Demo registry only — production should validate against a server table.
 *
 * BACKEND_TODO: replace with lease_invitations (code, unit_id, expires_at, used_by).
 */

export type TenantInviteRecord = {
  code: string;
  unit: string;
  propertyLabel: string;
  /** Optional fixture scope for known demo properties. */
  demoFixture?: boolean;
};

const DEMO_INVITES: TenantInviteRecord[] = [
  {
    code: "DEMO204",
    unit: "204",
    propertyLabel: "CPMC Demo Residences · Unit 204",
    demoFixture: true,
  },
  {
    code: "PIER12-210",
    unit: "210",
    propertyLabel: "Pier 12 · Suite 210",
    demoFixture: true,
  },
];

export type InviteValidationResult =
  | { ok: true; invite: TenantInviteRecord }
  | { ok: false; message: string };

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeUnitNumber(unit: string) {
  return unit.trim().toUpperCase().replace(/^UNIT\s+/i, "");
}

/**
 * Validates invitation code + unit pairing.
 * Does not create accounts or mutate storage.
 */
export function validateTenantInvitation(
  invitationCode: string,
  unitNumber: string
): InviteValidationResult {
  const code = normalizeInviteCode(invitationCode);
  const unit = normalizeUnitNumber(unitNumber);

  if (!code) {
    return { ok: false, message: "Invitation or registration code is required." };
  }
  if (!unit) {
    return { ok: false, message: "Property or unit number is required." };
  }

  const invite = DEMO_INVITES.find((row) => row.code === code);
  if (!invite) {
    return {
      ok: false,
      message:
        "That invitation code is not valid. Check the code from CPMC management and try again.",
    };
  }

  if (normalizeUnitNumber(invite.unit) !== unit) {
    return {
      ok: false,
      message:
        "The unit number does not match this invitation code. Use the unit listed on your invite.",
    };
  }

  return { ok: true, invite };
}

export function listDemoInviteCodesForDocs() {
  return DEMO_INVITES.map((row) => row.code);
}
