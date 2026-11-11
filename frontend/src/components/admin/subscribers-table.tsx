"use client";

import { confirmToast } from "@/components/ui/confirm-toast";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { PaginationMeta, Subscriber, TeamMessageSent } from "@/lib/api";
import { MessageComposer, SentMessages, type Audience } from "@/components/admin/team-messages";
import { Megaphone, MessageSquare } from "lucide-react";
import { removeSubscriber, setSubscriberActive } from "@/lib/admin-actions";

type Status = "" | "active" | "unsubscribed";

function href(query: string, status: Status, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/leads/subscribers?${qs}` : "/admin/leads/subscribers";
}

const ACCOUNT: Record<Subscriber["account"], { label: string; cls: string }> = {
  registered: { label: "Registered", cls: "bg-emerald-50 text-emerald-700" },
  subscriber: { label: "Created on subscribing", cls: "bg-amber-50 text-amber-700" },
  none: { label: "No account", cls: "bg-bg-alt text-ink-soft" },
};

const FILTERS: { value: Status; label: string }[] = [
  { value: "", label: "All" },
  { value: "active", label: "Subscribed" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

const pageButton = "inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 font-medium";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * The emails entered in the site footer's Subscribe box, as a table a page at a time. The server does the search,
 * the status filter and the paging (the URL holds them). Each address shows whether it has an account.
 */
export function SubscribersTable({
  subscribers,
  meta,
  query,
  status,
  sent,
  sentTotal,
}: {
  subscribers: Subscriber[];
  meta: PaginationMeta;
  query: string;
  status: Status;
  /** The latest messages the team sent, for the history under the table. */
  sent: TeamMessageSent[];
  sentTotal: number;
}) {
  const router = useRouter();
  const [text, setText] = useState(query);
  const first = (meta.page - 1) * meta.limit;
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  // Ticked rows (subscribed ones only: a message never goes to an address that left), and the message being written.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState<Audience | null>(null);
  const pickable = subscribers.filter((s) => s.active);
  const allPicked = pickable.length > 0 && pickable.every((s) => picked.has(s.id));
  const toggle = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const recipientsOf = (ids: string[]) => subscribers.filter((s) => ids.includes(s.id)).map((s) => ({ id: s.id, email: s.email }));

  // Unsubscribe, subscribe again, or remove an address; the table is then read again from the server.
  const manage = (run: () => ReturnType<typeof removeSubscriber>) =>
    start(async () => {
      setError("");
      const result = await run();
      if ("error" in result) return setError(result.error);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Subscribed emails</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Everyone who entered their email in the Subscribe box on the site. An address with no account gets one when it subscribes; its owner sets a password with Forgot password or by registering with the same email.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(href(text.trim(), status, 1));
          }}
          className="relative w-full max-w-xs"
          role="search"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search an email"
            aria-label="Search subscribed emails"
            className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-9 text-sm text-ink focus:border-brand focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setText("");
                router.push(href("", status, 1));
              }}
              aria-label="Clear the search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </form>
      </header>

      <nav className="flex flex-wrap gap-1.5" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f.value || "all"}
            href={href(query, f.value, 1)}
            aria-current={status === f.value ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${status === f.value ? "bg-brand text-white" : "text-ink-soft hover:bg-bg-alt hover:text-brand"}`}
          >
            {f.label}
          </Link>
        ))}
        <span className="ml-auto self-center text-sm text-ink-soft">{meta.total.toLocaleString("en-IN")} {meta.total === 1 ? "email" : "emails"}</span>
      </nav>

      {/* Writing to subscribers: everyone at once, or the ones ticked below. */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand/30 bg-brand-soft/40 px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Message your subscribers.</span> It lands in their Messages inbox under My account, with a notification.
        </p>
        {picked.size > 0 && (
          <button
            type="button"
            onClick={() => setComposing({ kind: "selected", recipients: recipientsOf([...picked]) })}
            className="inline-flex items-center gap-2 rounded-lg border border-brand bg-surface px-4 py-2 text-sm font-bold text-brand transition hover:bg-brand-soft"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" /> Message selected ({picked.size})
          </button>
        )}
        <button
          type="button"
          onClick={() => setComposing({ kind: "all" })}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <Megaphone className="h-4 w-4" aria-hidden="true" /> Broadcast to all
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      {meta.total === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-soft">
          {query || status ? "No subscribed email matches this search." : "Nobody has subscribed yet. Emails entered in the site footer will appear here."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-alt/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select every subscribed address on this page"
                      checked={allPicked}
                      disabled={pickable.length === 0}
                      onChange={() => setPicked(allPicked ? new Set() : new Set(pickable.map((s) => s.id)))}
                      className="h-4 w-4 accent-[var(--color-brand)]"
                    />
                  </th>
                  <th className="w-14 px-4 py-3">#</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Subscribed on</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s, i) => {
                  const account = ACCOUNT[s.account];
                  return (
                    <tr key={s.id} className={`border-b border-line last:border-0 hover:bg-bg-alt/40 ${picked.has(s.id) ? "bg-brand-soft/30" : ""}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${s.email}`}
                          checked={picked.has(s.id)}
                          disabled={!s.active}
                          title={s.active ? undefined : "Unsubscribed addresses cannot be messaged"}
                          onChange={() => toggle(s.id)}
                          className="h-4 w-4 accent-[var(--color-brand)] disabled:opacity-40"
                        />
                      </td>
                      <td className="px-4 py-3 text-ink-faint">{first + i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${account.cls}`}>{account.label}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{formatDate(s.subscribedAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${s.active ? "text-emerald-700" : "text-ink-faint"}`}>{s.active ? "Subscribed" : "Unsubscribed"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {s.active && (
                            <button
                              type="button"
                              onClick={() => setComposing({ kind: "selected", recipients: [{ id: s.id, email: s.email }] })}
                              className="inline-flex items-center gap-1 rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-soft"
                            >
                              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Message
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => manage(() => setSubscriberActive(s.id, !s.active))}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-50"
                          >
                            {s.active ? "Unsubscribe" : "Subscribe again"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              void confirmToast("Its account, if any, is kept.", { title: `Remove ${s.email}?`, confirmLabel: "Remove", tone: "danger" }).then((ok) => ok && manage(() => removeSubscriber(s.id)));
                            }}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-soft">
            <span>
              Showing {(first + 1).toLocaleString("en-IN")}–{(first + subscribers.length).toLocaleString("en-IN")} of {meta.total.toLocaleString("en-IN")}
            </span>
            {meta.pages > 1 && (
              <nav className="flex items-center gap-2" aria-label="Pages">
                {meta.page > 1 ? (
                  <Link href={href(query, status, meta.page - 1)} className={`${pageButton} text-ink-soft hover:border-brand hover:text-brand`}>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </Link>
                ) : (
                  <span className={`${pageButton} opacity-40`}>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </span>
                )}
                <span>Page {meta.page} of {meta.pages}</span>
                {meta.page < meta.pages ? (
                  <Link href={href(query, status, meta.page + 1)} className={`${pageButton} text-ink-soft hover:border-brand hover:text-brand`}>
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className={`${pageButton} opacity-40`}>
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </nav>
            )}
          </div>
        </div>
      )}
      <SentMessages messages={sent} total={sentTotal} />

      {composing && (
        <MessageComposer
          audience={composing}
          onClose={() => {
            setComposing(null);
            setPicked(new Set());
          }}
        />
      )}
    </div>
  );
}
