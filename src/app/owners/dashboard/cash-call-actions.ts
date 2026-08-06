"use server";

import { getCurrentOwner } from "@/lib/owner-auth";
import { fundOwnerCashCall } from "@/lib/bank-accounts";
import { createClient } from "@/lib/supabase/server";
import { COLLECTIONS, listSharedRecords } from "@/lib/shared-store";
import type { OwnerCashCall } from "@/lib/bank-accounts-shared";
import { revalidatePath } from "next/cache";

export async function fundOwnerCashCallAsOwner(input: { cashCallId: string }) {
  const owner = await getCurrentOwner();
  if (!owner) return { error: "Sign in as an owner to fund this request." as const };

  const client = await createClient();
  const calls = await listSharedRecords<OwnerCashCall>(
    client,
    COLLECTIONS.ownerCashCalls
  );
  const call = calls.find((c) => c.id === input.cashCallId);
  if (!call) return { error: "Cash call not found." as const };
  if (
    call.ownerEmail.toLowerCase() !== owner.email.toLowerCase() &&
    call.ownerAccountId !== owner.id
  ) {
    return { error: "This cash call is not assigned to your account." as const };
  }

  const result = await fundOwnerCashCall({ cashCallId: input.cashCallId });
  revalidatePath("/owners/dashboard");
  return result;
}
