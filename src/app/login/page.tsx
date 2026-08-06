import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

/**
 * Always show the login form (with demo fields prefilled).
 * Demo session cookies are cleared in the auth proxy when /login is hit,
 * so visitors are not auto-skipped into /portal.
 */
export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary/15 via-base-200 to-base-300">
      <Suspense fallback={<div className="text-sm opacity-70">Loading…</div>}>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
