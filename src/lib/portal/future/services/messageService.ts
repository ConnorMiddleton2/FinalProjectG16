/**
 * Future-tenant messaging (separate from current-tenant inbox).
 *
 * Topics: unit questions, tours, application, documents, status, lease offers, move-in.
 *
 * BACKEND_TODO:
 *   GET  /api/portal/future/messages
 *   GET  /api/portal/future/messages/:threadId
 *   POST /api/portal/future/messages
 *   POST /api/portal/future/messages/:threadId/replies
 * Scope all reads/writes to the authenticated applicant (ownerUserId).
 */

import { getMockMessageThreads } from "@/lib/portal/future/mock-data";
import type {
  FutureMessage,
  FutureMessageAttachment,
  FutureMessageThread,
  FutureMessageTopic,
} from "@/lib/portal/future/models";
import {
  assertNotForcedError,
  DEFAULT_WRITE_DELAY_MS,
  fail,
  failFromUnknown,
  ok,
  simulateLatency,
  type ServiceResult,
} from "@/lib/portal/services/shared";

const threadsByOwner = new Map<string, FutureMessageThread[]>();

function getOwnerThreads(ownerUserId: string): FutureMessageThread[] {
  if (!threadsByOwner.has(ownerUserId)) {
    threadsByOwner.set(
      ownerUserId,
      getMockMessageThreads(ownerUserId).map((t) => structuredClone(t))
    );
  }
  return threadsByOwner.get(ownerUserId)!;
}

function setOwnerThreads(ownerUserId: string, threads: FutureMessageThread[]) {
  threadsByOwner.set(ownerUserId, threads);
}

function truncatePreview(body: string, max = 100): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export async function listThreads(
  ownerUserId: string
): Promise<ServiceResult<FutureMessageThread[]>> {
  const forced = assertNotForcedError("listThreads");
  if (forced) return forced;

  try {
    await simulateLatency(450);
    if (!ownerUserId) {
      return fail("An owner user id is required.", "validation");
    }
    // BACKEND_TODO: list threads where applicant is a participant
    const threads = getOwnerThreads(ownerUserId)
      .filter((t) => t.ownerUserId === ownerUserId)
      .map((t) => ({
        ...t,
        messages: t.messages.map((m) => ({ ...m })),
      }))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    return ok(threads, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load your messages.", "network");
  }
}

export async function getThread(
  ownerUserId: string,
  threadId: string
): Promise<ServiceResult<FutureMessageThread>> {
  const forced = assertNotForcedError("getThread");
  if (forced) return forced;

  try {
    await simulateLatency(300);
    const thread = getOwnerThreads(ownerUserId).find(
      (t) => t.id === threadId && t.ownerUserId === ownerUserId
    );
    if (!thread) {
      return fail("That conversation could not be found.", "not_found");
    }
    // Mark read on open (mock).
    const next = getOwnerThreads(ownerUserId).map((t) =>
      t.id === threadId ? { ...t, unreadCount: 0 } : t
    );
    setOwnerThreads(ownerUserId, next);
    const updated = next.find((t) => t.id === threadId)!;
    return ok(structuredClone(updated), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not load that conversation.", "network");
  }
}

export type SendFutureMessageInput = {
  ownerUserId: string;
  threadId?: string;
  topic?: FutureMessageTopic;
  subject?: string;
  body: string;
  attachments?: FutureMessageAttachment[];
  senderName?: string;
};

export async function sendMessage(
  input: SendFutureMessageInput
): Promise<ServiceResult<FutureMessageThread>> {
  const forced = assertNotForcedError("sendMessage");
  if (forced) return forced;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    if (!input.ownerUserId) {
      return fail("An owner user id is required.", "validation");
    }
    const body = input.body.trim();
    if (!body) {
      return fail("Message body is required.", "validation");
    }

    const shouldFail = body.toUpperCase().startsWith("FAIL:");
    const now = new Date().toISOString();
    const threads = getOwnerThreads(input.ownerUserId);
    let thread = input.threadId
      ? threads.find(
          (t) => t.id === input.threadId && t.ownerUserId === input.ownerUserId
        )
      : undefined;

    if (input.threadId && !thread) {
      return fail("That conversation could not be found.", "not_found");
    }

    if (!thread) {
      const threadId = `thread-${crypto.randomUUID().slice(0, 8)}`;
      thread = {
        id: threadId,
        ownerUserId: input.ownerUserId,
        subject: (input.subject ?? "New leasing question").trim(),
        topic: input.topic ?? "application_question",
        lastMessageAt: now,
        preview: truncatePreview(body),
        unreadCount: 0,
        messages: [],
      };
      threads.unshift(thread);
    }

    const message: FutureMessage = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      threadId: thread.id,
      senderRole: "applicant",
      senderName: input.senderName?.trim() || "Applicant",
      body,
      sentAt: now,
      attachments: input.attachments ?? [],
      deliveryStatus: shouldFail ? "failed" : "sent",
    };

    const updated: FutureMessageThread = {
      ...thread,
      lastMessageAt: now,
      preview: truncatePreview(body),
      messages: [...thread.messages, message],
    };

    const next = threads.map((t) => (t.id === updated.id ? updated : t));
    if (!threads.some((t) => t.id === updated.id)) {
      next.unshift(updated);
    }
    setOwnerThreads(input.ownerUserId, next);

    if (shouldFail) {
      return fail(
        "Message could not be delivered. You can retry from the conversation.",
        "network"
      );
    }

    // BACKEND_TODO: persist message; never expose internal employee notes to applicants
    return ok(structuredClone(updated), "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not send your message.", "network");
  }
}
