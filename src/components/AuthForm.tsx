"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { portalDemoLogin } from "@/app/portal/demo-actions";
import { createClient } from "@/lib/supabase/client";
import {
  isPortalPrivatePath,
  PORTAL_HOME_PATH,
} from "@/lib/portal/auth";
import {
  isPortalDemoCredentials,
  PORTAL_DEMO_PASSWORD,
  PORTAL_DEMO_SESSION_STORAGE_KEY,
  PORTAL_DEMO_TENANT,
} from "@/lib/portal/portal-demo-auth";
import { ALL_ROLES, ROLE_META, type UserRole } from "@/lib/types";

type Mode = "login" | "signup";

function emailNotConfirmedMessage(raw: string) {
  const msg = raw.toLowerCase();
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return "Email not confirmed. Ask a FinalProjectG16 org admin to turn off Confirm email in Supabase (Authentication → Providers → Email), or confirm your user under Authentication → Users.";
  }
  return raw;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(
    mode === "login" ? PORTAL_DEMO_TENANT.email : ""
  );
  const [password, setPassword] = useState(
    mode === "login" ? PORTAL_DEMO_PASSWORD : ""
  );
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("manager");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "login") return;
    try {
      window.sessionStorage.removeItem(PORTAL_DEMO_SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [mode]);

  async function resolvePostLoginPath(): Promise<string> {
    const next = searchParams.get("next");
    if (next && isPortalPrivatePath(next)) {
      return next;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "/workspace";

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const profileRole = (profile as { role?: UserRole } | null)?.role;
    if (profileRole === "tenant") {
      return PORTAL_HOME_PATH;
    }
    return "/workspace";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const next = searchParams.get("next");
      const portalDestination =
        next && isPortalPrivatePath(next) ? next : PORTAL_HOME_PATH;

      // Prefill demo credentials always work via portal demo cookie (no Supabase user needed).
      if (isPortalDemoCredentials(email, password)) {
        try {
          window.sessionStorage.setItem(
            PORTAL_DEMO_SESSION_STORAGE_KEY,
            JSON.stringify(PORTAL_DEMO_TENANT)
          );
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
          if (digest.startsWith("NEXT_REDIRECT")) {
            return;
          }
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
          email,
          password,
        });
        if (signInError) {
          setError(emailNotConfirmedMessage(signInError.message));
          return;
        }
        const destination = await resolvePostLoginPath();
        router.push(destination);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not sign in.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email,
            role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.push(ROLE_META[role].href);
        router.refresh();
        return;
      }

      setMessage(
        "Account created, but this project still requires email confirmation. Check your inbox, or ask an org admin to disable Confirm email in Supabase for team demos."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong during authentication."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
      <div className="card-body">
        <h1 className="card-title">
          {mode === "login" ? "Log in" : "Create an account"}
        </h1>
        <p className="text-sm opacity-70 -mt-1">
          {mode === "login"
            ? "Demo tenant credentials are filled in — click Log in to open the portal."
            : "Sign up with a role so teammates can demo different perspectives."}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-[6rem_1fr] items-center gap-3">
            {mode === "signup" && (
              <>
                <label htmlFor="fullName" className="text-sm font-medium text-right">
                  Name
                </label>
                <input
                  id="fullName"
                  className="input input-bordered w-full"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Wat Rutledge"
                />
              </>
            )}

            <label htmlFor="email" className="text-sm font-medium text-right">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <label htmlFor="password" className="text-sm font-medium text-right">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {mode === "signup" && (
              <>
                <label htmlFor="role" className="text-sm font-medium text-right">
                  Role
                </label>
                <select
                  id="role"
                  className="select select-bordered w-full"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_META[r].label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {error && (
            <div className="alert alert-error text-sm py-2" role="alert">
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="alert alert-info text-sm py-2" role="status">
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary min-h-11 w-full"
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner" />
            ) : mode === "login" ? (
              "Log in"
            ) : (
              "Sign up"
            )}
          </button>
        </form>

        <p className="text-sm opacity-70 mt-2">
          {mode === "login" ? (
            <>
              Need an account?{" "}
              <Link href="/signup" className="link link-primary">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="link link-primary">
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
