"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ANNOUNCEMENT_FILTER_CATEGORIES,
  type AnnouncementFilter,
  type AnnouncementsLoadState,
  type TenantAnnouncement,
} from "@/lib/portal/announcements-types";
import { isAnnouncementRead } from "@/lib/portal/announcements-read-store";
import {
  getAnnouncementsDemoFixture,
  listAnnouncements,
  markAllAnnouncementsAsRead,
  markAnnouncementAsRead,
  markAnnouncementAsUnread,
} from "@/lib/portal/services/announcementService";

export type AnnouncementWithRead = TenantAnnouncement & { read: boolean };

function withReadState(
  announcements: TenantAnnouncement[]
): AnnouncementWithRead[] {
  return announcements.map((item) => ({
    ...item,
    read: isAnnouncementRead(item.id),
  }));
}

function matchesFilter(item: AnnouncementWithRead, filter: AnnouncementFilter) {
  switch (filter) {
    case "unread":
      return !item.read;
    case "important":
      return item.priority === "Urgent" || item.priority === "High";
    case "community":
      return ANNOUNCEMENT_FILTER_CATEGORIES.community.includes(item.category);
    case "maintenance":
      return ANNOUNCEMENT_FILTER_CATEGORIES.maintenance.includes(item.category);
    case "policy":
      return ANNOUNCEMENT_FILTER_CATEGORIES.policy.includes(item.category);
    case "all":
    default:
      return true;
  }
}

export function useTenantAnnouncements() {
  const [state, setState] = useState<AnnouncementsLoadState>({
    status: "loading",
  });
  const [filter, setFilter] = useState<AnnouncementFilter>("all");
  const [readVersion, setReadVersion] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const applyData = useCallback(
    (announcements: TenantAnnouncement[], source: "live" | "mock") => {
      if (announcements.length === 0) {
        setState({
          status: "empty",
          message:
            "No announcements yet. Property updates and notices from Harborline will appear here.",
        });
        return;
      }
      setState({ status: "success", announcements, source });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const result = await listAnnouncements();
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
            : "Could not load announcements.",
      });
    }
  }, [applyData]);

  const loadDemoData = useCallback(() => {
    applyData(getAnnouncementsDemoFixture(), "mock");
  }, [applyData]);

  useEffect(() => {
    void load();
  }, [load]);

  const showAction = useCallback((message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 3200);
  }, []);

  const items = useMemo(() => {
    if (state.status !== "success") return [] as AnnouncementWithRead[];
    void readVersion;
    return withReadState(state.announcements);
  }, [state, readVersion]);

  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter]
  );

  const counts = useMemo(() => {
    const base: Record<AnnouncementFilter, number> = {
      all: items.length,
      unread: 0,
      important: 0,
      community: 0,
      maintenance: 0,
      policy: 0,
    };
    for (const item of items) {
      if (!item.read) base.unread += 1;
      if (item.priority === "Urgent" || item.priority === "High") {
        base.important += 1;
      }
      if (ANNOUNCEMENT_FILTER_CATEGORIES.community.includes(item.category)) {
        base.community += 1;
      }
      if (ANNOUNCEMENT_FILTER_CATEGORIES.maintenance.includes(item.category)) {
        base.maintenance += 1;
      }
      if (ANNOUNCEMENT_FILTER_CATEGORIES.policy.includes(item.category)) {
        base.policy += 1;
      }
    }
    return base;
  }, [items]);

  const urgentUnread = useMemo(
    () => items.filter((item) => item.priority === "Urgent" && !item.read),
    [items]
  );

  const markRead = useCallback(
    (id: string) => {
      void markAnnouncementAsRead(id);
      setReadVersion((v) => v + 1);
      showAction("Marked as read.");
    },
    [showAction]
  );

  const markUnread = useCallback(
    (id: string) => {
      void markAnnouncementAsUnread(id);
      setReadVersion((v) => v + 1);
      showAction("Marked as unread.");
    },
    [showAction]
  );

  const markAllRead = useCallback(() => {
    if (state.status !== "success") return;
    void markAllAnnouncementsAsRead(state.announcements.map((a) => a.id));
    setReadVersion((v) => v + 1);
    showAction("All announcements marked as read.");
  }, [state, showAction]);

  return {
    state,
    filter,
    setFilter,
    items,
    filtered,
    counts,
    urgentUnread,
    actionMessage,
    reload: () => void load(),
    loadDemoData,
    markRead,
    markUnread,
    markAllRead,
  };
}
