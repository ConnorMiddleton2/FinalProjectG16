/**
 * Waitlist / interest list service for future tenants.
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/waitlist
 *   POST /api/portal/future/waitlist
 *   POST /api/portal/future/waitlist/:id/cancel
 */

import { FUTURE_PROPERTIES } from "@/lib/portal/future/mock-data";
import type {
  JoinWaitlistInput,
  WaitlistEntry,
} from "@/lib/portal/future/waitlist-types";
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

const entriesByKey = new Map<string, WaitlistEntry[]>();

function storeKey(ownerUserId: string | null | undefined): string {
  return ownerUserId?.trim() || "guest";
}

function clone(entries: WaitlistEntry[]): WaitlistEntry[] {
  return entries.map((e) => ({ ...e }));
}

function ensure(ownerUserId: string | null | undefined): WaitlistEntry[] {
  const key = storeKey(ownerUserId);
  if (!entriesByKey.has(key)) {
    entriesByKey.set(key, []);
  }
  return entriesByKey.get(key)!;
}

export async function listWaitlistEntries(
  ownerUserId?: string | null
): Promise<ServiceResult<WaitlistEntry[]>> {
  const forced = assertNotForcedError("listWaitlistEntries");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_LOAD_DELAY_MS);
    const entries = clone(ensure(ownerUserId)).sort(
      (a, b) => a.position - b.position
    );
    return ok(entries, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load waitlist entries.", "network");
  }
}

export async function joinWaitlist(
  input: JoinWaitlistInput
): Promise<ServiceResult<WaitlistEntry>> {
  const forced = assertNotForcedError("joinWaitlist");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);

    if (!input.propertyId) {
      return fail("Choose a property for the waitlist.", "validation");
    }
    if (!input.fullName.trim() || !input.email.trim()) {
      return fail("Name and email are required.", "validation");
    }
    if (!input.email.includes("@")) {
      return fail("Enter a valid email address.", "validation");
    }

    const property = FUTURE_PROPERTIES.find((p) => p.id === input.propertyId);
    if (!property) {
      return fail("That property could not be found.", "not_found");
    }

    const list = ensure(input.ownerUserId);
    const duplicate = list.find(
      (e) =>
        e.status === "active" &&
        e.propertyId === input.propertyId &&
        e.email.toLowerCase() === input.email.trim().toLowerCase()
    );
    if (duplicate) {
      return fail(
        "You are already on the waitlist for that property with this email.",
        "conflict"
      );
    }

    const activeCount = list.filter((e) => e.status === "active").length;
    const entry: WaitlistEntry = {
      id: `wl-${crypto.randomUUID().slice(0, 8)}`,
      ownerUserId: input.ownerUserId?.trim() || null,
      propertyId: property.id,
      propertyName: property.name,
      occupancyClass: input.occupancyClass || property.occupancyClass,
      unitPreference: input.unitPreference.trim() || "Any available",
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      preferredMoveIn: input.preferredMoveIn || "",
      notes: input.notes.trim(),
      status: "active",
      position: activeCount + 1,
      createdAt: new Date().toISOString(),
    };

    list.unshift(entry);
    entriesByKey.set(storeKey(input.ownerUserId), list);
    // BACKEND_TODO: persist + notify leasing
    return ok({ ...entry }, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not join the waitlist.", "network");
  }
}

export async function cancelWaitlistEntry(
  entryId: string,
  ownerUserId?: string | null
): Promise<ServiceResult<WaitlistEntry>> {
  const forced = assertNotForcedError("cancelWaitlistEntry");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const list = ensure(ownerUserId);
    const current = list.find((e) => e.id === entryId);
    if (!current) {
      return fail("That waitlist entry could not be found.", "not_found");
    }
    if (current.status === "cancelled") {
      return ok({ ...current }, "mock");
    }
    const updated: WaitlistEntry = { ...current, status: "cancelled" };
    const next = list.map((e) => (e.id === entryId ? updated : e));
    // Recompute positions for remaining active entries
    let pos = 1;
    for (const e of next) {
      if (e.status === "active") {
        e.position = pos++;
      }
    }
    entriesByKey.set(storeKey(ownerUserId), next);
    return ok(updated, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not cancel that waitlist entry.", "network");
  }
}
