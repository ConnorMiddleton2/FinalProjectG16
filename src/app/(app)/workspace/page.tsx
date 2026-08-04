import Link from "next/link";
import { getEffectiveRole } from "@/lib/effective-role";
import { ALL_ROLES, ROLE_META } from "@/lib/types";

export default async function WorkspacePage() {
  const { role, isDemoOverride, profileRole } = await getEffectiveRole();
  const allowedHrefs = new Set(ROLE_META[role].allowedPaths);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role hub</h1>
        <p className="opacity-70 mt-1">
          Effective role: <strong>{ROLE_META[role].label}</strong>
          {isDemoOverride
            ? ` (demo override · account role is ${ROLE_META[profileRole].label})`
            : null}
          . Only destinations allowed for this role are shown below.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ALL_ROLES.filter((r) => allowedHrefs.has(ROLE_META[r].href)).map((r) => (
          <Link
            key={r}
            href={ROLE_META[r].href}
            className={`card border shadow-sm transition hover:-translate-y-0.5 ${
              r === role
                ? "bg-primary text-primary-content border-primary"
                : "bg-base-100 border-base-300"
            }`}
          >
            <div className="card-body">
              <h2 className="card-title text-lg">{ROLE_META[r].label}</h2>
              <p className={`text-sm ${r === role ? "opacity-90" : "opacity-70"}`}>
                {ROLE_META[r].description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <section className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-lg">Blocked from this role</h2>
          <p className="text-sm opacity-70">
            These workspaces stay hidden in navigation and redirect away if opened
            directly.
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm opacity-80">
            {ALL_ROLES.filter((r) => !allowedHrefs.has(ROLE_META[r].href)).map(
              (r) => (
                <li key={r}>
                  {ROLE_META[r].label} — {ROLE_META[r].href}
                </li>
              )
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
