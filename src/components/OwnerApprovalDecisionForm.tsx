"use client";

import { useActionState } from "react";
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
    <form action={action} className="space-y-3 border-t border-base-300 pt-3">
      <input type="hidden" name="approvalId" value={approvalId} />
      <label className="form-control">
        <span className="mb-1 text-xs opacity-70">Comment (optional)</span>
        <textarea
          name="comment"
          className="textarea textarea-bordered textarea-sm"
          rows={2}
          placeholder="Optional note for Harborline"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          className="btn btn-neutral btn-sm"
          disabled={pending}
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          className="btn btn-outline btn-error btn-sm"
          disabled={pending}
        >
          Reject
        </button>
      </div>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
