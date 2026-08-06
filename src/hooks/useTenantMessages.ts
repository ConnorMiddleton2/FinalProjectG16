"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPortalTenantSessionClient } from "@/lib/portal/auth-client";
import { truncatePreview } from "@/lib/portal/messages-format";
import { saveStoredConversations } from "@/lib/portal/messages-store";
import type {
  MessageAttachment,
  MessageCategory,
  MessagesLoadState,
  NewMessageFormValues,
  PortalConversation,
  PortalMessage,
  ReplyFormValues,
} from "@/lib/portal/messages-types";
import {
  validateNewMessageForm,
  validateReplyForm,
} from "@/lib/portal/messages-validation";
import {
  emptyMessagesMessage,
  getConversationsDemoFixture,
  listConversations,
} from "@/lib/portal/services/messageService";

const SEND_DELAY_MS = 700;
const TENANT_NAME = "Alex Tenant";

/**
 * Async inbox messaging for the tenant portal.
 * Not live chat — no realtime channel; send is request/response with retry.
 */
export function useTenantMessages() {
  const [state, setState] = useState<MessagesLoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const tenantScopeRef = useRef<string | null>(null);

  const persist = useCallback((conversations: PortalConversation[]) => {
    const scopeId = tenantScopeRef.current;
    if (scopeId) {
      saveStoredConversations(conversations, scopeId);
    }
    setState({ status: "success", conversations, source: "mock" });
  }, []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setSendError(null);
    try {
      const session = await getPortalTenantSessionClient();
      tenantScopeRef.current = session?.tenantScopeId ?? null;
      const result = await listConversations();
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      const conversations = result.data;
      if (conversations.length === 0) {
        setState({
          status: "empty",
          message: emptyMessagesMessage(),
        });
        return;
      }
      setState({
        status: "success",
        conversations,
        source: result.source,
      });
      setSelectedId((prev) => prev ?? conversations[0]?.id ?? null);
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not load your messages.",
      });
    }
  }, []);

  const loadDemoData = useCallback(() => {
    const conversations = getConversationsDemoFixture();
    if (conversations.length === 0) {
      setState({
        status: "empty",
        message: emptyMessagesMessage(),
      });
      return;
    }
    setState({ status: "success", conversations, source: "mock" });
    setSelectedId(conversations[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const conversations = useMemo(() => {
    if (state.status !== "success") return [] as PortalConversation[];
    return [...state.conversations].sort((a, b) =>
      b.lastMessageAt.localeCompare(a.lastMessageAt)
    );
  }, [state]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  const showAction = useCallback((message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 3200);
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      setComposing(false);
      setSendError(null);
      setSelectedId(id);
      if (state.status !== "success") return;
      const next = state.conversations.map((conv) =>
        conv.id === id ? { ...conv, unreadCount: 0 } : conv
      );
      persist(next);
    },
    [state, persist]
  );

  const startCompose = useCallback(() => {
    setComposing(true);
    setSelectedId(null);
    setSendError(null);
  }, []);

  const cancelCompose = useCallback(() => {
    setComposing(false);
    setSendError(null);
    if (state.status === "success" && state.conversations[0]) {
      setSelectedId(state.conversations[0].id);
    }
  }, [state]);

  /**
   * Mock send. Fails when the body starts with "FAIL:" so retry can be tested;
   * otherwise succeeds after a short delay (async, not realtime).
   */
  const attemptSend = useCallback(async (body: string) => {
    await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
    if (body.trim().toUpperCase().startsWith("FAIL:")) {
      throw new Error(
        "Message could not be delivered. Check your connection and try again."
      );
    }
  }, []);

  const sendNewMessage = useCallback(
    async (values: NewMessageFormValues) => {
      if (sending) return false;
      const fieldErrors = validateNewMessageForm(values);
      if (Object.keys(fieldErrors).length > 0) {
        setSendError(
          fieldErrors.form ||
            fieldErrors.category ||
            fieldErrors.subject ||
            fieldErrors.body ||
            fieldErrors.attachments ||
            "Fix the highlighted fields before sending."
        );
        return false;
      }
      setSending(true);
      setSendError(null);
      const now = new Date().toISOString();
      const conversationId = `conv-${crypto.randomUUID().slice(0, 8)}`;
      const messageId = `msg-${crypto.randomUUID().slice(0, 8)}`;

      try {
        await attemptSend(values.body);
        const message: PortalMessage = {
          id: messageId,
          conversationId,
          senderRole: "tenant",
          senderName: TENANT_NAME,
          body: values.body.trim(),
          sentAt: now,
          attachments: values.attachments,
          deliveryStatus: "sent",
        };
        const conversation: PortalConversation = {
          id: conversationId,
          subject: values.subject.trim(),
          category: values.category as MessageCategory,
          lastMessageAt: now,
          preview: truncatePreview(values.body),
          unreadCount: 0,
          messages: [message],
        };
        const existing =
          state.status === "success" ? state.conversations : [];
        persist([conversation, ...existing]);
        setComposing(false);
        setSelectedId(conversationId);
        showAction("Message sent to Harborline management.");
        return true;
      } catch (err) {
        setSendError(
          err instanceof Error ? err.message : "Failed to send message."
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [attemptSend, persist, showAction, state, sending]
  );

  const sendReply = useCallback(
    async (conversationId: string, values: ReplyFormValues) => {
      if (sending) return false;
      const fieldErrors = validateReplyForm(values);
      if (Object.keys(fieldErrors).length > 0) {
        setSendError(
          fieldErrors.body ||
            fieldErrors.attachments ||
            "Fix the message before sending."
        );
        return false;
      }
      if (state.status !== "success") return false;
      setSending(true);
      setSendError(null);
      const now = new Date().toISOString();
      const messageId = `msg-${crypto.randomUUID().slice(0, 8)}`;

      try {
        await attemptSend(values.body);
        const message: PortalMessage = {
          id: messageId,
          conversationId,
          senderRole: "tenant",
          senderName: TENANT_NAME,
          body: values.body.trim(),
          sentAt: now,
          attachments: values.attachments,
          deliveryStatus: "sent",
        };
        const next = state.conversations.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            lastMessageAt: now,
            preview: truncatePreview(values.body),
            unreadCount: 0,
            messages: [...conv.messages, message],
          };
        });
        persist(next);
        showAction("Reply sent.");
        return true;
      } catch (err) {
        // Keep a failed message in-thread so Retry is obvious.
        const failed: PortalMessage = {
          id: messageId,
          conversationId,
          senderRole: "tenant",
          senderName: TENANT_NAME,
          body: values.body.trim(),
          sentAt: now,
          attachments: values.attachments,
          deliveryStatus: "failed",
        };
        const next = state.conversations.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            lastMessageAt: now,
            preview: truncatePreview(values.body),
            messages: [...conv.messages, failed],
          };
        });
        persist(next);
        setSendError(
          err instanceof Error ? err.message : "Failed to send message."
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [attemptSend, persist, showAction, state, sending]
  );

  const retryFailedMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      if (sending) return false;
      if (state.status !== "success") return false;
      const conv = state.conversations.find((c) => c.id === conversationId);
      const failed = conv?.messages.find((m) => m.id === messageId);
      if (!failed || failed.deliveryStatus !== "failed") return false;

      setSending(true);
      setSendError(null);

      const withStatus = (
        status: "sending" | "sent" | "failed",
        sentAt?: string
      ) =>
        state.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            lastMessageAt: sentAt ?? c.lastMessageAt,
            preview:
              status === "sent" ? truncatePreview(failed.body) : c.preview,
            messages: c.messages.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    deliveryStatus: status,
                    sentAt: sentAt ?? m.sentAt,
                  }
                : m
            ),
          };
        });

      persist(withStatus("sending"));

      try {
        await attemptSend(failed.body);
        const now = new Date().toISOString();
        persist(withStatus("sent", now));
        showAction("Message sent.");
        return true;
      } catch (err) {
        persist(withStatus("failed"));
        setSendError(
          err instanceof Error ? err.message : "Failed to send message."
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [attemptSend, persist, showAction, state]
  );

  return {
    state,
    conversations,
    selected,
    selectedId,
    composing,
    sending,
    sendError,
    actionMessage,
    unreadTotal,
    reload: () => void load(),
    loadDemoData,
    selectConversation,
    startCompose,
    cancelCompose,
    sendNewMessage,
    sendReply,
    retryFailedMessage,
    clearSendError: () => setSendError(null),
  };
}

export function attachmentFromFile(file: File): MessageAttachment {
  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    fileType: file.type || guessExt(file.name),
    fileSizeBytes: file.size,
  };
}

function guessExt(name: string) {
  const ext = name.split(".").pop()?.toUpperCase();
  return ext || "FILE";
}
