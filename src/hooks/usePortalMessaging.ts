"use client";

import { useCallback, useEffect, useState } from "react";
import {
  appendApplicantMessage,
  createConversation,
  markConversationRead,
  mockDeliverApplicantMessage,
  readPortalConversations,
  setMessageDeliveryStatus,
  writePortalConversations,
  type ConversationTopic,
  type MessageAttachmentMeta,
  type PortalConversation,
} from "@/lib/portal-messaging";

export function usePortalMessaging() {
  const [conversations, setConversations] = useState<PortalConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    try {
      setConversations(readPortalConversations());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load messages in this browser."
      );
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const persist = useCallback((next: PortalConversation[]) => {
    writePortalConversations(next);
    setConversations(next);
    setError(null);
  }, []);

  const replaceConversation = useCallback(
    (updated: PortalConversation) => {
      persist(
        conversations.map((conversation) =>
          conversation.id === updated.id ? updated : conversation
        )
      );
    },
    [conversations, persist]
  );

  const deliverMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      const current =
        readPortalConversations().find((item) => item.id === conversationId) ??
        null;
      if (!current) return;

      const result = await mockDeliverApplicantMessage();
      const next = setMessageDeliveryStatus(current, messageId, result);
      const stored = readPortalConversations();
      writePortalConversations(
        stored.map((conversation) =>
          conversation.id === next.id ? next : conversation
        )
      );
      setConversations(readPortalConversations());
    },
    []
  );

  const startConversation = useCallback(
    async (input: {
      topic: ConversationTopic;
      subject: string;
      relatedUnitId?: string;
      relatedApplicationId?: string;
      initialBody: string;
      attachments?: MessageAttachmentMeta[];
    }) => {
      if (!input.initialBody.trim()) {
        throw new Error("Enter a message to start the conversation.");
      }
      const conversation = createConversation(input);
      const firstMessage = conversation.messages[0];
      persist([conversation, ...conversations]);
      if (firstMessage) {
        void deliverMessage(conversation.id, firstMessage.id);
      }
      return conversation;
    },
    [conversations, deliverMessage, persist]
  );

  const sendReply = useCallback(
    async (
      conversationId: string,
      body: string,
      attachments: MessageAttachmentMeta[] = []
    ) => {
      if (!body.trim() && attachments.length === 0) {
        throw new Error("Enter a message or attach a file.");
      }
      const current = conversations.find((item) => item.id === conversationId);
      if (!current) throw new Error("Conversation not found.");

      const { conversation, message } = appendApplicantMessage(
        current,
        body || "(Attachment)",
        attachments
      );
      replaceConversation(conversation);
      void deliverMessage(conversationId, message.id);
      return message;
    },
    [conversations, deliverMessage, replaceConversation]
  );

  const retryMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      const current = conversations.find((item) => item.id === conversationId);
      if (!current) return;
      const pending = setMessageDeliveryStatus(current, messageId, "sending");
      replaceConversation(pending);
      void deliverMessage(conversationId, messageId);
    },
    [conversations, deliverMessage, replaceConversation]
  );

  const openConversation = useCallback(
    (conversationId: string) => {
      const current = conversations.find((item) => item.id === conversationId);
      if (!current) return null;
      const read = markConversationRead(current);
      replaceConversation(read);
      return read;
    },
    [conversations, replaceConversation]
  );

  return {
    conversations,
    loading,
    error,
    refresh,
    startConversation,
    sendReply,
    retryMessage,
    openConversation,
  };
}
