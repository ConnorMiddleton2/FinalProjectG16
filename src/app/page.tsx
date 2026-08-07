import Link from "next/link";
import { ArrowRight, KeyRound, Landmark, Users } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { WelcomePropertySlideshow } from "@/components/WelcomePropertySlideshow";
import { COMPANY_NAME, COMPANY_SHORT } from "@/lib/brand";

const ROLES = [
  {
    href: "/portal/start",
    title: "Tenant",
    blurb: "Browse properties, apply, or open your resident dashboard.",
    cta: "Continue as Tenant",
    icon: Users,
  },
  {
    href: "/owners",
    title: "Owner",
    blurb: "Sign in, submit assets for management, and review contracts.",
    cta: "Owner Login",
    icon: Landmark,
  },
  {
    href: "/team",
    title: "Team",
    blurb: "Access operations, HR, accounting, and property tools.",
    cta: "Team Login",
    icon: KeyRound,
  },
] as const;

export default function WelcomePage() {
  return (
    <main className="relative min-h-screen bg-[var(--harbor-sand)] text-[var(--harbor-text)]">
      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="flex flex-col justify-center px-6 py-14 sm:px-10 lg:px-12 lg:py-20">
          <div className="welcome-rise max-w-xl">
            <BrandLogo size="xl" priority className="p-1" />
            <p className="mt-8 font-display text-4xl tracking-tight text-[var(--harbor-ink)] sm:text-5xl">
              {COMPANY_SHORT}
            </p>
            <p className="mt-2 text-sm font-medium uppercase tracking-[0.14em] text-[var(--harbor-muted-soft)]">
              {COMPANY_NAME}
            </p>

            <h1 className="mt-10 text-2xl font-semibold leading-snug text-[var(--harbor-text)] sm:text-3xl">
              Simple, transparent property management
            </h1>
          </div>

          <div className="welcome-rise-delay mt-12 grid max-w-2xl gap-5 sm:grid-cols-3">
            {ROLES.map(({ href, title, blurb, cta, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex min-h-[13.5rem] flex-col rounded-2xl border border-[var(--harbor-border)] bg-[var(--harbor-card)] p-5 text-[var(--harbor-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]/50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
              >
                <Icon className="h-6 w-6 text-[var(--harbor-mid)]" />
                <p className="mt-4 text-lg font-semibold leading-tight">
                  {title}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--harbor-muted)]">
                  {blurb}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--harbor-mid)]">
                  {cta}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <WelcomePropertySlideshow className="mx-6 mb-10 min-h-[20rem] rounded-2xl sm:mx-10 lg:mx-0 lg:mb-0 lg:min-h-full lg:rounded-none" />
      </div>
    </main>
  );
}
