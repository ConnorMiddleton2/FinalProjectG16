"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALL_ROLES, ROLE_META, type UserRole } from "@/lib/types";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("manager");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          const msg = signInError.message.toLowerCase();
          if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
            setError(
              "Email not confirmed. Ask a FinalProjectG16 org admin to turn off Confirm email in Supabase (Authentication → Providers → Email), or confirm your user under Authentication → Users."
            );
          } else {
            setError(signInError.message);
          }
          return;
        }
        router.push("/workspace");
        router.refresh();
        return;
      }

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
            ? "Access the Harborline property-management workspace."
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
            <div className="alert alert-error text-sm py-2">
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="alert alert-info text-sm py-2">
              <span>{message}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
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
