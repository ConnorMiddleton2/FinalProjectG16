import {
  DEFAULT_PUSH_CATEGORIES,
  type PushNotificationPreferences,
} from "@/lib/portal/push-preferences-types";

function defaultPrefs(): PushNotificationPreferences {
  return {
    masterEnabled: false,
    permission: "default",
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    categories: DEFAULT_PUSH_CATEGORIES.map((c) => ({ ...c })),
    lastUpdatedAt: null,
    lastTestSentAt: null,
  };
}

const byTenant = new Map<string, PushNotificationPreferences>();

export function getPushPreferencesForTenant(
  tenantScopeId: string
): PushNotificationPreferences {
  if (!byTenant.has(tenantScopeId)) {
    byTenant.set(tenantScopeId, defaultPrefs());
  }
  const prefs = byTenant.get(tenantScopeId)!;
  return {
    ...prefs,
    categories: prefs.categories.map((c) => ({ ...c })),
  };
}

export function setPushPreferencesForTenant(
  tenantScopeId: string,
  prefs: PushNotificationPreferences
) {
  byTenant.set(tenantScopeId, {
    ...prefs,
    categories: prefs.categories.map((c) => ({ ...c })),
  });
}
