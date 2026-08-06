"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  readPortalNotifications,
  unreadNotificationCount,
  writePortalNotifications,
  type PortalNotification,
} from "@/lib/portal-notifications";

export function usePortalNotifications() {
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    try {
      setNotifications(readPortalNotifications());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load notifications in this browser."
      );
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const persist = useCallback((next: PortalNotification[]) => {
    writePortalNotifications(next);
    setNotifications(next);
    setError(null);
  }, []);

  const markRead = useCallback(
    (id: string) => {
      const next = notifications.map((notification) =>
        notification.id === id
          ? markNotificationRead(notification)
          : notification
      );
      persist(next);
    },
    [notifications, persist]
  );

  const markAllRead = useCallback(() => {
    persist(markAllNotificationsRead(notifications));
  }, [notifications, persist]);

  const unreadCount = useMemo(
    () => unreadNotificationCount(notifications),
    [notifications]
  );

  return {
    notifications,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    unreadCount,
  };
}
