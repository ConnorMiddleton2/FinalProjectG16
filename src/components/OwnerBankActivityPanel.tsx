import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
} from "@/lib/shared-store";
import type { OwnerCashCall } from "@/lib/bank-accounts-shared";
import type { OwnerPayable } from "@/lib/owner-payables";
import type { OwnerAccount } from "@/lib/owner-auth";
import { OwnerFundCashCallButton } from "@/components/OwnerFundCashCallButton";

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

type RemitRow = OwnerPayable & { ownerEmail?: string; status?: string };

export async function OwnerBankActivityPanel({
  owner,
}: {
  owner: OwnerAccount;
}) {
  const client = await createClient();
  const [cashCalls, payables] = await Promise.all([
    listSharedRecords<OwnerCashCall>(client, COLLECTIONS.ownerCashCalls),
    listSharedRecords<RemitRow>(client, COLLECTIONS.ownerPayables),
  ]);

  const myCalls = cashCalls
    .filter(
      (c) =>
        c.ownerEmail.toLowerCase() === owner.email.toLowerCase() ||
        c.ownerAccountId === owner.id
    )
    .sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );

  const myRemits = payables
    .filter(
      (p) =>
        (p.ownerEmail || "").toLowerCase() === owner.email.toLowerCase() ||
        (p.ownerId || "") === owner.id ||
        (p.ownerName || "").toLowerCase() === owner.fullName.toLowerCase()
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.dueDate || 0).getTime() -
        new Date(a.createdAt || a.dueDate || 0).getTime()
    )
    .slice(0, 12);

  const openCalls = myCalls.filter(
    (c) => c.status === "requested" || c.status === "approved"
  );

  if (myCalls.length === 0 && myRemits.length === 0) {
    return null;
  }

  return (
    <section className="owner-card space-y-5 p-5">
      <div>
        <h2 className="font-semibold text-[var(--harbor-ink)]">
          Owner distributions &amp; cash calls
        </h2>
        <p className="owner-muted mt-1 text-sm">
          When Accounts Payable records a remittance payment, the property
          operating account is debited, CPMC&apos;s management fee lands in the
          corporate account, and the owner distribution shows here as received.
        </p>
      </div>

      {openCalls.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide opacity-60">
            Open cash calls
          </h3>
          {openCalls.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3"
            >
              <div>
                <p className="font-medium">
                  {money(c.amount)} · {c.propertyName}
                </p>
                <p className="text-sm opacity-70">{c.reason}</p>
              </div>
              <OwnerFundCashCallButton cashCallId={c.id} />
            </div>
          ))}
        </div>
      ) : null}

      {myRemits.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide opacity-60">
            Recent remittances / owner payables
          </h3>
          <ul className="divide-y divide-[var(--harbor-deep)]/10 rounded-xl border border-[var(--harbor-deep)]/10 bg-white/80">
            {myRemits.map((p) => {
              const paid = Number(p.amountPaid) || 0;
              const owed = Number(p.amount) || 0;
              const balance = Math.max(0, owed - paid);
              const fullyPaid = balance <= 0.001 || p.status === "paid";
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {p.property || "Owner distribution"}
                    </p>
                    <p className="opacity-60">
                      {p.period || p.dueDate || ""} ·{" "}
                      {fullyPaid
                        ? "Received"
                        : paid > 0
                          ? `Partial · ${money(paid)} received`
                          : "Awaiting remittance"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums font-semibold">
                      {money(fullyPaid ? owed : paid > 0 ? paid : owed)}
                    </p>
                    {!fullyPaid && paid > 0 ? (
                      <p className="text-xs opacity-55">
                        of {money(owed)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
