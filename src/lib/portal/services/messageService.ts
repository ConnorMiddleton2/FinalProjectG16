/**
 * Messaging service (applicant ↔ leasing).
 *
 * @backend GET /api/portal/conversations/:id/messages
 * @backend POST /api/portal/conversations/:id/messages
 * Never surface internal employee notes in this channel.
 */

import { MOCK_MESSAGES } from "@/lib/portal/mock/data";
import { PortalServiceError } from "@/lib/portal/mock/delay";
import type { Message } from "@/lib/portal/models";
import {
  appendApplicantMessage,
  mockDeliverApplicantMessage,
  readPortalConversations,
  setMessageDeliveryStatus,
  writePortalConversations,
} from "@/lib/portal-messaging";
import {
  runMockService,
  type ServiceResult,
} from "@/lib/portal/services/types";

function collectMessages(conversationId?: string): Message[] {
  const fromStore = readPortalConversations().flatMap((conversation) =>
    conversation.messages.map(
      (message): Message => ({
        id: message.id,
        conversationId: conversation.id,
        sender: message.sender,
        body: message.body,
        createdAt: message.createdAt,
        deliveryStatus: message.deliveryStatus,
        attachments: message.attachments.map((attachment) => ({ ...attachment })),
      })
    )
  );

  const fromMock = MOCK_MESSAGES.map((item) => ({ ...item }));
  const byId = new Map<string, Message>();
  for (const item of fromMock) byId.set(item.id, item);
  for (const item of fromStore) byId.set(item.id, item);

  const all = Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  if (!conversationId) return all;
  return all.filter((item) => item.conversationId === conversationId);
}

/** @backend GET /api/portal/messages */
export async function listMessages(
  conversationId?: string
): Promise<ServiceResult<Message[]>> {
  return runMockService(() => collectMessages(conversationId), {
    minMs: 140,
    maxMs: 380,
    failureRate: 0.03,
    failureMessage: "Could not load messages.",
  });
}

/** @backend GET /api/portal/messages/:id */
export async function getMessage(
  messageId: string
): Promise<ServiceResult<Message>> {
  return runMockService(() => {
    const message = collectMessages().find((item) => item.id === messageId);
    if (!message) {
      throw new PortalServiceError("Message not found.", "NOT_FOUND", 404);
    }
    return message;
  }, {
    minMs: 80,
    maxMs: 220,
    failureRate: 0.02,
    failureMessage: "Could not load message.",
  });
}

/**
 * Sends an applicant message with mock delivery (delay + occasional failure).
 * @backend POST /api/portal/conversations/:conversationId/messages
 */
export async function sendMessage(input: {
  conversationId: string;
  body: string;
}): Promise<ServiceResult<Message>> {
  try {
    const conversations = readPortalConversations();
    const conversation = conversations.find(
      (item) => item.id === input.conversationId
    );
    if (!conversation) {
      return {
        ok: false,
        error: {
          message: "Conversation not found.",
          code: "NOT_FOUND",
          status: 404,
        },
      };
    }

    const { conversation: updated, message } = appendApplicantMessage(
      conversation,
      input.body
    );
    writePortalConversations(
      conversations.map((item) => (item.id === updated.id ? updated : item))
    );

    const delivery = await mockDeliverApplicantMessage();
    const delivered = setMessageDeliveryStatus(updated, message.id, delivery);
    writePortalConversations(
      readPortalConversations().map((item) =>
        item.id === delivered.id ? delivered : item
      )
    );

    const saved = delivered.messages.find((item) => item.id === message.id);
    if (!saved) {
      return {
        ok: false,
        error: {
          message: "Message send failed.",
          code: "SEND_FAILED",
          status: 500,
        },
      };
    }

    if (saved.deliveryStatus === "failed") {
      return {
        ok: false,
        error: {
          message: "Message could not be delivered. You can retry.",
          code: "DELIVERY_FAILED",
          status: 502,
        },
      };
    }

    return {
      ok: true,
      data: {
        id: saved.id,
        conversationId: delivered.id,
        sender: saved.sender,
        body: saved.body,
        createdAt: saved.createdAt,
        deliveryStatus: saved.deliveryStatus,
        attachments: saved.attachments.map((attachment) => ({ ...attachment })),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message:
          error instanceof Error ? error.message : "Could not send message.",
        code: "SEND_ERROR",
        status: 500,
      },
    };
  }
}
