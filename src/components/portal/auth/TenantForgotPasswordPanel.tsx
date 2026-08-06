"use client";

import { FormEvent, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isValidEmail,
  mapAuthErrorMessage,
  normalizeEmail,
} from "@/lib/portal/tenant-auth-validation";
import { PORTAL_RESET_PASSWORD_PATH } from "@/lib/portal/auth";

type Props = {
  onBack: () => void;
};

export function TenantForgotPasswordPanel({ onBack }: Props) {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        PORTAL_RESET_PASSWORD_PATH
      )}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizeEmail(email),
        { redirectTo }
      );
      if (resetError) {
        setError(mapAuthErrorMessage(resetError.message, "reset"));
        return;
      }
      setMessage(
        "If an account exists for that email, a password reset link has been sent. Check your inbox."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start password reset."
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
        Reset password
      </h2>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        We will email a secure Supabase reset link. Passwords are never shown or
        stored in plain text in this app.
      </p>

      <div className="form-control mt-5">
        <label className="label" htmlFor={`${formId}-email`}>
          <span className="label-text font-medium">Email address</span>
        </label>
        <input
          id={`${formId}-email`}
          type="email"
          autoComplete="email"
          className="input input-bordered min-h-11 w-full portal-focus"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          "Send reset link"
        )}
      </button>

      <button
        type="button"
        className="btn btn-ghost mt-2 min-h-11 w-full"
        onClick={onBack}
      >
        Back to login
      </button>
    </form>
  );
}
