"use client";

import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  useTenantNotifications,
} from "@/hooks/useTenantNotifications";
import {
  formatNotificationTimestamp,
  notificationTypeLabel,
} from "@/lib/portal/notifications-format";
import {
  NOTIFICATION_FILTERS,
  type NotificationFilter,
  type PortalNotificationWithRead,
} from "@/lib/portal/notifications-types";

export function NotificationCenterPage() {
  const {
    state,
    filter,
    setFilter,
    filtered,
    counts,
    unreadCount,
    actionMessage,
    reload,
    loadDemoData,
    markRead,
    markUnread,
    markAllRead,
  } = useTenantNotifications();

  if (state.status === "loading") {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          className="h-8 w-8 animate-spin text-[var(--harbor-mid)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--harbor-ink)]/70">
          Loading notifications…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className="rounded-2xl border border-error/30 bg-error/5 p-6"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-error" aria-hidden="true" />
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                Notifications unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
                {state.message}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm gap-1"
                onClick={reload}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadDemoData}
              >
                Use demo data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <Bell
            className="mt-0.5 h-5 w-5 text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              No notifications
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--harbor-ink)]/65">
              {state.message}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={loadDemoData}
        >
          Preview with demo data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
        role="status"
      >
        In-portal notifications
        {state.source === "mock" ? " (demo)" : ""}. Email, SMS, and push delivery
        are not used here.
      </div>

      {actionMessage ? (
        <div className="alert alert-success" role="status">
          <span>{actionMessage}</span>
        </div>
      ) : null}

      <FilterBar
        filter={filter}
        counts={counts}
        unreadCount={unreadCount}
        onFilterChange={setFilter}
        onMarkAllRead={markAllRead}
      />

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6"
          role="status"
        >
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            No notifications in this filter
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
            Try another category or show all notifications.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm mt-4"
            onClick={() => setFilter("all")}
          >
            Show all
          </button>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Notifications">
          {filtered.map((item) => (
            <li key={item.id}>
              <NotificationCard
                item={item}
                onMarkRead={() => markRead(item.id)}
                onMarkUnread={() => markUnread(item.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterBar({
  filter,
  counts,
  unreadCount,
  onFilterChange,
  onMarkAllRead,
}: {
  filter: NotificationFilter;
  counts: Record<NotificationFilter, number>;
  unreadCount: number;
  onFilterChange: (filter: NotificationFilter) => void;
  onMarkAllRead: () => void;
}) {
  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="notification-filters-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="notification-filters-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Notification center
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-ink)]/65" aria-live="polite">
            {unreadCount} unread
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm gap-1"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          Mark all as read
        </button>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Notification filters">
        {NOTIFICATION_FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`btn btn-sm ${active ? "btn-neutral" : "btn-ghost"}`}
                aria-pressed={active}
                onClick={() => onFilterChange(item.id)}
              >
                {item.label}
                <span className="opacity-70">({counts[item.id]})</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NotificationCard({
  item,
  onMarkRead,
  onMarkUnread,
}: {
  item: PortalNotificationWithRead;
  onMarkRead: () => void;
  onMarkUnread: () => void;
}) {
  return (
    <article
      className={`rounded-2xl border border-[var(--harbor-deep)]/10 p-4 shadow-sm sm:p-5 ${
        item.read ? "bg-white/85" : "bg-[var(--harbor-sand)]/30"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {!item.read ? (
              <span className="badge badge-neutral badge-sm">Unread</span>
            ) : (
              <span className="badge badge-ghost badge-sm">Read</span>
            )}
            <span className="badge badge-outline badge-sm">{item.category}</span>
            <span className="badge badge-ghost badge-sm">
              {notificationTypeLabel(item.type)}
            </span>
          </div>
          <h3 className="text-base font-semibold text-[var(--harbor-ink)]">
            {item.title}
          </h3>
          <p className="text-sm text-[var(--harbor-ink)]/75">{item.body}</p>
          <time
            className="block text-xs text-[var(--harbor-ink)]/55"
            dateTime={item.createdAt}
          >
            {formatNotificationTimestamp(item.createdAt)}
          </time>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          <Link href={item.href} className="btn btn-neutral btn-sm">
            {item.hrefLabel}
          </Link>
          {!item.read ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onMarkRead}
            >
              Mark as read
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onMarkUnread}
            >
              Mark as unread
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
