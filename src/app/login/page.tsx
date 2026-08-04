import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary/15 via-base-200 to-base-300">
      <AuthForm mode="login" />
    </main>
  );
}
