"use client";

import { FormEvent, useEffect, useState } from "react";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type {
  PushCategoryKey,
  PushNotificationPreferences,
  PushPermissionState,
} from "@/lib/portal/push-preferences-types";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPreferences,
  sendTestPushNotification,
  updatePushPreferences,
} from "@/lib/portal/services/pushPreferencesService";

function readBrowserPermission(): PushPermissionState {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermissionState;
}

async function requestBrowserPermission(): Promise<PushPermissionState> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return result as PushPermissionState;
  } catch {
    return "unsupported";
  }
}

function showLocalNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "cpmc-test-push" });
  } catch {
    /* ignore — insecure context / blocked */
  }
}

export function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<PushNotificationPreferences | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    setStatus("loading");
    setError(null);
    const result = await getPushPreferences();
    if (!result.ok) {
      setError(result.error.message);
      setStatus("error");
      return;
    }
    setPrefs(result.data);
    setStatus("ready");
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onEnable() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const permission = await requestBrowserPermission();
    const result = await enablePushNotifications(permission);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      if (result.error.message.includes("denied")) {
        await reload();
      }
      return;
    }
    setPrefs(result.data);
    setMessage(
      permission === "unsupported"
        ? "Mobile alert preferences enabled in demo mode (this browser has no built-in notification support)."
        : "Mobile alerts enabled."
    );
  }

  async function onDisable() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await disablePushNotifications();
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPrefs(result.data);
    setMessage("Mobile alerts turned off.");
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!prefs) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await updatePushPreferences({
      masterEnabled: prefs.masterEnabled,
      quietHoursEnabled: prefs.quietHoursEnabled,
      quietHoursStart: prefs.quietHoursStart,
      quietHoursEnd: prefs.quietHoursEnd,
      categories: prefs.categories.map((c) => ({
        key: c.key,
        enabled: c.enabled,
      })),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPrefs(result.data);
    setMessage("Mobile alert preferences saved.");
  }

  async function onTest() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await sendTestPushNotification();
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    showLocalNotification(result.data.title, result.data.body);
    setMessage(`Test alert sent at ${result.data.sentAt.slice(11, 16)} UTC.`);
    await reload();
  }

  function toggleCategory(key: PushCategoryKey, enabled: boolean) {
    setPrefs((prev) =>
      prev
        ? {
            ...prev,
            categories: prev.categories.map((c) =>
              c.key === key ? { ...c, enabled } : c
            ),
          }
        : prev
    );
  }

  if (status === "loading") {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading mobile alert preferences...
      </p>
    );
  }
  if (status === "error" || !prefs) {
    return (
      <p className="text-sm text-error" role="alert">
        {error ?? "Could not load mobile alert preferences."}
      </p>
    );
  }

  const browserPermission = readBrowserPermission();

  return (
    <div className="space-y-6">
      <PortalCard className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="portal-section-title">Mobile alerts</h2>
            <p className="mt-1 text-sm text-[var(--harbor-muted)]">
              Control which lease alerts can reach you on phone and desktop.
              In-portal notifications stay available either way.
            </p>
          </div>
          <PortalStatusBadge
            tone={prefs.masterEnabled ? "success" : "neutral"}
          >
            {prefs.masterEnabled ? "Alerts on" : "Alerts off"}
          </PortalStatusBadge>
        </div>
        <p className="text-sm text-[var(--harbor-muted)]">
          Browser permission:{" "}
          <span className="font-medium text-[var(--harbor-ink)]">
            {prefs.permission === "unsupported"
              ? "demo / unsupported"
              : prefs.permission}
          </span>
          {browserPermission !== prefs.permission
            ? ` (live browser: ${browserPermission})`
            : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {!prefs.masterEnabled ? (
            <button
              type="button"
              className="portal-btn portal-btn-primary portal-focus"
              disabled={busy}
              onClick={() => void onEnable()}
            >
              {busy ? "Enabling..." : "Enable mobile alerts"}
            </button>
          ) : (
            <button
              type="button"
              className="portal-btn portal-btn-secondary portal-focus"
              disabled={busy}
              onClick={() => void onDisable()}
            >
              {busy ? "Updating..." : "Turn mobile alerts off"}
            </button>
          )}
          <button
            type="button"
            className="portal-btn portal-btn-secondary portal-focus"
            disabled={busy || !prefs.masterEnabled}
            onClick={() => void onTest()}
          >
            Send test alert
          </button>
        </div>
      </PortalCard>

      <PortalCard as="form" onSubmit={onSave} className="space-y-4">
        <h2 className="portal-section-title">Alert categories</h2>
        <ul className="space-y-3">
          {prefs.categories.map((category) => (
            <li
              key={category.key}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--harbor-deep)]/10 p-3"
            >
              <div>
                <p className="font-medium text-[var(--harbor-ink)]">
                  {category.label}
                </p>
                <p className="text-sm text-[var(--harbor-muted)]">
                  {category.description}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="sr-only">Enable {category.label}</span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={category.enabled}
                  onChange={(e) =>
                    toggleCategory(category.key, e.target.checked)
                  }
                />
              </label>
            </li>
          ))}
        </ul>

        <h2 className="portal-section-title">Quiet hours</h2>
        <label className="flex items-start gap-3 text-sm text-[var(--harbor-ink)]">
          <input
            type="checkbox"
            className="portal-native-checkbox"
            checked={prefs.quietHoursEnabled}
            onChange={(e) =>
              setPrefs((prev) =>
                prev
                  ? { ...prev, quietHoursEnabled: e.target.checked }
                  : prev
              )
            }
          />
          <span>Pause non-urgent mobile alerts overnight (Central Time).</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Quiet hours start"
            type="time"
            value={prefs.quietHoursStart}
            disabled={!prefs.quietHoursEnabled}
            onChange={(e) =>
              setPrefs((prev) =>
                prev ? { ...prev, quietHoursStart: e.target.value } : prev
              )
            }
          />
          <PortalField
            label="Quiet hours end"
            type="time"
            value={prefs.quietHoursEnd}
            disabled={!prefs.quietHoursEnabled}
            onChange={(e) =>
              setPrefs((prev) =>
                prev ? { ...prev, quietHoursEnd: e.target.value } : prev
              )
            }
          />
        </div>

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-[var(--harbor-ink)]" role="status">
            {message}
          </p>
        ) : null}
        {prefs.lastTestSentAt ? (
          <p className="text-xs text-[var(--harbor-muted)]">
            Last test: {prefs.lastTestSentAt.replace("T", " ").slice(0, 16)} UTC
          </p>
        ) : null}

        <button
          type="submit"
          className="portal-btn portal-btn-primary portal-focus"
          disabled={busy}
        >
          {busy ? "Saving..." : "Save preferences"}
        </button>
      </PortalCard>
    </div>
  );
}
