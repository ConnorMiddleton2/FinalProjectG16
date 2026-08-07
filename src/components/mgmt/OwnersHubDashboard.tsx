"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OwnersAccountsDashboard } from "@/components/mgmt/OwnersAccountsDashboard";
import { OwnerApplicationsDashboard } from "@/components/mgmt/OwnerApplicationsDashboard";

const TABS = [
  { id: "accounts", label: "Accounts" },
  { id: "applications", label: "Applications" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | null): value is TabId {
  return value === "accounts" || value === "applications";
}

export function OwnersHubDashboard({
  initialTab = "accounts",
}: {
  initialTab?: TabId;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("tab");
  const [tab, setTab] = useState<TabId>(
    isTabId(fromUrl) ? fromUrl : initialTab
  );

  useEffect(() => {
    if (isTabId(fromUrl) && fromUrl !== tab) setTab(fromUrl);
  }, [fromUrl, tab]);

  function selectTab(next: TabId) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "accounts") params.delete("tab");
    else params.set("tab", next);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div
        className="inline-flex rounded-xl border border-[var(--harbor-deep)]/15 bg-white/80 p-1"
        role="tablist"
        aria-label="Owner accounts and applications"
      >
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition ${
                active
                  ? "bg-[var(--harbor-deep)] text-[var(--harbor-sand)] shadow-sm"
                  : "text-[var(--harbor-ink)]/70 hover:bg-white"
              }`}
              onClick={() => selectTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "accounts" ? (
        <OwnersAccountsDashboard />
      ) : (
        <OwnerApplicationsDashboard />
      )}
    </div>
  );
}
