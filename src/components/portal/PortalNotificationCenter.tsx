"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  Circle,
  RefreshCw,
  Shield,
} from "lucide-react";
import { usePortalNotifications } from "@/hooks/usePortalNotifications";
import {
  NOTIFICATION_CATEGORIES,
  filterNotificationsByCategory,
  formatNotificationTimestamp,
  getNotificationCategoryMeta,
  getNotificationTypeMeta,
  isNotificationUnread,
  type PortalNotification,
  type PortalNotificationCategory,
} from "@/lib/portal-notifications";

type CategoryFilter = PortalNotificationCategory | "all";

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: PortalNotification;
  onMarkRead: () => void;
}) {
  const unread = isNotificationUnread(notification);
  const typeMeta = getNotificationTypeMeta(notification.type);
  const categoryMeta = getNotificationCategoryMeta(notification.category);

  return (
    <article
      className={`rounded-2xl border p-4 sm:p-5 ${
        unread
          ? "border-[var(--harbor-mid)]/30 bg-white"
          : "border-[var(--harbor-deep)]/10 bg-white/70"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {unread ? (
              <Circle className="h-3.5 w-3.5 fill-[var(--harbor-mid)] text-[var(--harbor-mid)]" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--harbor-ink)]/35" />
            )}
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
              {categoryMeta.label}
            </span>
            <span className="text-xs text-[var(--harbor-ink)]/45">
              {typeMeta.label}
            </span>
            {unread ? (
              <span className="rounded-full bg-[var(--harbor-mid)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
                Unread
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wide text-[var(--harbor-ink)]/40">
                Read
              </span>
            )}
          </div>
          <h3 className="mt-2 font-semibold">{notification.title}</h3>
          <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
            {notification.body}
          </p>
          <p className="mt-2 text-xs text-[var(--harbor-ink)]/45">
            {formatNotificationTimestamp(notification.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unread ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1"
              onClick={onMarkRead}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark as Read
            </button>
          ) : null}
          <Link
            href={notification.href}
            className="btn btn-neutral btn-sm gap-1"
            onClick={() => {
              if (unread) onMarkRead();
            }}
          >
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PortalNotificationCenter() {
  const {
    notifications,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    unreadCount,
  } = usePortalNotifications();
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(
    () => filterNotificationsByCategory(notifications, category),
    [notifications, category]
  );

  const unreadFiltered = filtered.filter(isNotificationUnread).length;

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Future tenant portal
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          Notification center
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          In-portal alerts for tours, applications, messages, lease offers, and
          move-in tasks. Read and unread states stay in this browser — no email,
          SMS, or push delivery from this center.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
            <Bell className="h-4 w-4 text-[var(--harbor-glow)]" />
            {unreadCount} unread
          </span>
          <span className="text-white/55">
            {notifications.length} total notifications
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/20 bg-[var(--harbor-sand)]/45 px-4 py-3 text-sm text-[var(--harbor-ink)]/70">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
        <p>
          Uses the same local read/unread pattern as messaging. Opening a linked
          page can mark an item read; nothing is sent outside the portal.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`btn btn-sm ${
              category === "all" ? "btn-neutral" : "btn-ghost"
            }`}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {NOTIFICATION_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn btn-sm ${
                category === item.id ? "btn-neutral" : "btn-ghost"
              }`}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm gap-1"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Mark All as Read
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert border-error/20 bg-error/10">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1 text-sm">{error}</div>
          <button
            type="button"
            className="btn btn-sm btn-outline gap-1"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-label="Loading notifications">
          <div className="skeleton h-28 w-full rounded-2xl" />
          <div className="skeleton h-28 w-full rounded-2xl" />
          <div className="skeleton h-28 w-full rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/65 px-6 py-14 text-center">
          <Bell className="mx-auto h-10 w-10 text-[var(--harbor-mid)]" />
          <h2 className="mt-4 font-display text-3xl">No notifications</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--harbor-ink)]/60">
            {category === "all"
              ? "When leasing confirms tours, requests documents, or sends offers, alerts appear here."
              : `No ${getNotificationCategoryMeta(category).label.toLowerCase()} notifications right now.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--harbor-ink)]/55">
            Showing {filtered.length}
            {category === "all"
              ? ""
              : ` ${getNotificationCategoryMeta(category).label.toLowerCase()}`}
            {" · "}
            {unreadFiltered} unread in this view
          </p>
          {filtered.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={() => markRead(notification.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
