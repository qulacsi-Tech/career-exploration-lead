"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ThreadDetail } from "@/lib/api";
import { formatFull } from "@/lib/lead-labels";

type ThreadResult = { thread: ThreadDetail } | { error: string };

/**
 * One conversation: the messages, and a box to reply.
 *
 * `viewerSide` decides which messages are drawn as "mine". The send and resolve calls are passed in,
 * because the platform team and a college admin go through different endpoints. Resolved means
 * "answered", not "locked": either side can keep writing, and a college admin writing again reopens it.
 */
export function ThreadView({
  thread: initial,
  viewerSide,
  send,
  resolve,
}: {
  thread: ThreadDetail;
  viewerSide: "college" | "platform";
  send: (threadId: string, body: string) => Promise<ThreadResult>;
  resolve?: (threadId: string) => Promise<ThreadResult>;
}) {
  const router = useRouter();
  // What was just sent shows at once; the refreshed page data takes over when it has caught up or moved on.
  const [sent, setSent] = useState<ThreadDetail | null>(null);
  const thread = sent && sent.id === initial.id && sent.messages.length >= initial.messages.length ? sent : initial;
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [thread.messages.length]);

  const apply = (call: () => Promise<ThreadResult>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await call();
      if ("error" in result) return setError(result.error);
      setSent(result.thread);
      after?.();
      router.refresh();
    });
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-ink">{thread.subject}</h2>
          <p className="mt-0.5 text-xs text-ink-faint">
            {thread.collegeName && `${thread.collegeName} · `}
            Started {formatFull(thread.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
              thread.status === "open" ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line bg-bg-alt text-ink-soft"
            }`}
            title={thread.resolvedBy ? `Answered by ${thread.resolvedBy}` : undefined}
          >
            {thread.status === "open" ? "Waiting for a reply" : `Resolved${thread.resolvedBy ? ` by ${thread.resolvedBy}` : ""}`}
          </span>
          {resolve && thread.status === "open" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => apply(() => resolve(thread.id))}
              className="rounded-lg border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-brand hover:text-brand disabled:opacity-60"
            >
              Mark handled
            </button>
          )}
        </div>
      </header>

      <ol className="min-h-48 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {thread.messages.map((m) => {
          const mine = m.side === viewerSide;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-brand text-white" : "bg-bg-alt text-ink"}`}>
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "text-white/80" : "text-ink-faint"}`}>
                  {m.sender}
                  {m.side === "platform" && " · TopCollegePath team"} · {formatFull(m.at)}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={end} />
      </ol>

      <form
        className="border-t border-line p-4"
        onSubmit={(e) => {
          e.preventDefault();
          apply(() => send(thread.id, body), () => setBody(""));
        }}
      >
        <label htmlFor="thread-reply" className="sr-only">
          Your message
        </label>
        <textarea
          id="thread-reply"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={viewerSide === "platform" ? "Write a reply. It tells the college admin and marks this handled for the team." : "Write a message to the TopCollegePath team."}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || body.trim().length < 2}
          className="mt-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
