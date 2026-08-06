"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPortalTenantSessionClient } from "@/lib/portal/auth-client";
import {
  isNotificationRead,
  notificationReadStoragePrefix,
} from "@/lib/portal/notifications-read-store";
import type {
  NotificationFilter,
  NotificationsLoadState,
  PortalNotification,
  PortalNotificationWithRead,
} from "@/lib/portal/notifications-types";
import { sessionOwnsDemoFixtures } from "@/lib/portal/tenant-scope";
import {
  getNotificationsDemoFixture,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
} from "@/lib/portal/services/notificationService";

function withReadState(
  notifications: PortalNotification[],
  tenantScopeId: string
): PortalNotificationWithRead[] {
  return notifications.map((item) => ({
    ...item,
    read: isNotificationRead(item.id, tenantScopeId),
  }));
}

function matchesFilter(
  item: PortalNotificationWithRead,
  filter: NotificationFilter
) {
  if (filter === "all") return true;
  if (filter === "unread") return !item.read;
  return item.category === filter;
}

/**
 * In-portal notification center for current tenants.
 * Does not send email, SMS, or push.
 */
export function useTenantNotifications() {
  const [state, setState] = useState<NotificationsLoadState>({
    status: "loading",
  });
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [readVersion, setReadVersion] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const tenantScopeRef = useRef<string | null>(null);

  const applyData = useCallback(
    (notifications: PortalNotification[], source: "live" | "mock") => {
      if (notifications.length === 0) {
        setState({
          status: "empty",
          message:
            "No notifications yet. Rent, maintenance, messages, and document alerts will appear here.",
        });
        return;
      }
      setState({ status: "success", notifications, source });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const session = await getPortalTenantSessionClient();
      tenantScopeRef.current = session?.tenantScopeId ?? null;
      const result = await listNotifications();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      applyData(
        result.data.map(({ read: _read, ...item }) => item),
        result.source
      );
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load notifications.",
      });
    }
  }, [applyData]);

  const loadDemoData = useCallback(async () => {
    const session = await getPortalTenantSessionClient();
    if (!session || !sessionOwnsDemoFixtures(session)) {
      void load();
      return;
    }
    tenantScopeRef.current = session.tenantScopeId;
    applyData(getNotificationsDemoFixture(), "mock");
  }, [applyData, load]);

  useEffect(() => {
    void load();
  }, [load]);

  const showAction = useCallback((message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 3200);
  }, []);

  const items = useMemo(() => {
    if (state.status !== "success") return [] as PortalNotificationWithRead[];
    void readVersion;
    const scopeId = tenantScopeRef.current;
    if (!scopeId) {
      return state.notifications.map((item) => ({ ...item, read: true }));
    }
    return withReadState(state.notifications, scopeId).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }, [state, readVersion]);

  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter]
  );

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items]
  );

  const counts = useMemo(() => {
    const base: Record<NotificationFilter, number> = {
      all: items.length,
      unread: unreadCount,
      Payments: 0,
      Maintenance: 0,
      Announcements: 0,
      Messages: 0,
      Lease: 0,
      Documents: 0,
    };
    for (const item of items) {
      base[item.category] += 1;
    }
    return base;
  }, [items, unreadCount]);

  const markRead = useCallback(
    (id: string) => {
      void markNotificationAsRead(id);
      setReadVersion((v) => v + 1);
      showAction("Marked as read.");
    },
    [showAction]
  );

  const markUnread = useCallback(
    (id: string) => {
      void markNotificationAsUnread(id);
      setReadVersion((v) => v + 1);
      showAction("Marked as unread.");
    },
    [showAction]
  );

  const markAllRead = useCallback(() => {
    if (state.status !== "success") return;
    void markAllNotificationsAsRead(state.notifications.map((n) => n.id));
    setReadVersion((v) => v + 1);
    showAction("All notifications marked as read.");
  }, [state, showAction]);

  return {
    state,
    filter,
    setFilter,
    items,
    filtered,
    counts,
    unreadCount,
    actionMessage,
    reload: () => void load(),
    loadDemoData: () => void loadDemoData(),
    markRead,
    markUnread,
    markAllRead,
  };
}

/** Lightweight unread badge for the portal header bell. */
export function useNotificationUnreadBadge() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    void (async () => {
      const result = await getUnreadNotificationCount();
      if (result.ok) setCount(result.data);
    })();
  }, []);

  useEffect(() => {
    refresh();
    function onStorage(event: StorageEvent) {
      if (
        event.key &&
        event.key.startsWith(notificationReadStoragePrefix())
      ) {
        refresh();
      }
    }
    function onLocalChange() {
      refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener("harborline:notifications-changed", onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(
        "harborline:notifications-changed",
        onLocalChange
      );
    };
  }, [refresh]);

  return { unreadCount: count, refresh };
}
