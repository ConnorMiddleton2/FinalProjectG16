import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-secondary/15 via-base-200 to-base-300">
      <Suspense fallback={<div className="text-sm opacity-70">Loading…</div>}>
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  );
}
