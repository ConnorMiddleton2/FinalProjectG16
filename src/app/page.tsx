import Link from "next/link";
import { Building2, ClipboardList, KeyRound, LineChart } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <div className="bg-gradient-to-br from-primary/20 via-base-200 to-secondary/10">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
          <div className="flex items-center gap-3 mb-10">
            <div className="rounded-box bg-primary text-primary-content p-3">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-lg">Harborline Property Management</p>
              <p className="text-sm opacity-70">ACCY 628 · Final Project G16</p>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Contract-to-cash for commercial property managers
              </h1>
              <p className="mt-4 text-lg opacity-80 max-w-xl">
                Manage owner contracts, tenant leases, maintenance work, billing,
                collections, and property profitability in one shared system.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="btn btn-primary">
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-outline">
                  Sign up
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Feature
                icon={<KeyRound className="h-5 w-5" />}
                title="Role-based access"
                text="Owner, manager, tenant, maintenance, and accounting workspaces."
              />
              <Feature
                icon={<ClipboardList className="h-5 w-5" />}
                title="Work & costs"
                text="Track work orders, vendors, and costs tied to properties."
              />
              <Feature
                icon={<LineChart className="h-5 w-5" />}
                title="Billing & profit"
                text="Simulate rent billing, payments, deposits, and profitability."
              />
              <Feature
                icon={<Building2 className="h-5 w-5" />}
                title="Shared foundation"
                text="This skeleton is ready for teammates to build modules on top."
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-4 gap-2">
        <div className="text-primary">{icon}</div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm opacity-70">{text}</p>
      </div>
    </div>
  );
}
