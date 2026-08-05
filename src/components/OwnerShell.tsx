import type { ReactNode } from "react";

type OwnerShellProps = {
  header?: ReactNode;
  children: ReactNode;
  /** Auth screens use a quieter centered layout. */
  variant?: "portal" | "auth";
  className?: string;
};

export function OwnerShell({
  header,
  children,
  variant = "portal",
  className = "",
}: OwnerShellProps) {
  if (variant === "auth") {
    return (
      <main className={`relative min-h-screen overflow-hidden owner-auth-bg ${className}`}>
        <div
          className="pointer-events-none absolute inset-0 welcome-wash opacity-80"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 80% 10%, rgba(31,122,140,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 5% 90%, rgba(240,194,122,0.16), transparent 45%)",
          }}
        />
        <div className="relative">{children}</div>
      </main>
    );
  }

  return (
    <div className={`min-h-screen owner-page-bg ${className}`}>
      {header}
      {children}
    </div>
  );
}
