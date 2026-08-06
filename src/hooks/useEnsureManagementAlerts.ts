"use client";

import { useEffect, useRef } from "react";
import {
  buildManagementAlertFromSnapshot,
  buildTenantCollectionsSnapshot,
  EVICTION_REVIEW_STATUS_LABEL,
  planMissingNoticeCatchUp,
  planNoticeTemplateRefresh,
  type CollectionsAccountState,
  type CollectionsNotice,
  type ManagementAlert,
} from "@/lib/collections";
import type { RentalReceivable } from "@/lib/rental-receivables";
import type { TenantRecord } from "@/lib/tenants";

/**
 * Idempotent app-load catch-up for /ops/tenant and /ops/management.
 * Creates missing weekly + day-90 notices, refreshes safe template content,
 * and maintains 90-day alerts.
 */
export function useCollectionsCatchUpSync(input: {
  tenants: TenantRecord[];
  receivables: RentalReceivable[];
  notices: CollectionsNotice[];
  accountStates: CollectionsAccountState[];
  alerts: ManagementAlert[];
  saveNotice: (notice: CollectionsNotice) => Promise<void>;
  saveAlert: (alert: ManagementAlert) => Promise<void>;
  refreshNotices: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  ready: boolean;
}) {
  const syncing = useRef(false);
  const {
    tenants,
    receivables,
    notices,
    accountStates,
    alerts,
    saveNotice,
    saveAlert,
    refreshNotices,
    refreshAlerts,
    ready,
  } = input;

  useEffect(() => {
    if (!ready || syncing.current) return;
    if (tenants.length === 0 || receivables.length === 0) return;

    const missingNotices = planMissingNoticeCatchUp({
      tenants,
      receivables,
      notices,
      accountStates,
    });
    const templateUpdates = planNoticeTemplateRefresh({
      tenants,
      receivables,
      notices,
    });

    const noticesForSnap = [...notices];
    for (const n of missingNotices) {
      if (!noticesForSnap.some((x) => x.id === n.id || x.uniqueKey === n.uniqueKey)) {
        noticesForSnap.push(n);
      }
    }
    for (const u of templateUpdates) {
      const idx = noticesForSnap.findIndex((x) => x.id === u.id);
      if (idx >= 0) noticesForSnap[idx] = u;
    }

    const neededAlerts: ManagementAlert[] = [];
    for (const t of tenants) {
      const snap = buildTenantCollectionsSnapshot(
        t,
        receivables,
        noticesForSnap,
        accountStates,
        alerts
      );
      const draft = buildManagementAlertFromSnapshot(t, snap);
      if (!draft) continue;
      const existing = alerts.find((a) => a.id === draft.id);
      if (!existing) {
        neededAlerts.push(draft);
      } else if (
        existing.reviewStatus === "open" ||
        existing.reviewStatus === "under_review"
      ) {
        neededAlerts.push({
          ...existing,
          daysOverdue: draft.daysOverdue,
          overdueRentBalance: draft.overdueRentBalance,
          noticesGenerated: draft.noticesGenerated,
          weeklyNoticesCount: draft.weeklyNoticesCount,
          lastNoticeDate: draft.lastNoticeDate,
          notice12Date: draft.notice12Date,
          day90EscalationNoticeDate: draft.day90EscalationNoticeDate,
          managementNotifiedAt:
            existing.managementNotifiedAt || draft.managementNotifiedAt,
          oldestUnpaidDueDate: draft.oldestUnpaidDueDate,
          tenantName: draft.tenantName,
          property: draft.property,
          unit: draft.unit,
          collectionsStatusLabel: EVICTION_REVIEW_STATUS_LABEL,
        });
      }
    }

    const changedAlerts = neededAlerts.filter((n) => {
      const prev = alerts.find((a) => a.id === n.id);
      return JSON.stringify(prev) !== JSON.stringify(n);
    });

    if (
      missingNotices.length === 0 &&
      templateUpdates.length === 0 &&
      changedAlerts.length === 0
    ) {
      return;
    }

    syncing.current = true;
    void (async () => {
      try {
        for (const notice of missingNotices) {
          const collision = notices.some(
            (n) => n.uniqueKey === notice.uniqueKey || n.id === notice.id
          );
          if (collision) continue;
          await saveNotice(notice);
        }
        for (const notice of templateUpdates) {
          await saveNotice(notice);
        }
        if (missingNotices.length > 0 || templateUpdates.length > 0) {
          await refreshNotices();
        }
        for (const alert of changedAlerts) {
          await saveAlert(alert);
        }
        if (changedAlerts.length > 0) {
          await refreshAlerts();
        }
      } finally {
        syncing.current = false;
      }
    })();
  }, [
    ready,
    tenants,
    receivables,
    notices,
    accountStates,
    alerts,
    saveNotice,
    saveAlert,
    refreshNotices,
    refreshAlerts,
  ]);
}

/** @deprecated Prefer useCollectionsCatchUpSync */
export function useEnsureManagementAlerts(input: {
  tenants: TenantRecord[];
  receivables: RentalReceivable[];
  notices: CollectionsNotice[];
  accountStates: CollectionsAccountState[];
  alerts: ManagementAlert[];
  saveAlert: (alert: ManagementAlert) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  ready: boolean;
  saveNotice?: (notice: CollectionsNotice) => Promise<void>;
  refreshNotices?: () => Promise<void>;
}) {
  useCollectionsCatchUpSync({
    tenants: input.tenants,
    receivables: input.receivables,
    notices: input.notices,
    accountStates: input.accountStates,
    alerts: input.alerts,
    saveNotice: input.saveNotice ?? (async () => undefined),
    saveAlert: input.saveAlert,
    refreshNotices: input.refreshNotices ?? (async () => undefined),
    refreshAlerts: input.refreshAlerts,
    ready: input.ready && !!input.saveNotice,
  });
}
