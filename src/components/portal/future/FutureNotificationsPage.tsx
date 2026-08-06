"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { FutureNotification } from "@/lib/portal/future/models";
import {
  list as listNotifications,
  markAllRead,
  markRead,
} from "@/lib/portal/future/services/notificationService";

function NotificationsInner({ session }: { session: PortalTenantSession }) {
  const [items, setItems] = useState<FutureNotification[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    const result = await listNotifications(session.userId);
    if (!result.ok) {
      setError(result.error.message);
      setStatus("error");
      return;
    }
    setItems(result.data);
    setStatus(result.data.length ? "ready" : "empty");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.userId]);

  async function onMarkRead(id: string) {
    await markRead(session.userId, id);
    await load();
  }

  async function onMarkAll() {
    await markAllRead(session.userId);
    await load();
  }

  if (status === "loading") {
    return <p className="text-sm text-[var(--harbor-muted)]" role="status">Loading notifications…</p>;
  }
  if (status === "error") {
    return <p className="portal-empty text-error" role="alert">{error}</p>;
  }
  if (status === "empty") {
    return <p className="portal-empty">No notifications yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="portal-btn portal-btn-secondary portal-focus"
          onClick={() => void onMarkAll()}
        >
          Mark all read
        </button>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <PortalCard className={item.read ? "opacity-80" : ""}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PortalStatusBadge tone={item.read ? "neutral" : "info"}>
                      {item.category}
                    </PortalStatusBadge>
                    {!item.read ? (
                      <span className="text-xs font-semibold text-[var(--harbor-mid)]">
                        Unread
                      </span>
                    ) : null}
                  </div>
                  <h2 className="font-semibold text-[var(--harbor-ink)]">
                    {item.title}
                  </h2>
                  <p className="text-sm text-[var(--harbor-muted)]">{item.body}</p>
                  <p className="text-xs text-[var(--harbor-ink)]/45">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={item.href}
                    className="portal-btn portal-btn-primary portal-focus"
                    onClick={() => void onMarkRead(item.id)}
                  >
                    {item.hrefLabel}
                  </Link>
                  {!item.read ? (
                    <button
                      type="button"
                      className="portal-btn portal-btn-secondary portal-focus"
                      onClick={() => void onMarkRead(item.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            </PortalCard>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FutureNotificationsPage() {
  return (
    <RequireFutureApplicant>
      {(session) => <NotificationsInner session={session} />}
    </RequireFutureApplicant>
  );
}
