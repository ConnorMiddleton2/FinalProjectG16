"use client";

import { useActionState } from "react";
import {
  signApplicationContract,
  type SignContractState,
} from "@/app/owners/status/actions";
import { OwnerAlert } from "@/components/OwnerAlert";
import type { OwnerContract } from "@/lib/management";

const initial: SignContractState = {};

export function OwnerApplicationSignForm({
  contract,
  email,
  applicationId,
  defaultName,
}: {
  contract: OwnerContract;
  email: string;
  applicationId: string;
  defaultName: string;
}) {
  const [state, action, pending] = useActionState(
    signApplicationContract,
    initial
  );

  if (contract.status !== "pending_owner_signature") {
    return (
      <OwnerAlert variant="success" title="Signed">
        {contract.ownerSignatureName
          ? `Signed by ${contract.ownerSignatureName}`
          : "Signed"}
        {contract.ownerSignedAt
          ? ` on ${new Date(contract.ownerSignedAt).toLocaleString()}`
          : ""}
        .
      </OwnerAlert>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="contractId" value={contract.id} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <label className="block w-full">
        <span className="owner-label">Type your full legal name to sign</span>
        <input
          name="signatureName"
          className="owner-input"
          defaultValue={defaultName}
          required
        />
      </label>
      <button
        type="submit"
        className="owner-btn-primary"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Signing…" : "Sign & return to dashboard"}
      </button>
      {state.error ? (
        <OwnerAlert variant="error">{state.error}</OwnerAlert>
      ) : null}
      {state.success ? (
        <OwnerAlert variant="success">{state.success}</OwnerAlert>
      ) : null}
    </form>
  );
}
