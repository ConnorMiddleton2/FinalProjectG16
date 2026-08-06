"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  LoaderCircle,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Reply,
  Send,
  X,
} from "lucide-react";
import { useTenantMessages } from "@/hooks/useTenantMessages";
import {
  formatAttachmentSize,
  formatMessageDay,
  formatMessageTimestamp,
} from "@/lib/portal/messages-format";
import {
  MESSAGE_CATEGORIES,
  type MessageAttachment,
  type NewMessageFormValues,
  type PortalConversation,
  type PortalMessage,
  type ReplyFormValues,
} from "@/lib/portal/messages-types";
import {
  attachmentMetaFromFile,
  isAllowedMessageAttachment,
  MAX_MESSAGE_ATTACHMENTS,
  MESSAGE_BODY_MAX,
  MESSAGE_SUBJECT_MAX,
  validateNewMessageForm,
  validateReplyForm,
  type MessageFormErrors,
} from "@/lib/portal/messages-validation";

const EMPTY_NEW: NewMessageFormValues = {
  category: "",
  subject: "",
  body: "",
  attachments: [],
};

const EMPTY_REPLY: ReplyFormValues = {
  body: "",
  attachments: [],
};

export function MessagesPage() {
  const {
    state,
    conversations,
    selected,
    selectedId,
    composing,
    sending,
    sendError,
    actionMessage,
    unreadTotal,
    reload,
    loadDemoData,
    selectConversation,
    startCompose,
    cancelCompose,
    sendNewMessage,
    sendReply,
    retryFailedMessage,
    clearSendError,
  } = useTenantMessages();

  const [newForm, setNewForm] = useState<NewMessageFormValues>(EMPTY_NEW);
  const [replyForm, setReplyForm] = useState<ReplyFormValues>(EMPTY_REPLY);
  const [newErrors, setNewErrors] = useState<MessageFormErrors>({});
  const [replyErrors, setReplyErrors] = useState<MessageFormErrors>({});
  /** On <lg, when true (and selected/composing), show detail pane instead of inbox list. */
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  if (state.status === "loading") {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          className="h-8 w-8 animate-spin text-[var(--harbor-mid)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--harbor-muted)]">
          Loading messages…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className="rounded-2xl border border-error/30 bg-error/5 p-6"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-error" aria-hidden="true" />
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                Messages unavailable
              </h2>
              <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                {state.message}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm min-h-11 gap-1"
                onClick={reload}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm min-h-11"
                onClick={loadDemoData}
              >
                Use demo data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function handleSelect(id: string) {
    selectConversation(id);
    setMobileDetailOpen(true);
  }

  function handleStartCompose() {
    clearSendError();
    setNewErrors({});
    setNewForm(EMPTY_NEW);
    setMobileDetailOpen(true);
    startCompose();
  }

  function handleBackToInbox() {
    if (composing) {
      cancelCompose();
      setNewForm(EMPTY_NEW);
      setNewErrors({});
      clearSendError();
    }
    setMobileDetailOpen(false);
  }

  async function handleNewSubmit(event: FormEvent) {
    event.preventDefault();
    const fieldErrors = validateNewMessageForm(newForm);
    setNewErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    const ok = await sendNewMessage(newForm);
    if (ok) {
      setNewForm(EMPTY_NEW);
      setNewErrors({});
      setMobileDetailOpen(true);
    }
  }

  async function handleReplySubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const fieldErrors = validateReplyForm(replyForm);
    setReplyErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    const ok = await sendReply(selected.id, replyForm);
    if (ok) {
      setReplyForm(EMPTY_REPLY);
      setReplyErrors({});
    }
  }

  const showingDetail =
    composing || (Boolean(selected) && mobileDetailOpen);
  const hideListBelowLg = showingDetail;
  const hideDetailBelowLg = !showingDetail;

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-[var(--harbor-ink)]/80"
        role="status"
      >
        Secure messaging with Harborline management
        {state.status === "success" && state.source === "mock"
          ? " (demo inbox)"
          : ""}
        . This is an async message center — not live chat.
      </div>

      {actionMessage ? (
        <div className="alert alert-success" role="status">
          <span>{actionMessage}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--harbor-muted)]" aria-live="polite">
          {unreadTotal} unread conversation
          {unreadTotal === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          className="btn btn-neutral btn-sm min-h-11 gap-1"
          onClick={handleStartCompose}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New message
        </button>
      </div>

      {state.status === "empty" ||
      (state.status === "success" && conversations.length === 0) ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Mail
              className="mt-0.5 h-5 w-5 text-[var(--harbor-mid)]"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                No messages yet
              </h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--harbor-muted)]">
                {state.status === "empty"
                  ? state.message
                  : "Start a conversation with Harborline management."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-neutral btn-sm min-h-11 gap-1"
            onClick={handleStartCompose}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New message
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        {conversations.length > 0 ? (
          <div className={hideListBelowLg ? "hidden lg:block" : undefined}>
            <ConversationList
              conversations={conversations}
              selectedId={composing ? null : selectedId}
              onSelect={handleSelect}
            />
          </div>
        ) : (
          <div className="hidden rounded-2xl border border-dashed border-[var(--harbor-deep)]/20 bg-white/50 p-4 lg:block">
            <p className="text-sm text-[var(--harbor-muted)]">
              Conversations will appear here.
            </p>
          </div>
        )}

        <div
          className={`min-w-0 ${
            hideDetailBelowLg ? "hidden lg:block" : ""
          }`}
        >
          {composing ? (
            <div className="space-y-3">
              <button
                type="button"
                className="btn btn-outline btn-sm min-h-11 gap-1 portal-focus lg:hidden"
                onClick={handleBackToInbox}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to inbox
              </button>
              <NewMessageForm
                values={newForm}
                errors={newErrors}
                sending={sending}
                sendError={sendError}
                onChange={setNewForm}
                onCancel={() => {
                  cancelCompose();
                  setNewForm(EMPTY_NEW);
                  setNewErrors({});
                  setMobileDetailOpen(false);
                }}
                onSubmit={(e) => void handleNewSubmit(e)}
                onRetry={() => {
                  void (async () => {
                    const ok = await sendNewMessage(newForm);
                    if (ok) {
                      setNewForm(EMPTY_NEW);
                      setMobileDetailOpen(true);
                    }
                  })();
                }}
              />
            </div>
          ) : selected ? (
            <div className="space-y-3">
              <button
                type="button"
                className="btn btn-outline btn-sm min-h-11 gap-1 portal-focus lg:hidden"
                onClick={handleBackToInbox}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to inbox
              </button>
              <MessageThread
                conversation={selected}
                reply={replyForm}
                errors={replyErrors}
                sending={sending}
                sendError={sendError}
                onReplyChange={setReplyForm}
                onSubmit={(e) => void handleReplySubmit(e)}
                onRetryFailed={(messageId) =>
                  void retryFailedMessage(selected.id, messageId)
                }
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 p-6">
              <p className="text-sm text-[var(--harbor-muted)]">
                Select a conversation or start a new message.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-[var(--harbor-muted)]">
        Prefer notices instead?{" "}
        <Link href="/portal/announcements" className="link link-primary">
          View announcements
        </Link>
        .
      </p>
    </div>
  );
}

function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: PortalConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-2 shadow-sm"
      aria-label="Conversations"
    >
      <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
        {conversations.map((conv) => {
          const active = conv.id === selectedId;
          const unread = conv.unreadCount > 0;
          return (
            <li key={conv.id}>
              <button
                type="button"
                onClick={() => onSelect(conv.id)}
                className={`min-h-11 w-full rounded-xl px-3 py-3 text-left transition portal-focus ${
                  active
                    ? "bg-[var(--harbor-deep)]/10"
                    : "hover:bg-[var(--harbor-sand)]/50"
                }`}
                aria-current={active ? "true" : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`truncate text-sm ${
                      unread
                        ? "font-semibold text-[var(--harbor-ink)]"
                        : "font-medium text-[var(--harbor-ink)]"
                    }`}
                  >
                    {conv.subject}
                  </p>
                  {unread ? (
                    <span className="badge badge-neutral badge-sm shrink-0">
                      {conv.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-[var(--harbor-muted)]">
                  {conv.category} · {formatMessageDay(conv.lastMessageAt)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--harbor-muted)]">
                  {conv.preview}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MessageThread({
  conversation,
  reply,
  errors,
  sending,
  sendError,
  onReplyChange,
  onSubmit,
  onRetryFailed,
}: {
  conversation: PortalConversation;
  reply: ReplyFormValues;
  errors: MessageFormErrors;
  sending: boolean;
  sendError: string | null;
  onReplyChange: (values: ReplyFormValues) => void;
  onSubmit: (event: FormEvent) => void;
  onRetryFailed: (messageId: string) => void;
}) {
  const replyId = useId();
  const replyErrorId = `${replyId}-error`;

  return (
    <section
      className="flex min-h-[28rem] flex-col rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 shadow-sm"
      aria-labelledby="thread-heading"
    >
      <header className="border-b border-[var(--harbor-deep)]/10 px-4 py-4 sm:px-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-muted)]">
          {conversation.category}
        </p>
        <h2
          id="thread-heading"
          className="mt-1 text-lg font-semibold text-[var(--harbor-ink)]"
        >
          {conversation.subject}
        </h2>
      </header>

      <ul
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
        aria-label="Message thread"
      >
        {conversation.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            sending={sending}
            onRetry={() => onRetryFailed(message.id)}
          />
        ))}
      </ul>

      <form
        className="space-y-3 border-t border-[var(--harbor-deep)]/10 px-4 py-4 sm:px-5"
        onSubmit={onSubmit}
        noValidate
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--harbor-ink)]">
          <Reply className="h-4 w-4" aria-hidden="true" />
          Reply
          <span className="text-error" aria-hidden="true">
            *
          </span>
          <span className="sr-only">(required)</span>
        </div>

        {sendError ? (
          <div className="alert alert-error py-2" role="alert">
            <span className="text-sm">{sendError}</span>
          </div>
        ) : null}

        <label className="sr-only" htmlFor={replyId}>
          Reply message (required)
        </label>
        <textarea
          id={replyId}
          className={`textarea textarea-bordered min-h-24 w-full portal-focus ${
            errors.body ? "textarea-error" : ""
          }`}
          value={reply.body}
          onChange={(e) =>
            onReplyChange({ ...reply, body: e.target.value })
          }
          placeholder="Write your reply…"
          disabled={sending}
          required
          maxLength={MESSAGE_BODY_MAX}
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={errors.body ? replyErrorId : undefined}
        />
        {errors.body ? (
          <p id={replyErrorId} className="text-sm text-error" role="alert">
            {errors.body}
          </p>
        ) : null}

        <AttachmentPicker
          attachments={reply.attachments}
          disabled={sending}
          error={errors.attachments}
          onAdd={(files) =>
            onReplyChange({
              ...reply,
              attachments: [...reply.attachments, ...files],
            })
          }
          onRemove={(id) =>
            onReplyChange({
              ...reply,
              attachments: reply.attachments.filter((a) => a.id !== id),
            })
          }
        />

        <button
          type="submit"
          className="btn btn-neutral btn-sm min-h-11 gap-1"
          disabled={sending || reply.body.trim().length === 0}
        >
          {sending ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Send reply
            </>
          )}
        </button>
      </form>
    </section>
  );
}

function MessageBubble({
  message,
  sending,
  onRetry,
}: {
  message: PortalMessage;
  sending: boolean;
  onRetry: () => void;
}) {
  const fromTenant = message.senderRole === "tenant";
  const failed = message.deliveryStatus === "failed";
  const isSending = message.deliveryStatus === "sending";

  return (
    <li
      className={`flex ${fromTenant ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-3 ${
          fromTenant
            ? "bg-[var(--harbor-deep)] text-white"
            : "bg-[var(--harbor-sand)]/60 text-[var(--harbor-ink)]"
        } ${failed ? "ring-2 ring-error/60" : ""}`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p
            className={`text-xs font-semibold ${
              fromTenant ? "text-white/90" : "text-[var(--harbor-ink)]"
            }`}
          >
            {fromTenant ? `${message.senderName} (You)` : message.senderName}
          </p>
          <time
            className={`text-[0.7rem] ${
              fromTenant ? "text-white/70" : "text-[var(--harbor-muted)]"
            }`}
            dateTime={message.sentAt}
          >
            {formatMessageTimestamp(message.sentAt)}
          </time>
        </div>
        <p
          className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${
            fromTenant ? "text-white/95" : "text-[var(--harbor-ink)]/90"
          }`}
        >
          {message.body}
        </p>

        {message.attachments.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {message.attachments.map((file) => (
              <li
                key={file.id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                  fromTenant ? "bg-white/15" : "bg-white/70"
                }`}
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">
                  {file.fileName} · {formatAttachmentSize(file.fileSizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {failed ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-error-content/90 bg-error/20 rounded-lg px-2 py-1">
              Failed to send
            </p>
            <button
              type="button"
              className="btn btn-sm min-h-11 bg-white text-[var(--harbor-ink)]"
              onClick={onRetry}
              disabled={sending}
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : null}

        {isSending ? (
          <p className="mt-2 text-xs opacity-80">Sending…</p>
        ) : null}
      </div>
    </li>
  );
}

function NewMessageForm({
  values,
  errors,
  sending,
  sendError,
  onChange,
  onCancel,
  onSubmit,
  onRetry,
}: {
  values: NewMessageFormValues;
  errors: MessageFormErrors;
  sending: boolean;
  sendError: string | null;
  onChange: (values: NewMessageFormValues) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
  onRetry: () => void;
}) {
  const categoryId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const categoryErrorId = `${categoryId}-error`;
  const subjectErrorId = `${subjectId}-error`;
  const bodyErrorId = `${bodyId}-error`;

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-4 shadow-sm sm:p-5"
      aria-labelledby="new-message-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="new-message-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            New message
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-muted)]">
            Send a secure message to Harborline management. Replies appear in
            this inbox (not live chat).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-square min-h-11 min-w-11 portal-focus"
          onClick={onCancel}
          aria-label="Cancel new message"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {sendError ? (
        <div className="alert alert-error mt-4" role="alert">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="text-sm">{sendError}</span>
            <button
              type="button"
              className="btn btn-sm min-h-11"
              onClick={onRetry}
              disabled={sending}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry send
            </button>
          </div>
        </div>
      ) : null}

      <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
        <div className="form-control">
          <label className="label" htmlFor={categoryId}>
            <span className="label-text font-medium">
              Category
              <span className="text-error" aria-hidden="true">
                {" "}
                *
              </span>
              <span className="sr-only"> (required)</span>
            </span>
          </label>
          <select
            id={categoryId}
            className={`select select-bordered w-full min-h-11 portal-focus ${
              errors.category ? "select-error" : ""
            }`}
            value={values.category}
            onChange={(e) =>
              onChange({
                ...values,
                category: e.target.value as NewMessageFormValues["category"],
              })
            }
            required
            disabled={sending}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? categoryErrorId : undefined}
          >
            <option value="">Select a category</option>
            {MESSAGE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category ? (
            <p id={categoryErrorId} className="mt-1 text-sm text-error" role="alert">
              {errors.category}
            </p>
          ) : null}
        </div>

        <div className="form-control">
          <label className="label" htmlFor={subjectId}>
            <span className="label-text font-medium">
              Subject
              <span className="text-error" aria-hidden="true">
                {" "}
                *
              </span>
              <span className="sr-only"> (required)</span>
            </span>
          </label>
          <input
            id={subjectId}
            type="text"
            className={`input input-bordered w-full min-h-11 portal-focus ${
              errors.subject ? "input-error" : ""
            }`}
            value={values.subject}
            onChange={(e) => onChange({ ...values, subject: e.target.value })}
            required
            maxLength={MESSAGE_SUBJECT_MAX}
            disabled={sending}
            aria-invalid={errors.subject ? true : undefined}
            aria-describedby={errors.subject ? subjectErrorId : undefined}
          />
          {errors.subject ? (
            <p id={subjectErrorId} className="mt-1 text-sm text-error" role="alert">
              {errors.subject}
            </p>
          ) : null}
        </div>

        <div className="form-control">
          <label className="label" htmlFor={bodyId}>
            <span className="label-text font-medium">
              Message
              <span className="text-error" aria-hidden="true">
                {" "}
                *
              </span>
              <span className="sr-only"> (required)</span>
            </span>
          </label>
          <textarea
            id={bodyId}
            className={`textarea textarea-bordered min-h-32 w-full portal-focus ${
              errors.body ? "textarea-error" : ""
            }`}
            value={values.body}
            onChange={(e) => onChange({ ...values, body: e.target.value })}
            required
            maxLength={MESSAGE_BODY_MAX}
            disabled={sending}
            placeholder="How can Harborline help?"
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={errors.body ? bodyErrorId : undefined}
          />
          {errors.body ? (
            <p id={bodyErrorId} className="mt-1 text-sm text-error" role="alert">
              {errors.body}
            </p>
          ) : null}
        </div>

        <AttachmentPicker
          attachments={values.attachments}
          disabled={sending}
          error={errors.attachments}
          onAdd={(files) =>
            onChange({
              ...values,
              attachments: [...values.attachments, ...files],
            })
          }
          onRemove={(id) =>
            onChange({
              ...values,
              attachments: values.attachments.filter((a) => a.id !== id),
            })
          }
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="btn btn-neutral min-h-11 gap-1"
            disabled={sending}
          >
            {sending ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                Send message
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-ghost min-h-11"
            onClick={onCancel}
            disabled={sending}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function AttachmentPicker({
  attachments,
  disabled,
  error: externalError,
  onAdd,
  onRemove,
}: {
  attachments: MessageAttachment[];
  disabled?: boolean;
  error?: string;
  onAdd: (files: MessageAttachment[]) => void;
  onRemove: (id: string) => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? externalError ?? null;

  function handleFiles(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;

    const remainingSlots = MAX_MESSAGE_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      setLocalError(
        `You can attach up to ${MAX_MESSAGE_ATTACHMENTS} files.`
      );
      return;
    }

    const accepted: MessageAttachment[] = [];
    let rejectionMessage: string | null = null;

    for (const file of files) {
      const validationError = isAllowedMessageAttachment(file);
      if (validationError) {
        rejectionMessage = validationError;
        continue;
      }
      if (accepted.length >= remainingSlots) {
        rejectionMessage = `You can attach up to ${MAX_MESSAGE_ATTACHMENTS} files.`;
        break;
      }
      accepted.push(attachmentMetaFromFile(file));
    }

    setLocalError(rejectionMessage);
    if (accepted.length > 0) onAdd(accepted);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className="btn btn-outline btn-sm min-h-11 gap-1 portal-focus"
        >
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          Add attachment
        </label>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          multiple
          disabled={disabled || attachments.length >= MAX_MESSAGE_ATTACHMENTS}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="text-xs text-[var(--harbor-muted)]">
          Optional · up to {MAX_MESSAGE_ATTACHMENTS} files
        </span>
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {attachments.length > 0 ? (
        <ul className="space-y-1">
          {attachments.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-[var(--harbor-sand)]/40 px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate">
                {file.fileName} · {formatAttachmentSize(file.fileSizeBytes)}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm min-h-11 min-w-11 portal-focus"
                onClick={() => onRemove(file.id)}
                disabled={disabled}
                aria-label={`Remove ${file.fileName}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
