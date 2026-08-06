"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { claimFutureTenantInviteAction } from "@/app/portal/future-tenant-actions";
import {
  isSafePortalNextPath,
  FUTURE_TENANT_LOGIN_PATH,
  PORTAL_APPLY_PATH,
} from "@/lib/portal/auth";
import { createClient } from "@/lib/supabase/client";
import {
  isTenantAuthDemoMode,
  TENANT_AUTH_DEMO_SAMPLE,
} from "@/lib/portal/tenant-auth-demo";
import { validateTenantInvitation } from "@/lib/portal/tenant-invite";
import {
  evaluatePasswordStrength,
  mapAuthErrorMessage,
  normalizeEmail,
  normalizePhone,
  validateTenantSignup,
  type FieldErrors,
  type TenantSignupValues,
} from "@/lib/portal/tenant-auth-validation";

function emptySignup(demoMode: boolean): TenantSignupValues {
  if (!demoMode) {
    return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      unit: "",
      invitationCode: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    };
  }
  return {
    firstName: TENANT_AUTH_DEMO_SAMPLE.firstName,
    lastName: TENANT_AUTH_DEMO_SAMPLE.lastName,
    email: TENANT_AUTH_DEMO_SAMPLE.email,
    phone: TENANT_AUTH_DEMO_SAMPLE.phone,
    unit: TENANT_AUTH_DEMO_SAMPLE.unit,
    invitationCode: TENANT_AUTH_DEMO_SAMPLE.invitationCode,
    password: TENANT_AUTH_DEMO_SAMPLE.password,
    confirmPassword: TENANT_AUTH_DEMO_SAMPLE.password,
    agreeToTerms: false,
  };
}

export function TenantSignupPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const demoMode = isTenantAuthDemoMode();

  const [values, setValues] = useState<TenantSignupValues>(() =>
    emptySignup(false)
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValues(emptySignup(demoMode));
  }, [demoMode]);

  const strength = useMemo(
    () => evaluatePasswordStrength(values.password),
    [values.password]
  );

  function patch(partial: Partial<TenantSignupValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const fieldErrors = validateTenantSignup(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const invite = validateTenantInvitation(
      values.invitationCode,
      values.unit
    );
    if (!invite.ok) {
      setErrors((prev) => ({
        ...prev,
        invitationCode: invite.message,
      }));
      setError(invite.message);
      return;
    }

    setLoading(true);
    const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`.trim();
    const email = normalizeEmail(values.email);

    try {
      const supabase = createClient();
      const next = searchParams.get("next");
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              next && isSafePortalNextPath(next) ? next : PORTAL_APPLY_PATH
            )}`
          : undefined;

      // Provisional user id for invite claim when session is created immediately.
      // Claim is finalized after signUp returns the real user id.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            first_name: values.firstName.trim(),
            last_name: values.lastName.trim(),
            phone: normalizePhone(values.phone),
            unit_number: invite.invite.unit,
            invitation_code: invite.invite.code,
            property_label: invite.invite.propertyLabel,
            role: "tenant",
            tenant_lifecycle: "future",
          },
        },
      });

      if (signUpError) {
        setError(mapAuthErrorMessage(signUpError.message, "signup"));
        return;
      }

      if (!data.user) {
        setError("Account creation did not return a user. Try signing in.");
        return;
      }

      const claim = await claimFutureTenantInviteAction({
        invitationCode: invite.invite.code,
        unitNumber: invite.invite.unit,
        userId: data.user.id,
      });
      if (!claim.ok) {
        setError(claim.message);
        return;
      }

      try {
        window.sessionStorage.setItem(
          "harborline.portal.futureInviteSeed.v1",
          JSON.stringify({
            propertyLabel: claim.invite.propertyLabel,
            unit: claim.invite.unit,
            invitationCode: claim.invite.code,
          })
        );
      } catch {
        /* ignore */
      }

      // Connect profile role to tenant when a session is available (email confirm off).
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            full_name: fullName,
            role: "tenant",
          },
          { onConflict: "id" }
        );
        if (profileError) {
          // Trigger may already create the row; role metadata still carries tenant.
          console.warn("Tenant profile upsert:", profileError.message);
        }
      }

      if (data.session) {
        setMessage("Account created. Opening your move-in portal…");
        const destination =
          next && isSafePortalNextPath(next) ? next : PORTAL_APPLY_PATH;
        router.push(destination);
        router.refresh();
        return;
      }

      setMessage(
        "Account created. Check your email to verify your address, then sign in. Your invitation code was validated and linked to your unit."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create your tenant account."
      );
    } finally {
      setLoading(false);
    }
  }

  const loginHref = `${FUTURE_TENANT_LOGIN_PATH}${
    searchParams.get("next")
      ? `?next=${encodeURIComponent(searchParams.get("next")!)}`
      : `?next=${encodeURIComponent(PORTAL_APPLY_PATH)}`
  }`;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm sm:p-6"
      noValidate
    >
      <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
        Tenant signup
      </h2>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Create an account with a valid invitation code from Harborline. You will
        only access records for your own unit.
      </p>

      {demoMode ? (
        <p
          className="mt-3 rounded-xl border border-[var(--harbor-mid)]/25 bg-[var(--harbor-mist)]/60 px-3 py-2 text-xs text-[var(--harbor-ink)]/80"
          role="note"
        >
          Demo sample fields are prefilled (including invitation code{" "}
          {TENANT_AUTH_DEMO_SAMPLE.invitationCode}). Submitting still goes
          through Supabase auth — nothing is auto-created without your click.
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          id={`${formId}-first`}
          label="First name"
          value={values.firstName}
          error={errors.firstName}
          autoComplete="given-name"
          onChange={(v) => patch({ firstName: v })}
          required
        />
        <Field
          id={`${formId}-last`}
          label="Last name"
          value={values.lastName}
          error={errors.lastName}
          autoComplete="family-name"
          onChange={(v) => patch({ lastName: v })}
          required
        />
        <div className="sm:col-span-2">
          <Field
            id={`${formId}-email`}
            label="Email address"
            type="email"
            value={values.email}
            error={errors.email}
            autoComplete="email"
            onChange={(v) => patch({ email: v })}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Field
            id={`${formId}-phone`}
            label="Phone number"
            type="tel"
            value={values.phone}
            error={errors.phone}
            autoComplete="tel"
            onChange={(v) => patch({ phone: v })}
            required
          />
        </div>
        <Field
          id={`${formId}-unit`}
          label="Property or unit number"
          value={values.unit}
          error={errors.unit}
          autoComplete="off"
          onChange={(v) => patch({ unit: v })}
          required
        />
        <Field
          id={`${formId}-invite`}
          label="Invitation / registration code"
          value={values.invitationCode}
          error={errors.invitationCode}
          autoComplete="off"
          onChange={(v) => patch({ invitationCode: v })}
          required
        />

        <div className="sm:col-span-2">
          <PasswordField
            id={`${formId}-password`}
            label="Password"
            value={values.password}
            error={errors.password}
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            autoComplete="new-password"
            onChange={(v) => patch({ password: v })}
          />
          <ul className="mt-2 space-y-1" aria-label="Password requirements">
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

        <div className="sm:col-span-2">
          <PasswordField
            id={`${formId}-confirm`}
            label="Confirm password"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            autoComplete="new-password"
            onChange={(v) => patch({ confirmPassword: v })}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-[var(--harbor-ink)]">
            <input
              type="checkbox"
              className="checkbox checkbox-sm mt-1"
              checked={values.agreeToTerms}
              onChange={(e) => patch({ agreeToTerms: e.target.checked })}
              aria-invalid={Boolean(errors.agreeToTerms)}
              aria-describedby={
                errors.agreeToTerms ? `${formId}-terms-error` : undefined
              }
            />
            <span>
              I agree to the Harborline{" "}
              <span className="font-medium">terms of use</span> and{" "}
              <span className="font-medium">privacy policy</span>.
            </span>
          </label>
          {errors.agreeToTerms ? (
            <p
              id={`${formId}-terms-error`}
              className="mt-1 text-sm text-error"
              role="alert"
            >
              {errors.agreeToTerms}
            </p>
          ) : null}
        </div>
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
          "Create account"
        )}
      </button>

      <p className="mt-4 text-center text-sm text-[var(--harbor-muted)]">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="link link-hover font-medium text-[var(--harbor-deep)]"
        >
          Back to login
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="form-control">
      <label className="label" htmlFor={id}>
        <span className="label-text font-medium">{label}</span>
      </label>
      <input
        id={id}
        type={type}
        className="input input-bordered min-h-11 w-full portal-focus"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  error,
  show,
  onToggle,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="form-control">
      <label className="label" htmlFor={id}>
        <span className="label-text font-medium">{label}</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          className="input input-bordered min-h-11 w-full pr-12 portal-focus"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm absolute right-1 top-1/2 min-h-9 min-w-9 -translate-y-1/2 portal-focus"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
