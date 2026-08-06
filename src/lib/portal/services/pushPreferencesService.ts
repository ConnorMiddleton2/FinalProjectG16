/**
 * Push notification preferences service for current tenants.
 *
 * BACKEND_TODO:
 *   GET  /api/tenant/notifications/push-preferences
 *   PUT  /api/tenant/notifications/push-preferences
 *   POST /api/tenant/notifications/push-preferences/enable
 *   POST /api/tenant/notifications/push-preferences/test
 */

import {
  getPushPreferencesForTenant,
  setPushPreferencesForTenant,
} from "@/lib/portal/push-preferences-store";
import type {
  PushNotificationPreferences,
  PushPermissionState,
  UpdatePushPreferencesInput,
} from "@/lib/portal/push-preferences-types";
import { requirePortalServiceSession } from "@/lib/portal/services/session";
import {
  assertNotForcedError,
  DEFAULT_LOAD_DELAY_MS,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

export async function getPushPreferences(): Promise<
  ServiceResult<PushNotificationPreferences>
> {
  const forced = assertNotForcedError("getPushPreferences");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    return ok(getPushPreferencesForTenant(auth.data.tenantScopeId), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load push preferences.", "network");
  }
}

export async function enablePushNotifications(
  permission: PushPermissionState
): Promise<ServiceResult<PushNotificationPreferences>> {
  const forced = assertNotForcedError("enablePushNotifications");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const current = getPushPreferencesForTenant(auth.data.tenantScopeId);

    if (permission === "denied") {
      const denied: PushNotificationPreferences = {
        ...current,
        masterEnabled: false,
        permission: "denied",
        lastUpdatedAt: new Date().toISOString(),
      };
      setPushPreferencesForTenant(auth.data.tenantScopeId, denied);
      return fail(
        "Browser push permission was denied. You can re-enable it in browser settings.",
        "validation"
      );
    }

    if (permission === "unsupported") {
      // Demo still allows “mobile push” preference storage without Notification API.
      const demo: PushNotificationPreferences = {
        ...current,
        masterEnabled: true,
        permission: "unsupported",
        lastUpdatedAt: new Date().toISOString(),
      };
      setPushPreferencesForTenant(auth.data.tenantScopeId, demo);
      return ok(demo, "mock");
    }

    const next: PushNotificationPreferences = {
      ...current,
      masterEnabled: true,
      permission: "granted",
      lastUpdatedAt: new Date().toISOString(),
    };
    setPushPreferencesForTenant(auth.data.tenantScopeId, next);
    // BACKEND_TODO: persist Web Push subscription / device token
    return ok(next, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not enable push notifications.", "network");
  }
}

export async function disablePushNotifications(): Promise<
  ServiceResult<PushNotificationPreferences>
> {
  const forced = assertNotForcedError("disablePushNotifications");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const current = getPushPreferencesForTenant(auth.data.tenantScopeId);
    const next: PushNotificationPreferences = {
      ...current,
      masterEnabled: false,
      lastUpdatedAt: new Date().toISOString(),
    };
    setPushPreferencesForTenant(auth.data.tenantScopeId, next);
    return ok(next, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not disable push notifications.", "network");
  }
}

export async function updatePushPreferences(
  input: UpdatePushPreferencesInput
): Promise<ServiceResult<PushNotificationPreferences>> {
  const forced = assertNotForcedError("updatePushPreferences");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (
      input.quietHoursEnabled &&
      (!isValidTime(input.quietHoursStart) || !isValidTime(input.quietHoursEnd))
    ) {
      return fail("Quiet hours must use HH:MM times.", "validation");
    }

    const current = getPushPreferencesForTenant(auth.data.tenantScopeId);
    if (input.masterEnabled && current.permission === "denied") {
      return fail(
        "Push is blocked in the browser. Allow notifications, then enable again.",
        "validation"
      );
    }

    const categoryMap = new Map(input.categories.map((c) => [c.key, c.enabled]));
    const next: PushNotificationPreferences = {
      ...current,
      masterEnabled: input.masterEnabled,
      quietHoursEnabled: input.quietHoursEnabled,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
      categories: current.categories.map((c) => ({
        ...c,
        enabled: categoryMap.has(c.key) ? Boolean(categoryMap.get(c.key)) : c.enabled,
      })),
      lastUpdatedAt: new Date().toISOString(),
    };
    setPushPreferencesForTenant(auth.data.tenantScopeId, next);
    return ok(next, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not save push preferences.", "network");
  }
}

export async function sendTestPushNotification(): Promise<
  ServiceResult<{ sentAt: string; title: string; body: string }>
> {
  const forced = assertNotForcedError("sendTestPushNotification");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const current = getPushPreferencesForTenant(auth.data.tenantScopeId);
    if (!current.masterEnabled) {
      return fail("Enable push notifications before sending a test.", "validation");
    }

    const sentAt = new Date().toISOString();
    const payload = {
      sentAt,
      title: "Harborline test alert",
      body: "Push preferences are working. You will receive mobile-style alerts for enabled categories.",
    };

    setPushPreferencesForTenant(auth.data.tenantScopeId, {
      ...current,
      lastTestSentAt: sentAt,
      lastUpdatedAt: sentAt,
    });

    // BACKEND_TODO: deliver via FCM / APNs / Web Push
    return ok(payload, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not send a test push.", "network");
  }
}
