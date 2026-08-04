import { AppHeader } from "@/components/AppHeader";
import { getEffectiveRole } from "@/lib/effective-role";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, email, profileRole, isDemoOverride } = await getEffectiveRole();

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        email={email}
        role={role}
        profileRole={profileRole}
        isDemoOverride={isDemoOverride}
      />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
