import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import {
  getOwnerApplicationById,
  type OwnerApplication,
} from "@/lib/owner-auth";
import type { OwnerContract } from "@/lib/management";

/** Full application only when the email matches the record (public status flow). */
export async function getOwnerApplicationDetailForEmail(input: {
  id: string;
  email: string;
}): Promise<
  { ok: true; application: OwnerApplication } | { error: string }
> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.id.trim()) {
    return { error: "Email and application ID are required." };
  }

  const application = await getOwnerApplicationById(input.id.trim());
  if (!application || application.email.toLowerCase() !== email) {
    return { error: "Application not found for that email." };
  }

  return { ok: true, application };
}

export async function listOwnerProposedContracts(
  email: string
): Promise<OwnerContract[]> {
  const client = await createClient();
  const rows = await listSharedRecords<OwnerContract>(
    client,
    COLLECTIONS.ownerContracts
  );
  const needle = email.trim().toLowerCase();
  return rows.filter((c) => c.ownerEmail.toLowerCase() === needle);
}

export async function signOwnerProposedContract(input: {
  contractId: string;
  email: string;
  applicationId: string;
  signatureName: string;
}) {
  const email = input.email.trim().toLowerCase();
  const signatureName = input.signatureName.trim();
  if (!email || !signatureName) {
    return { error: "Email and signature name are required." as const };
  }

  const detail = await getOwnerApplicationDetailForEmail({
    id: input.applicationId,
    email,
  });
  if ("error" in detail) {
    return { error: detail.error };
  }

  const contracts = await listOwnerProposedContracts(email);
  const contract = contracts.find((c) => c.id === input.contractId);
  if (!contract) {
    return { error: "Contract not found." as const };
  }
  if (contract.status !== "pending_owner_signature") {
    return { error: "This contract is not awaiting your signature." as const };
  }
  if (
    contract.relatedApplicationId &&
    contract.relatedApplicationId !== detail.application.id
  ) {
    return { error: "Contract does not match this application." as const };
  }

  const updatedContract: OwnerContract = {
    ...contract,
    status: "signed_by_owner",
    ownerSignedAt: new Date().toISOString(),
    ownerSignatureName: signatureName,
  };

  const updatedApp: OwnerApplication = {
    ...detail.application,
    mgmtStatus: "owner_signed",
    accountMessage: `Contract signed and returned to Harborline on ${new Date().toLocaleString()}. Awaiting account provisioning.`,
  };

  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerContracts,
    updatedContract.id,
    updatedContract as unknown as Record<string, unknown>
  );
  await upsertSharedRecord(
    client,
    COLLECTIONS.ownerApplications,
    updatedApp.id,
    updatedApp as unknown as Record<string, unknown>
  );

  return { ok: true as const, contract: updatedContract };
}
