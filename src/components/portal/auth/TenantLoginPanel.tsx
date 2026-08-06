"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { portalDemoLogin } from "@/app/portal/demo-actions";
import {
  isFutureTenantApplyPath,
  isSafePortalNextPath,
  PORTAL_HOME_PATH,
  PORTAL_SIGNUP_PATH,
} from "@/lib/portal/auth";
import {
  isPortalDemoCredentials,
  PORTAL_DEMO_SESSION_STORAGE_KEY,
  PORTAL_DEMO_TENANT,
} from "@/lib/portal/portal-demo-auth";
import { createClient } from "@/lib/supabase/client";
import {
  isTenantAuthDemoMode,
  TENANT_AUTH_DEMO_SAMPLE,
} from "@/lib/portal/tenant-auth-demo";
import {
  mapAuthErrorMessage,
  normalizeEmail,
  validateTenantLogin,
  type FieldErrors,
} from "@/lib/portal/tenant-auth-validation";

const REMEMBER_EMAIL_KEY = "harborline.portal.rememberEmail.v1";

type Props = {
  onForgotPassword: () => void;
};

export function TenantLoginPanel({ onForgotPassword }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const demoMode = isTenantAuthDemoMode();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      window.sessionStorage.removeItem(PORTAL_DEMO_SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    let remembered = "";
    try {
      remembered = window.localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
    } catch {
      /* ignore */
    }

    if (demoMode) {
      setEmail(remembered || TENANT_AUTH_DEMO_SAMPLE.email);
      setPassword(TENANT_AUTH_DEMO_SAMPLE.password);
      setRememberMe(true);
    } else if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, [demoMode]);

  async function resolveDestination(): Promise<string> {
    const next = searchParams.get("next");
    if (next && isSafePortalNextPath(next)) return next;

    return PORTAL_HOME_PATH;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const fieldErrors = validateTenantLogin({ email, password, rememberMe });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    const next = searchParams.get("next");
    const portalDestination =
      next && isSafePortalNextPath(next) ? next : PORTAL_HOME_PATH;

    try {
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, normalizeEmail(email));
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      /* ignore */
    }

    if (isPortalDemoCredentials(email, password)) {
      const isFuturePath = isFutureTenantApplyPath(portalDestination);
      try {
        window.sessionStorage.setItem(
          PORTAL_DEMO_SESSION_STORAGE_KEY,
          JSON.stringify({
            ...PORTAL_DEMO_TENANT,
            email: normalizeEmail(email),
            displayName:
              normalizeEmail(email) === TENANT_AUTH_DEMO_SAMPLE.email
                ? `${TENANT_AUTH_DEMO_SAMPLE.firstName} ${TENANT_AUTH_DEMO_SAMPLE.lastName}`
                : PORTAL_DEMO_TENANT.displayName,
            lifecycle: isFuturePath ? "future" : "current",
            tenantScopeId: isFuturePath
              ? `future-${normalizeEmail(email)}`
              : PORTAL_DEMO_TENANT.tenantScopeId,
          })
        );
        if (isFuturePath) {
          window.sessionStorage.setItem(
            "harborline.portal.futureInviteSeed.v1",
            JSON.stringify({
              propertyLabel: "Harborline Demo Residences · Unit 204",
              unit: TENANT_AUTH_DEMO_SAMPLE.unit,
              invitationCode: TENANT_AUTH_DEMO_SAMPLE.invitationCode,
            })
          );
        }
      } catch {
        /* private mode */
      }
      try {
        await portalDemoLogin(portalDestination);
      } catch (err) {
        const digest =
          err && typeof err === "object" && "digest" in err
            ? String((err as { digest?: string }).digest)
            : "";
        if (digest.startsWith("NEXT_REDIRECT")) return;
        setLoading(false);
        setError(
          err instanceof Error ? err.message : "Demo tenant login failed."
        );
      }
      return;
    }

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (signInError) {
        setError(mapAuthErrorMessage(signInError.message, "login"));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .maybeSingle();
      const role = (profile as { role?: string } | null)?.role;
      if (role && role !== "tenant") {
        await supabase.auth.signOut();
        setError(
          "This account is not a tenant portal account. Use the team workspace login instead."
        );
        return;
      }

      const destination = await resolveDestination();
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  const signupHref = `${PORTAL_SIGNUP_PATH}${
    searchParams.get("next")
      ? `?next=${encodeURIComponent(searchParams.get("next")!)}`
      : ""
  }`;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm sm:p-6"
      noValidate
      aria-describedby={error ? `${formId}-form-error` : undefined}
    >
      <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
        Tenant login
      </h2>
      <p className="mt-1 text-sm text-[var(--harbor-muted)]">
        Sign in with the email Harborline has on file for your lease.
      </p>

      {demoMode ? (
        <p
          className="mt-3 rounded-xl border border-[var(--harbor-mid)]/25 bg-[var(--harbor-mist)]/60 px-3 py-2 text-xs text-[var(--harbor-ink)]/80"
          role="note"
        >
          Demo mode sample credentials are prefilled for quick testing. They do
          not create a production account.
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        <div className="form-control">
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
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? `${formId}-email-error` : undefined
            }
          />
          {errors.email ? (
            <p
              id={`${formId}-email-error`}
              className="mt-1 text-sm text-error"
              role="alert"
            >
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="form-control">
          <label className="label" htmlFor={`${formId}-password`}>
            <span className="label-text font-medium">Password</span>
          </label>
          <div className="relative">
            <input
              id={`${formId}-password`}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="input input-bordered min-h-11 w-full pr-12 portal-focus"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? `${formId}-password-error` : undefined
              }
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm absolute right-1 top-1/2 min-h-9 min-w-9 -translate-y-1/2 portal-focus"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p
              id={`${formId}-password-error`}
              className="mt-1 text-sm text-error"
              role="alert"
            >
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-[var(--harbor-ink)]">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          <button
            type="button"
            className="btn btn-link btn-sm min-h-11 px-0 text-[var(--harbor-deep)]"
            onClick={onForgotPassword}
          >
            Forgot password?
          </button>
        </div>
      </div>

      {error ? (
        <div
          id={`${formId}-form-error`}
          className="alert alert-error mt-4 py-2 text-sm"
          role="alert"
        >
          <span>{error}</span>
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
          "Log in"
        )}
      </button>

      <p className="mt-4 text-center text-sm text-[var(--harbor-muted)]">
        Need an account?{" "}
        <Link href={signupHref} className="link link-hover font-medium text-[var(--harbor-deep)]">
          Create an account
        </Link>
      </p>
    </form>
  );
}
