"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThreadView } from "@/components/messages/thread-view";
import { replyToThread, resolveThreadAction } from "@/lib/admin-actions";
import { collegeNewThread, collegeSendMessage } from "@/lib/college-actions";
import type { ThreadDetail } from "@/lib/api";

/** A conversation as the platform team sees it: replies resolve it, and "Mark handled" closes it without one. */
export function PlatformThread({ thread }: { thread: ThreadDetail }) {
  return <ThreadView thread={thread} viewerSide="platform" send={replyToThread} resolve={resolveThreadAction} />;
}

/** A conversation as a college admin sees it. */
export function CollegeThread({ thread }: { thread: ThreadDetail }) {
  return <ThreadView thread={thread} viewerSide="college" send={collegeSendMessage} />;
}

const INPUT =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

/** Starts a conversation with the platform team, optionally about one of the college's requests. */
export function NewThreadForm({ changeRequestId, defaultSubject = "" }: { changeRequestId?: string; defaultSubject?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-2xl border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await collegeNewThread(String(data.get("subject") ?? ""), String(data.get("body") ?? ""), changeRequestId);
          if ("error" in result) return setError(result.error);
          router.push(`/admin/messages?thread=${result.thread.id}`);
        });
      }}
    >
      <h2 className="font-display text-base font-semibold text-ink">Write to the TopCollegePath team</h2>
      <p className="text-xs text-ink-soft">Every admin on the team is told. Whoever replies first answers for everyone.</p>
      <div>
        <label htmlFor="nt-subject" className="block text-xs font-semibold text-ink">
          Subject
        </label>
        <input id="nt-subject" name="subject" required minLength={3} maxLength={200} defaultValue={defaultSubject} className={INPUT} />
      </div>
      <div>
        <label htmlFor="nt-body" className="block text-xs font-semibold text-ink">
          Message
        </label>
        <textarea id="nt-body" name="body" required minLength={2} maxLength={4000} rows={5} className={INPUT} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
