"use client";

import { useActionState } from "react";
import { OwnerAlert } from "@/components/OwnerAlert";
import {
  ownerChangePassword,
  type OwnerDashState,
} from "@/app/owners/dashboard/actions";

const initial: OwnerDashState = {};

export function OwnerChangePasswordForm() {
  const [state, action, pending] = useActionState(ownerChangePassword, initial);

  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <label className="block w-full">
        <span className="owner-label">Current password</span>
        <input
          type="password"
          name="currentPassword"
          className="owner-input"
          required
          autoComplete="current-password"
        />
      </label>
      <label className="block w-full">
        <span className="owner-label">New password (min 8)</span>
        <input
          type="password"
          name="newPassword"
          className="owner-input"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <button
        type="submit"
        className="owner-btn-primary owner-btn-primary-sm w-fit"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Saving…" : "Update password"}
      </button>
      {state.error ? <OwnerAlert variant="error">{state.error}</OwnerAlert> : null}
      {state.success ? (
        <OwnerAlert variant="success">{state.success}</OwnerAlert>
      ) : null}
    </form>
  );
}
