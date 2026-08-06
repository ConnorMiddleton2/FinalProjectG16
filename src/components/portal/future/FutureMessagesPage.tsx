"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { FutureMessageThread, FutureMessageTopic } from "@/lib/portal/future/models";
import { listThreads, sendMessage } from "@/lib/portal/future/services";

function MessagesInner({ session }: { session: PortalTenantSession }) {
  const [threads, setThreads] = useState<FutureMessageThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState<FutureMessageTopic>("unit_question");
  const [sending, setSending] = useState(false);

  async function load() {
    setStatus("loading");
    const result = await listThreads(session.userId);
    if (!result.ok) {
      setError(result.error.message);
      setStatus("error");
      return;
    }
    setThreads(result.data);
    setActiveId((prev) => prev ?? result.data[0]?.id ?? null);
    setStatus(result.data.length ? "ready" : "empty");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.userId]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  async function onSend(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const result = await sendMessage({
      ownerUserId: session.userId,
      threadId: active?.id,
      subject: active ? undefined : subject || "Leasing question",
      topic: active ? undefined : topic,
      body,
      senderName: session.displayName,
    });
    setSending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setBody("");
    setSubject("");
    await load();
    setActiveId(result.data.id);
  }

  if (status === "loading") {
    return <p className="text-sm text-[var(--harbor-muted)]" role="status">Loading messages…</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <PortalCard className="space-y-2 self-start">
        <h2 className="portal-section-title">Conversations</h2>
        {status === "error" ? (
          <p className="text-sm text-error" role="alert">{error}</p>
        ) : null}
        {status === "empty" ? (
          <p className="portal-empty">No messages yet. Start a new conversation.</p>
        ) : null}
        <ul className="space-y-1">
          {threads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                className={`flex min-h-11 w-full flex-col rounded-xl px-3 py-2 text-left text-sm portal-focus ${
                  activeId === thread.id
                    ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                    : "hover:bg-[var(--harbor-mist)]/70"
                }`}
                onClick={() => setActiveId(thread.id)}
              >
                <span className="font-medium">{thread.subject}</span>
                <span className="truncate opacity-80">{thread.preview}</span>
              </button>
            </li>
          ))}
        </ul>
      </PortalCard>

      <div className="space-y-4">
        <PortalCard className="space-y-3">
          <h2 className="portal-section-title">
            {active ? active.subject : "New message to leasing"}
          </h2>
          {active ? (
            <ul className="max-h-80 space-y-3 overflow-y-auto">
              {active.messages.map((message) => (
                <li
                  key={message.id}
                  className={`rounded-xl p-3 text-sm ${
                    message.senderRole === "applicant"
                      ? "bg-[var(--harbor-mist)]/60"
                      : "bg-white border border-[var(--harbor-deep)]/10"
                  }`}
                >
                  <p className="font-medium text-[var(--harbor-ink)]">
                    {message.senderName}
                  </p>
                  <p className="mt-1 text-[var(--harbor-muted)]">{message.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--harbor-muted)]">
              Ask Harborline leasing about a unit, tour, or application.
            </p>
          )}
        </PortalCard>

        <PortalCard as="form" onSubmit={onSend} className="space-y-3">
          {!active ? (
            <>
              <PortalField
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <PortalField
                label="Topic"
                as="select"
                value={topic}
                onChange={(e) => setTopic(e.target.value as FutureMessageTopic)}
              >
                <option value="unit_question">Unit question</option>
                <option value="tour">Tour</option>
                <option value="application_question">Application</option>
                <option value="missing_documents">Documents</option>
                <option value="status_question">Status</option>
                <option value="lease_offer">Lease offer</option>
                <option value="move_in_preparation">Move-in</option>
              </PortalField>
            </>
          ) : null}
          <PortalField
            label="Message"
            as="textarea"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error ? <p className="text-sm text-error" role="alert">{error}</p> : null}
          <button type="submit" className="portal-btn portal-btn-primary portal-focus" disabled={sending}>
            {sending ? "Sending…" : "Send message"}
          </button>
        </PortalCard>
      </div>
    </div>
  );
}

export function FutureMessagesPage() {
  return (
    <RequireFutureApplicant title="Sign in to message leasing">
      {(session) => <MessagesInner session={session} />}
    </RequireFutureApplicant>
  );
}
