"use client";

import { useActionState } from "react";
import {
  requestOwnerSpendApproval,
  type StaffApprovalRequestState,
} from "@/app/ops/properties/actions";
import {
  OWNER_SPEND_APPROVAL_THRESHOLD,
  resolveThresholdForAmountCheck,
} from "@/lib/owner-approval-policy";

const initial: StaffApprovalRequestState = {};

export function RequestOwnerApprovalForm({
  propertyId,
  defaultTitle,
  approvalThreshold,
}: {
  propertyId: string;
  defaultTitle?: string;
  /** Per-contract threshold if set on the management agreement. */
  approvalThreshold?: string;
}) {
  const threshold = resolveThresholdForAmountCheck(approvalThreshold);
  const [state, action, pending] = useActionState(
    requestOwnerSpendApproval,
    initial
  );

  return (
    <form
      action={action}
      className="mt-4 space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 p-4"
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <p className="text-sm font-medium text-[var(--harbor-ink)]">
        Request owner spend approval
      </p>
      <p className="text-xs opacity-60">
        Required for expenditures at or above $
        {threshold.toLocaleString()}
        {approvalThreshold?.trim()
          ? " (this contract)"
          : ` (default $${OWNER_SPEND_APPROVAL_THRESHOLD.toLocaleString()})`}
        . The linked property owner will decide in their portal.
      </p>
      <label className="form-control">
        <span className="mb-1 text-xs opacity-70">Title</span>
        <input
          name="title"
          className="input input-bordered input-sm"
          defaultValue={defaultTitle}
          required
        />
      </label>
      <label className="form-control">
        <span className="mb-1 text-xs opacity-70">Amount (USD)</span>
        <input
          name="amount"
          className="input input-bordered input-sm"
          placeholder="2500"
          required
        />
      </label>
      <label className="form-control">
        <span className="mb-1 text-xs opacity-70">Vendor</span>
        <input name="vendorName" className="input input-bordered input-sm" />
      </label>
      <label className="form-control">
        <span className="mb-1 text-xs opacity-70">Description</span>
        <textarea
          name="description"
          className="textarea textarea-bordered textarea-sm"
          rows={2}
        />
      </label>
      <label className="form-control">
        <span className="mb-1 text-xs opacity-70">Staff note to owner</span>
        <textarea
          name="staffNote"
          className="textarea textarea-bordered textarea-sm"
          rows={2}
        />
      </label>
      <label className="form-control">
        <span className="mb-1 text-xs opacity-70">Work order ID (optional)</span>
        <input name="workOrderId" className="input input-bordered input-sm" />
      </label>
      <button type="submit" className="btn btn-neutral btn-sm" disabled={pending}>
        {pending ? "Sending…" : "Send to owner"}
      </button>
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
