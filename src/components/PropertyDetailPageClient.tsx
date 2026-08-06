"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { PropertyDetailView } from "@/components/PropertyDetailView";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { teamLogout } from "@/app/team/actions";

type Props = {
  propertyId: string;
};

export function PropertyDetailPageClient({ propertyId }: Props) {
  const router = useRouter();
  const { items, loading, error } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);

  const contract = useMemo(
    () => items.find((c) => c.id === propertyId) ?? null,
    [items, propertyId]
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Property detail</p>
          </div>
          <form action={teamLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        {loading ? (
          <p className="text-sm opacity-60">
            <span className="loading loading-spinner loading-sm mr-2" />
            Loading property…
          </p>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            {error}
          </div>
        ) : !contract ? (
          <div className="space-y-4">
            <Link
              href="/ops/properties"
              className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to properties
            </Link>
            <div className="rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 px-6 py-12 text-center">
              <p className="font-medium">Property not found</p>
              <p className="mt-1 text-sm opacity-60">
                No managed_properties record matches this id.
              </p>
            </div>
          </div>
        ) : (
          <PropertyDetailView
            contract={contract}
            onBack={() => router.push("/ops/properties")}
          />
        )}
      </main>
    </div>
  );
}
