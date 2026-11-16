"use client";

import { confirmToast } from "@/components/ui/confirm-toast";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import type { InboxMessage } from "@/lib/api";
import { markMessageRead, removeMessage } from "@/lib/message-actions";
import { ChatText } from "@/components/chat-text";
import { mediaUrl } from "@/lib/media";

function when(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * The student's messages from the TopCollegePath team: newsletters and direct notes. Unread ones are bold with a dot;
 * opening one marks it read. A message can be deleted from the inbox.
 */
export function MessageInbox({ messages }: { messages: InboxMessage[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [read, setRead] = useState<Set<string>>(() => new Set(messages.filter((m) => m.read).map((m) => m.id)));
  const [pending, start] = useTransition();

  const toggle = (m: InboxMessage) => {
    setOpen(open === m.id ? null : m.id);
    if (!read.has(m.id)) {
      setRead((cur) => new Set(cur).add(m.id));
      void markMessageRead(m.id);
    }
  };

  const remove = (m: InboxMessage) =>
    start(async () => {
      if (!(await confirmToast("It will be removed from your inbox.", { title: "Delete this message?", confirmLabel: "Delete", tone: "danger" }))) return;
      const result = await removeMessage(m.id);
      if (result.ok) router.refresh();
    });

  return (
    <ul className="space-y-3">
      {messages.map((m) => {
        const unread = !read.has(m.id);
        const isOpen = open === m.id;
        return (
          <li key={m.id} className={`overflow-hidden rounded-2xl border bg-surface transition ${unread ? "border-brand/40 shadow-sm" : "border-line"}`}>
            <button type="button" onClick={() => toggle(m)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-4 text-left">
              <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${unread ? "bg-brand text-white" : "bg-bg-alt text-ink-soft"}`}>
                {unread ? <Mail className="h-4 w-4" aria-hidden="true" /> : <MailOpen className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`truncate ${unread ? "font-bold text-ink" : "font-semibold text-ink-soft"}`}>{m.subject}</span>
                  {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                </span>
                <span className="block text-xs text-ink-faint">
                  {m.from} · {when(m.sentAt)}
                </span>
                {!isOpen && <span className="mt-1 line-clamp-1 block text-sm text-ink-soft">{m.body.replace(/[*_~`]/g, "")}</span>}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-line-soft bg-[#efe7dd] bg-[radial-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] px-4 pb-4 pt-3 [background-size:14px_14px] sm:pl-16">
                {/* The message as a chat bubble from the team, formatted as it was written. */}
                <div className="max-w-2xl rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-ink shadow-sm">
                  <p className="text-xs font-bold text-emerald-700">{m.from}</p>
                  {m.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(m.image)} alt={m.subject} loading="lazy" className="mt-2 w-full rounded-lg" />
                  )}
                  <ChatText text={m.body} className="mt-1" />
                  <p className="mt-1 text-right text-[10px] text-ink-faint">{when(m.sentAt)}</p>
                </div>
                <button type="button" onClick={() => remove(m)} disabled={pending} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint transition hover:text-red-700 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
