"use client";

import { FormEvent, Suspense, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { TenantAuthShell } from "@/components/portal/auth/TenantAuthShell";
import { PORTAL_HOME_PATH, FUTURE_TENANT_LOGIN_PATH } from "@/lib/portal/auth";
import { createClient } from "@/lib/supabase/client";
import {
  evaluatePasswordStrength,
  mapAuthErrorMessage,
} from "@/lib/portal/tenant-auth-validation";

function ResetPasswordForm() {
  const router = useRouter();
  const formId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const strength = evaluatePasswordStrength(password);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!strength.ok) {
      setError(
        "Password must be at least 8 characters and include upper, lower, number, and special character."
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(mapAuthErrorMessage(updateError.message, "reset"));
        return;
      }
      setMessage("Password updated. Redirecting to your dashboard…");
      router.push(PORTAL_HOME_PATH);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm sm:p-6"
      noValidate
    >
      <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
        Choose a new password
      </h2>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Open this page from your Supabase reset email link. Your new password is
        sent securely to Supabase Auth.
      </p>

      <div className="form-control mt-5">
        <label className="label" htmlFor={`${formId}-password`}>
          <span className="label-text font-medium">New password</span>
        </label>
        <div className="relative">
          <input
            id={`${formId}-password`}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="input input-bordered min-h-11 w-full pr-12 portal-focus"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm absolute right-1 top-1/2 min-h-9 min-w-9 -translate-y-1/2 portal-focus"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {strength.requirements.map((req) => (
            <li
              key={req.id}
              className={`text-xs ${
                req.met ? "text-success" : "text-[var(--harbor-muted)]"
              }`}
            >
              {req.met ? "✓" : "○"} {req.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="form-control mt-4">
        <label className="label" htmlFor={`${formId}-confirm`}>
          <span className="label-text font-medium">Confirm password</span>
        </label>
        <input
          id={`${formId}-confirm`}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          className="input input-bordered min-h-11 w-full portal-focus"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error ? (
        <div className="alert alert-error mt-4 py-2 text-sm" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      {message ? (
        <div className="alert alert-success mt-4 py-2 text-sm" role="status">
          <span>{message}</span>
        </div>
      ) : null}

      <button
        type="submit"
        className="btn btn-neutral mt-5 min-h-12 w-full"
        disabled={loading}
      >
        {loading ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          "Update password"
        )}
      </button>

      <a
        href={FUTURE_TENANT_LOGIN_PATH}
        className="btn btn-ghost mt-2 min-h-11 w-full"
      >
        Back to login
      </a>
    </form>
  );
}

export default function PortalResetPasswordPage() {
  return (
    <TenantAuthShell
      title="Reset password"
      subtitle="Set a new password for your tenant portal account."
    >
      <Suspense
        fallback={
          <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6 text-sm text-[var(--harbor-muted)]">
            Loading…
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </TenantAuthShell>
  );
}
