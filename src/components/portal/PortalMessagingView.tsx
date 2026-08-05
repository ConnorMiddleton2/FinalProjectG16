"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Shield,
} from "lucide-react";
import { usePortalMessaging } from "@/hooks/usePortalMessaging";
import {
  CONVERSATION_TOPICS,
  attachmentFromFile,
  conversationUnreadCount,
  formatAttachmentSize,
  getConversationTopicMeta,
  latestMessage,
  mapIntentToTopic,
  totalUnreadCount,
  type ConversationTopic,
  type MessageAttachmentMeta,
  type PortalConversation,
  type PortalMessage,
} from "@/lib/portal-messaging";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function previewText(conversation: PortalConversation): string {
  const latest = latestMessage(conversation);
  if (!latest) return "No messages yet";
  const prefix = latest.sender === "leasing" ? "Leasing: " : "You: ";
  return `${prefix}${latest.body}`;
}

function MessageBubble({
  message,
  onRetry,
}: {
  message: PortalMessage;
  onRetry: (messageId: string) => void;
}) {
  const fromApplicant = message.sender === "applicant";
  return (
    <div
      className={`flex ${fromApplicant ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          fromApplicant
            ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
            : "bg-[var(--harbor-sand)]/70 text-[var(--harbor-ink)]"
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
          {fromApplicant ? "You" : "Harborline leasing"}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
        {message.attachments.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {message.attachments.map((attachment) => (
              <li
                key={attachment.id}
                className={`flex items-center gap-2 rounded-xl px-2 py-1 text-xs ${
                  fromApplicant ? "bg-white/10" : "bg-white/70"
                }`}
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {attachment.fileName}
                </span>
                <span className="opacity-60">
                  {formatAttachmentSize(attachment.fileSize)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] opacity-60">
          <span>{formatTimestamp(message.createdAt)}</span>
          {fromApplicant ? (
            <span>
              {message.deliveryStatus === "sending"
                ? "Sending…"
                : message.deliveryStatus === "failed"
                  ? "Failed to send"
                  : "Sent"}
            </span>
          ) : null}
        </div>
        {fromApplicant && message.deliveryStatus === "failed" ? (
          <button
            type="button"
            className={`btn btn-xs mt-2 gap-1 ${
              fromApplicant ? "btn-ghost text-[var(--harbor-sand)]" : "btn-ghost"
            }`}
            onClick={() => onRetry(message.id)}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ComposeForm({
  disabled,
  onSend,
  placeholder,
}: {
  disabled?: boolean;
  onSend: (body: string, attachments: MessageAttachmentMeta[]) => Promise<void>;
  placeholder: string;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachmentMeta[]>([]);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled || sending) return;
    if (!body.trim() && attachments.length === 0) {
      setFormError("Enter a message or attach a file.");
      return;
    }
    setSending(true);
    setFormError(null);
    try {
      await onSend(body, attachments);
      setBody("");
      setAttachments([]);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not send message."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
      <textarea
        className="textarea textarea-bordered min-h-24 w-full"
        placeholder={placeholder}
        value={body}
        disabled={disabled || sending}
        onChange={(event) => {
          setBody(event.target.value);
          setFormError(null);
        }}
      />
      {attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--harbor-sand)]/70 px-3 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[10rem] truncate">{attachment.fileName}</span>
              <button
                type="button"
                className="opacity-60 hover:opacity-100"
                onClick={() =>
                  setAttachments((current) =>
                    current.filter((item) => item.id !== attachment.id)
                  )
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {formError ? (
        <p className="text-sm text-error">{formError}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="btn btn-ghost btn-sm gap-1">
          <Paperclip className="h-4 w-4" />
          Attach
          <input
            type="file"
            className="hidden"
            multiple
            disabled={disabled || sending}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              const next: MessageAttachmentMeta[] = [];
              for (const file of files) {
                const meta = attachmentFromFile(file);
                if (!meta) {
                  setFormError(
                    "Attachments must be under 8 MB and cannot be empty."
                  );
                  continue;
                }
                next.push(meta);
              }
              if (next.length) {
                setAttachments((current) => [...current, ...next]);
                setFormError(null);
              }
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="submit"
          className="btn btn-neutral btn-sm gap-1"
          disabled={disabled || sending}
        >
          <Send className="h-4 w-4" />
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
      <p className="text-xs text-[var(--harbor-ink)]/45">
        Attachment names only are kept with the message — file contents are not
        stored in this demo channel.
      </p>
    </form>
  );
}

function MessagingInner() {
  const searchParams = useSearchParams();
  const unitFromQuery = searchParams.get("unit") ?? "";
  const applicationFromQuery = searchParams.get("application") ?? "";
  const intentFromQuery = searchParams.get("intent");

  const {
    conversations,
    loading,
    error,
    refresh,
    startConversation,
    sendReply,
    retryMessage,
    openConversation,
  } = usePortalMessaging();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [topic, setTopic] = useState<ConversationTopic>(
    mapIntentToTopic(intentFromQuery)
  );
  const [subject, setSubject] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);

  useEffect(() => {
    if (!intentFromQuery && !unitFromQuery && !applicationFromQuery) return;
    const timer = window.setTimeout(() => {
      setComposing(true);
      setTopic(mapIntentToTopic(intentFromQuery));
      if (intentFromQuery === "additional-information") {
        setSubject("Additional information requested");
      } else if (unitFromQuery) {
        setSubject("Question about a unit");
        setTopic("unit-questions");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [intentFromQuery, unitFromQuery, applicationFromQuery]);

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const unreadTotal = totalUnreadCount(conversations);

  function selectConversation(id: string) {
    setSelectedId(id);
    setComposing(false);
    setMobileShowThread(true);
    openConversation(id);
  }

  async function handleStart(
    body: string,
    attachments: MessageAttachmentMeta[]
  ) {
    setComposeError(null);
    const conversation = await startConversation({
      topic,
      subject:
        subject.trim() ||
        getConversationTopicMeta(topic).label,
      relatedUnitId: unitFromQuery,
      relatedApplicationId: applicationFromQuery,
      initialBody: body,
      attachments,
    });
    setSelectedId(conversation.id);
    setComposing(false);
    setMobileShowThread(true);
    setSubject("");
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading messages">
        <div className="skeleton h-28 w-full rounded-3xl" />
        <div className="skeleton h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Harborline leasing
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">Messages</h1>
            <p className="mt-3 max-w-2xl text-white/70">
              Ask about units, tours, applications, documents, status, lease
              offers, and move-in prep. This channel is for you and leasing —
              internal employee notes are never shown here.
            </p>
          </div>
          {unreadTotal > 0 ? (
            <span className="badge badge-lg border-0 bg-[var(--harbor-glow)] text-[var(--harbor-ink)]">
              {unreadTotal} unread
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/25 bg-white/65 px-4 py-3 text-sm text-[var(--harbor-ink)]/70">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
        <p>
          Applicant messages stay in a separate portal channel from internal
          staff notes. Screening criteria and private management comments are
          not part of this inbox.
        </p>
      </div>

      {error ? (
        <div className="alert border-error/20 bg-error/10">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1 text-sm">{error}</div>
          <button
            type="button"
            className="btn btn-sm btn-outline gap-1"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80">
        <div className="grid min-h-[32rem] lg:grid-cols-[20rem_1fr]">
          <aside
            className={`border-[var(--harbor-deep)]/10 lg:border-r ${
              mobileShowThread && (selected || composing)
                ? "hidden lg:block"
                : "block"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--harbor-deep)]/10 p-4">
              <h2 className="font-semibold">Conversations</h2>
              <button
                type="button"
                className="btn btn-neutral btn-xs gap-1"
                onClick={() => {
                  setComposing(true);
                  setSelectedId(null);
                  setMobileShowThread(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            </div>
            {conversations.length === 0 ? (
              <p className="p-4 text-sm text-[var(--harbor-ink)]/55">
                No conversations yet. Start one to reach leasing.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--harbor-deep)]/10">
                {conversations.map((conversation) => {
                  const unread = conversationUnreadCount(conversation);
                  const active = selectedId === conversation.id && !composing;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        className={`w-full px-4 py-3 text-left transition ${
                          active
                            ? "bg-[var(--harbor-sand)]/70"
                            : "hover:bg-[var(--harbor-sand)]/35"
                        }`}
                        onClick={() => selectConversation(conversation.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {conversation.subject}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--harbor-ink)]/50">
                              {getConversationTopicMeta(conversation.topic).label}
                            </p>
                          </div>
                          {unread > 0 ? (
                            <span className="badge badge-sm badge-neutral">
                              {unread}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-[var(--harbor-ink)]/60">
                          {previewText(conversation)}
                        </p>
                        <p className="mt-1 text-[10px] text-[var(--harbor-ink)]/40">
                          {formatTimestamp(conversation.updatedAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section
            className={`flex min-h-[32rem] flex-col ${
              mobileShowThread || (!selected && !composing)
                ? "flex"
                : "hidden lg:flex"
            } ${!selected && !composing ? "lg:flex" : ""}`}
          >
            {composing ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b border-[var(--harbor-deep)]/10 p-4">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm lg:hidden"
                    onClick={() => {
                      setComposing(false);
                      setMobileShowThread(false);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h2 className="font-semibold">New message</h2>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                      Topic
                    </span>
                    <select
                      className="select select-bordered w-full"
                      value={topic}
                      onChange={(event) =>
                        setTopic(event.target.value as ConversationTopic)
                      }
                    >
                      {CONVERSATION_TOPICS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs text-[var(--harbor-ink)]/50">
                      {getConversationTopicMeta(topic).description}
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                      Subject
                    </span>
                    <input
                      className="input input-bordered w-full"
                      value={subject}
                      placeholder={getConversationTopicMeta(topic).label}
                      onChange={(event) => setSubject(event.target.value)}
                    />
                  </label>
                  {(unitFromQuery || applicationFromQuery) && (
                    <p className="text-xs text-[var(--harbor-ink)]/55">
                      Linked context
                      {unitFromQuery ? ` · unit ${unitFromQuery}` : ""}
                      {applicationFromQuery
                        ? ` · application ${applicationFromQuery.slice(0, 8)}…`
                        : ""}
                    </p>
                  )}
                  {composeError ? (
                    <p className="text-sm text-error">{composeError}</p>
                  ) : null}
                  <ComposeForm
                    placeholder="Write your question for Harborline leasing…"
                    onSend={async (body, attachments) => {
                      try {
                        await handleStart(body, attachments);
                      } catch (err) {
                        setComposeError(
                          err instanceof Error
                            ? err.message
                            : "Could not start conversation."
                        );
                        throw err;
                      }
                    }}
                  />
                </div>
              </div>
            ) : selected ? (
              <div className="flex h-full flex-col">
                <div className="border-b border-[var(--harbor-deep)]/10 p-4">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm lg:hidden"
                      onClick={() => setMobileShowThread(false)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold">
                        {selected.subject}
                      </h2>
                      <p className="text-xs text-[var(--harbor-ink)]/50">
                        {getConversationTopicMeta(selected.topic).label}
                        {selected.relatedUnitId
                          ? ` · unit ${selected.relatedUnitId}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                  {[...selected.messages]
                    .sort(
                      (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime()
                    )
                    .map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        onRetry={(messageId) =>
                          void retryMessage(selected.id, messageId)
                        }
                      />
                    ))}
                </div>
                <div className="border-t border-[var(--harbor-deep)]/10 p-4">
                  <ComposeForm
                    placeholder="Reply to leasing…"
                    onSend={async (body, attachments) => {
                      await sendReply(selected.id, body, attachments);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="font-display text-3xl">Select a conversation</p>
                <p className="max-w-sm text-sm text-[var(--harbor-ink)]/55">
                  Choose a thread from the list, or start a new message about a
                  unit, tour, application, documents, status, lease offer, or
                  move-in.
                </p>
                <button
                  type="button"
                  className="btn btn-neutral gap-1"
                  onClick={() => {
                    setComposing(true);
                    setMobileShowThread(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New message
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function PortalMessagingView() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-label="Loading messages">
          <div className="skeleton h-28 w-full rounded-3xl" />
          <div className="skeleton h-96 w-full rounded-3xl" />
        </div>
      }
    >
      <MessagingInner />
    </Suspense>
  );
}
