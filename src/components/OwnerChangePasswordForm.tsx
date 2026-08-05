"use client";

import { useActionState } from "react";
import {
  ownerChangePassword,
  type OwnerDashState,
} from "@/app/owners/dashboard/actions";

const initial: OwnerDashState = {};

export function OwnerChangePasswordForm() {
  const [state, action, pending] = useActionState(ownerChangePassword, initial);

  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <label className="form-control">
        <span className="mb-1 text-xs opacity-70">Current password</span>
        <input
          type="password"
          name="currentPassword"
          className="input input-bordered input-sm"
          required
          autoComplete="current-password"
        />
      </label>
      <label className="form-control">
        <span className="mb-1 text-xs opacity-70">New password (min 8)</span>
        <input
          type="password"
          name="newPassword"
          className="input input-bordered input-sm"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" className="btn btn-neutral btn-sm w-fit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
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
