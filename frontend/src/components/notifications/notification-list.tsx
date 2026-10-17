"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import type { NotificationCount, NotificationItem } from "@/lib/api";
import { isWaiting } from "@/lib/use-notifications";
import { formatFull } from "@/lib/lead-labels";

type Actions = {
  acknowledge: (id: string) => Promise<void>;
  acknowledgeEverything: () => Promise<void>;
  clear: (id: string) => Promise<void>;
  clearEverything: () => Promise<void>;
};

/**
 * The notifications and what can be done with them: acknowledge one or all, clear one or all.
 * Shared by the bell's dropdown and the full page.
 *
 * Ones that ask for an acknowledgement sit at the top (the API sorts them there) and cannot be
 * cleared one at a time until acknowledged. "Clear all" acknowledges as it clears, after asking,
 * and the time is kept.
 */
export function NotificationList({
  items,
  count,
  actions,
  onNavigate,
}: {
  items: NotificationItem[];
  count: NotificationCount;
  actions: Actions;
  onNavigate?: () => void;
}) {
  if (items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-ink-soft">You are all caught up.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-line px-4 py-2 text-xs">
        {count.pendingAck > 0 && (
          <button type="button" onClick={() => void actions.acknowledgeEverything()} className="font-semibold text-brand hover:underline">
            Acknowledge all ({count.pendingAck})
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const waiting = count.pendingAck > 0 ? ` ${count.pendingAck} still ${count.pendingAck === 1 ? "needs" : "need"} acknowledging and will be acknowledged.` : "";
            if (window.confirm(`Clear all notifications?${waiting}`)) void actions.clearEverything();
          }}
          className="font-semibold text-ink-soft hover:text-red-700 hover:underline"
        >
          Clear all
        </button>
      </div>

      <ul>
        {items.map((n) => {
          const waiting = isWaiting(n);
          const body = (
            <>
              <p className={`text-sm ${n.read && !waiting ? "font-medium text-ink-soft" : "font-semibold text-ink"}`}>{n.title}</p>
              {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{n.body}</p>}
            </>
          );
          return (
            <li
              key={n.id}
              className={`flex gap-3 border-b border-line-soft px-4 py-3 last:border-b-0 ${waiting ? "bg-brand-soft/50" : ""}`}
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${waiting ? "bg-red-600" : n.read ? "bg-transparent" : "bg-brand"}`}
              />
              <div className="min-w-0 flex-1">
                {n.link ? (
                  <Link href={n.link} onClick={onNavigate} className="block hover:underline">
                    {body}
                  </Link>
                ) : (
                  body
                )}
                <p className="mt-1 text-[11px] text-ink-faint">
                  {formatFull(n.createdAt)}
                  {n.handledBy && ` · Handled by ${n.handledBy}`}
                  {n.acknowledgedAt && ` · Acknowledged ${formatFull(n.acknowledgedAt)}`}
                </p>
                {waiting && (
                  <button
                    type="button"
                    onClick={() => void actions.acknowledge(n.id)}
                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-dark"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Acknowledge
                  </button>
                )}
              </div>
              {!waiting && (
                <button
                  type="button"
                  onClick={() => void actions.clear(n.id)}
                  aria-label={`Clear: ${n.title}`}
                  title="Clear"
                  className="h-6 w-6 shrink-0 rounded-md text-ink-faint transition hover:bg-bg-alt hover:text-ink"
                >
                  <X className="mx-auto h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
