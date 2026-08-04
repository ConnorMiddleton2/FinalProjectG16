import Link from "next/link";
import { ROLE_META, type UserRole } from "@/lib/types";

type Props = {
  role: UserRole;
  title: string;
  summary: string;
  upcomingModules: string[];
};

export function RoleWorkspace({ role, title, summary, upcomingModules }: Props) {
  const meta = ROLE_META[role];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide opacity-60">{meta.label}</p>
        <h1 className="text-3xl font-bold mt-1">{title}</h1>
        <p className="mt-2 max-w-3xl opacity-80">{summary}</p>
      </div>

      <div className="alert alert-info">
        <span>
          This is a skeleton workspace. Teammates can build real features here without
          rewriting login or navigation. Navigation and actions below are scoped to this
          role.
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">What this role needs</h2>
            <p className="text-sm opacity-80">{meta.description}</p>
            <div className="card-actions mt-2">
              <Link href="/workspace" className="btn btn-ghost btn-sm">
                Back to role hub
              </Link>
            </div>
          </div>
        </section>

        <section className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Planned modules</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm opacity-80">
              {upcomingModules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Allowed actions</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm opacity-80">
              {meta.allowedActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card bg-base-100 border border-error/30 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Restricted for this role</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm opacity-80">
              {meta.restrictedActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
