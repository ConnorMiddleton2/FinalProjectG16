"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCheck,
  Download,
  LoaderCircle,
  Mail,
  Paperclip,
  RefreshCw,
} from "lucide-react";
import {
  useTenantAnnouncements,
  type AnnouncementWithRead,
} from "@/hooks/useTenantAnnouncements";
import {
  announcementPriorityClass,
  formatAnnouncementDate,
  isAnnouncementExpired,
} from "@/lib/portal/announcements-format";
import {
  ANNOUNCEMENT_FILTERS,
  type AnnouncementFilter,
} from "@/lib/portal/announcements-types";

export function AnnouncementsPage() {
  const {
    state,
    filter,
    setFilter,
    filtered,
    counts,
    urgentUnread,
    actionMessage,
    reload,
    markRead,
    markUnread,
    markAllRead,
  } = useTenantAnnouncements();

  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          Loading announcements…
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
                Announcements unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
                {state.message}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-neutral btn-sm gap-1"
              onClick={reload}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
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
              No announcements
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--harbor-ink)]/65">
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/messages" className="btn btn-neutral btn-sm gap-1">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
        role="status"
      >
        Announcements loaded. Includes payment,
        maintenance, lease, and property notices for your building.
      </div>

      {urgentUnread.length > 0 ? (
        <div
          className="flex flex-col gap-2 rounded-xl border border-error/25 bg-error/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-error"
              aria-hidden="true"
            />
            <p className="text-sm text-[var(--harbor-ink)]">
              <span className="font-medium">
                {urgentUnread.length} urgent unread notice
                {urgentUnread.length === 1 ? "" : "s"}
              </span>
              <span className="text-[var(--harbor-ink)]/70">
                {" "}
                — open below to review, then mark as read.
              </span>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-11"
            onClick={() => setFilter("unread")}
          >
            Show unread
          </button>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="alert alert-success" role="status">
          <span>{actionMessage}</span>
        </div>
      ) : null}

      <FilterBar
        filter={filter}
        counts={counts}
        unreadCount={counts.unread}
        onFilterChange={setFilter}
        onMarkAllRead={markAllRead}
      />

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6"
          role="status"
        >
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            No announcements in this filter
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-ink)]/65">
            Try another filter or show all announcements.
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
        <ul className="space-y-3" aria-label="Property announcements">
          {filtered.map((item) => (
            <li key={item.id}>
              <AnnouncementCard
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => {
                  const next = expandedId === item.id ? null : item.id;
                  setExpandedId(next);
                  if (next && !item.read) markRead(item.id);
                }}
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
  filter: AnnouncementFilter;
  counts: Record<AnnouncementFilter, number>;
  unreadCount: number;
  onFilterChange: (filter: AnnouncementFilter) => void;
  onMarkAllRead: () => void;
}) {
  const headingId = useId();

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby={headingId}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id={headingId}
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Filters
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-ink)]/65" aria-live="polite">
            {unreadCount} unread
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm min-h-11 gap-1"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          Mark all as read
        </button>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Announcement filters">
        {ANNOUNCEMENT_FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`btn btn-sm min-h-11 ${active ? "btn-neutral" : "btn-ghost"}`}
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

function AnnouncementCard({
  item,
  expanded,
  onToggle,
  onMarkRead,
  onMarkUnread,
}: {
  item: AnnouncementWithRead;
  expanded: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
}) {
  const panelId = useId();
  const expired = isAnnouncementExpired(item.expirationDate);
  const isUrgent = item.priority === "Urgent";

  return (
    <article
      className={`rounded-2xl bg-white/85 p-4 shadow-sm sm:p-5 ${
        isUrgent
          ? "border border-[var(--harbor-deep)]/10 border-l-[3px] border-l-error"
          : "border border-[var(--harbor-deep)]/10"
      } ${!item.read ? "bg-[var(--harbor-sand)]/25" : ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {!item.read ? (
              <span className="badge badge-neutral badge-sm">Unread</span>
            ) : (
              <span className="badge badge-ghost badge-sm">Read</span>
            )}
            <span
              className={`badge badge-sm ${announcementPriorityClass(item.priority)}`}
            >
              {item.priority}
            </span>
            <span className="badge badge-outline badge-sm">{item.category}</span>
            {expired ? (
              <span className="badge badge-ghost badge-sm">Expired</span>
            ) : null}
          </div>
          <h3 className="text-base font-semibold text-[var(--harbor-ink)] sm:text-lg">
            {item.title}
          </h3>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--harbor-ink)]/65">
            <div>
              <dt className="inline">Published </dt>
              <dd className="inline">
                {formatAnnouncementDate(item.publishDate)}
              </dd>
            </div>
            {item.expirationDate ? (
              <div>
                <dt className="inline">Expires </dt>
                <dd className="inline">
                  {formatAnnouncementDate(item.expirationDate)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <button
            type="button"
            className="btn btn-outline btn-sm min-h-11"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
          >
            {expanded ? "Hide message" : "Read full message"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div
          id={panelId}
          className="mt-4 space-y-4 border-t border-[var(--harbor-deep)]/10 pt-4"
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--harbor-ink)]/85">
            {item.message}
          </p>

          {item.attachment ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--harbor-sand)]/40 px-3 py-3">
              <Paperclip
                className="h-4 w-4 text-[var(--harbor-mid)]"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--harbor-ink)]">
                  {item.attachment.fileName}
                </p>
                <p className="text-xs text-[var(--harbor-muted)]">
                  {item.attachment.fileType} · {item.attachment.fileSizeLabel}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm min-h-11 gap-1"
                onClick={() => downloadAttachment(item)}
                aria-label={`Download ${item.attachment.fileName}`}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!item.read ? (
              <button
                type="button"
                className="btn btn-neutral btn-sm min-h-11"
                onClick={onMarkRead}
              >
                Mark as read
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm min-h-11"
                onClick={onMarkUnread}
              >
                Mark as unread
              </button>
            )}
            <Link
              href="/portal/messages"
              className="btn btn-ghost btn-sm min-h-11"
            >
              Contact management
            </Link>
          </div>
        </div>
      ) : (
        <p className="mt-3 line-clamp-2 text-sm text-[var(--harbor-ink)]/70">
          {item.message}
        </p>
      )}
    </article>
  );
}

function downloadAttachment(item: AnnouncementWithRead) {
  if (!item.attachment) return;
  const body = [
    "CPMC Property Management Company",
    "Announcement attachment",
    "",
    `Announcement: ${item.title}`,
    `Category: ${item.category}`,
    `File: ${item.attachment.fileName}`,
    "",
    item.message,
  ].join("\n");
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = item.attachment.fileName.replace(/\.[^.]+$/, ".txt");
  a.click();
  URL.revokeObjectURL(url);
}
