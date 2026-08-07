import { truncatePreview } from "@/lib/portal/messages-format";
import {
  getInitialConversations,
  saveStoredConversations,
} from "@/lib/portal/messages-store";
import type {
  Conversation,
  Message,
  MessageAttachment,
  MessageCategory,
} from "@/lib/portal/models";
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

const TENANT_NAME = "Alex Tenant";

/**
 * Async inbox messaging service (not live chat).
 *
 * BACKEND_TODO:
 *   GET  /api/tenant/messages
 *   POST /api/tenant/messages
 *   POST /api/tenant/messages/:conversationId/replies
 *   POST /api/tenant/messages/:conversationId/read
 *
 * Demo error: message body starting with `FAIL:` simulates send failure.
 */

export async function listConversations(): Promise<
  ServiceResult<Conversation[]>
> {
  const forced = assertNotForcedError("listConversations");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(450);
    // BACKEND_TODO: live inbox where session user is a participant
    return ok(getInitialConversations(auth.data.tenantScopeId, false), "live");
  } catch (err) {
    return failFromUnknown(err, "Could not load your messages.", "network");
  }
}

export async function startConversation(input: {
  category: MessageCategory;
  subject: string;
  body: string;
  attachments: MessageAttachment[];
}): Promise<ServiceResult<Conversation>> {
  const forced = assertNotForcedError("startConversation");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const shouldFail = input.body.trim().toUpperCase().startsWith("FAIL:");
    const now = new Date().toISOString();
    const conversationId = `conv-${crypto.randomUUID().slice(0, 8)}`;
    const message: Message = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      conversationId,
      senderRole: "tenant",
      senderName: TENANT_NAME,
      body: input.body.trim(),
      sentAt: now,
      attachments: input.attachments,
      deliveryStatus: shouldFail ? "failed" : "sent",
    };
    const conversation: Conversation = {
      id: conversationId,
      subject: input.subject.trim(),
      category: input.category,
      lastMessageAt: now,
      preview: truncatePreview(input.body),
      unreadCount: 0,
      messages: [message],
    };

    if (shouldFail) {
      // Persist the failed outbound so the UI can offer retry.
      const existing = getInitialConversations(auth.data.tenantScopeId, false);
      saveStoredConversations([conversation, ...existing], auth.data.tenantScopeId);
      return fail(
        "Message could not be delivered. You can retry from the conversation.",
        "network"
      );
    }

    const existing = getInitialConversations(auth.data.tenantScopeId, false);
    saveStoredConversations([conversation, ...existing], auth.data.tenantScopeId);
    return ok(conversation, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not send your message.", "network");
  }
}

export async function replyToConversation(input: {
  conversationId: string;
  body: string;
  attachments: MessageAttachment[];
  conversations: Conversation[];
}): Promise<ServiceResult<Conversation[]>> {
  const forced = assertNotForcedError("replyToConversation");
  if (forced) return forced;

  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;

  try {
    await simulateLatency(DEFAULT_WRITE_DELAY_MS);
    const shouldFail = input.body.trim().toUpperCase().startsWith("FAIL:");
    const now = new Date().toISOString();
    const message: Message = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      conversationId: input.conversationId,
      senderRole: "tenant",
      senderName: TENANT_NAME,
      body: input.body.trim(),
      sentAt: now,
      attachments: input.attachments,
      deliveryStatus: shouldFail ? "failed" : "sent",
    };

    const next = input.conversations.map((conv) => {
      if (conv.id !== input.conversationId) return conv;
      return {
        ...conv,
        lastMessageAt: now,
        preview: truncatePreview(input.body),
        messages: [...conv.messages, message],
      };
    });
    saveStoredConversations(next, auth.data.tenantScopeId);

    if (shouldFail) {
      return fail(
        "Message could not be delivered. You can retry from the conversation.",
        "network"
      );
    }
    return ok(next, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not send your reply.", "network");
  }
}

export async function markConversationRead(
  conversationId: string,
  conversations: Conversation[]
): Promise<ServiceResult<Conversation[]>> {
  const auth = await requirePortalServiceSession();
  if (!auth.ok) return auth;
  try {
    const next = conversations.map((conv) =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
    );
    saveStoredConversations(next, auth.data.tenantScopeId);
    return ok(next, "mock");
  } catch (err) {
    return failFromUnknown(err, "Could not update conversation.");
  }
}

export function persistConversations(
  conversations: Conversation[],
  tenantScopeId: string
) {
  saveStoredConversations(conversations, tenantScopeId);
}

export function getConversationsDemoFixture(): Conversation[] {
  return [];
}

export function emptyMessagesMessage(): string {
  return "No messages yet. Start a conversation with CPMC management below.";
}

/** Re-export delay constant for hooks that still orchestrate send UX. */
export const MESSAGE_SEND_DELAY_MS = DEFAULT_WRITE_DELAY_MS;
export const MESSAGE_LOAD_DELAY_MS = 450;
