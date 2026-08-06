"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePortalNotifications } from "@/hooks/usePortalNotifications";

export function PortalNotificationsHeaderLink() {
  const { unreadCount } = usePortalNotifications();

  return (
    <Link
      href="/portal/notifications"
      className="btn btn-ghost btn-sm gap-1"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
    >
      <span className="relative">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--harbor-mid)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </span>
      <span className="hidden sm:inline">Notifications</span>
    </Link>
  );
}
