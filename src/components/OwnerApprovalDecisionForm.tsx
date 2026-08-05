"use client";

import { useActionState } from "react";
import { OwnerAlert } from "@/components/OwnerAlert";
import {
  ownerDecideApproval,
  type OwnerDashState,
} from "@/app/owners/dashboard/actions";

const initial: OwnerDashState = {};

export function OwnerApprovalDecisionForm({
  approvalId,
}: {
  approvalId: string;
}) {
  const [state, action, pending] = useActionState(ownerDecideApproval, initial);

  return (
    <form
      action={action}
      className="space-y-3 border-t border-[var(--harbor-deep)]/10 pt-3"
    >
      <input type="hidden" name="approvalId" value={approvalId} />
      <label className="block w-full">
        <span className="owner-label">Comment (optional)</span>
        <textarea
          name="comment"
          className="owner-input min-h-20 py-3"
          rows={2}
          placeholder="Optional note for Harborline"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          className="owner-btn-primary owner-btn-primary-sm"
          disabled={pending}
          aria-busy={pending}
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          className="owner-btn-danger"
          disabled={pending}
        >
          Reject
        </button>
      </div>
      {state.error ? <OwnerAlert variant="error">{state.error}</OwnerAlert> : null}
      {state.success ? (
        <OwnerAlert variant="success">{state.success}</OwnerAlert>
      ) : null}
    </form>
  );
}
