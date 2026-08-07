import { Mail, Phone } from "lucide-react";
import {
  COMPANY_MANAGEMENT_EMAIL,
  COMPANY_MANAGEMENT_PHONE,
  COMPANY_MANAGEMENT_PHONE_TEL,
  COMPANY_SHORT,
} from "@/lib/brand";

/** Dashboard footer: how tenants reach CPMC management. */
export function DashboardManagementContact() {
  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-ink)] px-5 py-6 text-[var(--harbor-sand)] shadow-sm"
      aria-labelledby="dashboard-management-contact-heading"
    >
      <h2
        id="dashboard-management-contact-heading"
        className="text-lg font-semibold"
      >
        Contact management
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--harbor-sand)]/80">
        For any concerns about your lease, unit, billing, or property services,
        reach out to {COMPANY_SHORT} management.
      </p>
      <dl className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-8">
        <div className="flex items-center gap-2.5">
          <Mail
            className="h-4 w-4 shrink-0 text-[var(--harbor-glow)]"
            aria-hidden="true"
          />
          <div>
            <dt className="sr-only">Email</dt>
            <dd>
              <a
                href={`mailto:${COMPANY_MANAGEMENT_EMAIL}`}
                className="text-sm font-medium underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-glow)]"
              >
                {COMPANY_MANAGEMENT_EMAIL}
              </a>
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Phone
            className="h-4 w-4 shrink-0 text-[var(--harbor-glow)]"
            aria-hidden="true"
          />
          <div>
            <dt className="sr-only">Phone</dt>
            <dd>
              <a
                href={`tel:${COMPANY_MANAGEMENT_PHONE_TEL}`}
                className="text-sm font-medium underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-glow)]"
              >
                {COMPANY_MANAGEMENT_PHONE}
              </a>
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
