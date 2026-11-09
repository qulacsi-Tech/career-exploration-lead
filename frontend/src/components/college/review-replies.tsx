"use client";

import { useEffect, useState, useTransition } from "react";
import { CornerDownRight, MessageCircle, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useCollegeActions } from "@/components/college/college-actions";
import { loadReviewReplies, recordReviewInterest, removeReply, replyToReview, voteReply } from "@/lib/college-engage-actions";
import { SESSION_CHANGED_EVENT } from "@/lib/user-session-cookie";
import { formatFull } from "@/lib/lead-labels";
import type { ReviewReplyItem } from "@/lib/api";

/** Every reply under a college's reviews, fetched once and shared by all of its review cards. */
const repliesCache = new Map<string, Promise<Record<string, ReviewReplyItem[]>>>();
const REPLIES_CHANGED = "tcp:replies-changed";

function repliesFor(slug: string, fresh = false) {
  if (fresh || !repliesCache.has(slug)) repliesCache.set(slug, loadReviewReplies(slug));
  return repliesCache.get(slug)!;
}

/** Deeper replies are still stored under the one they answer, but are drawn at this depth so the thread stays readable. */
const MAX_INDENT = 3;

/** How many replies anyone sees under a review at first. The rest are for signed-in students. */
const FREE_REPLIES = 3;

/**
 * The conversation under a review. Any signed-in student can reply to the review, and reply back to any reply, so a
 * thread can run on. A visitor who is not signed in is asked to sign in or register first. A reply shows at once,
 * with no reload, and the people being answered are told. A student can take back their own reply.
 */
export function ReviewReplies({ reviewId, children }: { reviewId?: string; /** The like and dislike buttons, which sit in the same row as Reply. */ children?: React.ReactNode }) {
  const actions = useCollegeActions();
  const slug = actions?.slug;
  const [all, setAll] = useState<ReviewReplyItem[]>([]);
  const [open, setOpen] = useState(false);
  /** Whether the replies past the first few are shown: after a signed-in student asks for them, or posts one. */
  const [unlocked, setUnlocked] = useState(false);
  /** What the open reply box answers: a reply's id, or "review" for the review itself. */
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!slug || !reviewId) return;
    let alive = true;
    const load = (fresh: boolean) => repliesFor(slug, fresh).then((byReview) => alive && setAll(byReview[reviewId] ?? []));
    void load(false);
    // Signed in or out from a dialog: which replies are theirs may have changed.
    const again = () => void load(true);
    window.addEventListener(SESSION_CHANGED_EVENT, again);
    window.addEventListener(REPLIES_CHANGED, again);
    return () => {
      alive = false;
      window.removeEventListener(SESSION_CHANGED_EVENT, again);
      window.removeEventListener(REPLIES_CHANGED, again);
    };
  }, [slug, reviewId]);

  if (!actions || !slug || !reviewId) return null;

  // The replies in the order they read down the thread; only the first few are shown until the rest are asked for.
  const order: string[] = [];
  const walk = (parent: string | null) => {
    for (const x of all.filter((r) => r.parentId === parent)) {
      order.push(x.id);
      walk(x.id);
    }
  };
  walk(null);
  const visible = new Set(unlocked ? order : order.slice(0, FREE_REPLIES));
  const hiddenCount = order.length - visible.size;
  const childrenOf = (parent: string | null) => all.filter((x) => x.parentId === parent && visible.has(x.id));

  const moreReplies = () =>
    void actions.ensureSignedIn("Sign in to read more replies. It takes a minute.", () => {
      setUnlocked(true);
      void recordReviewInterest(slug, "replies");
    });

  const startReply = (target: string) =>
    void actions.ensureSignedIn("Sign in to reply. It takes a minute.", () => {
      setReplyingTo(target);
      setDraft("");
      setError(null);
    });

  const send = () => {
    if (draft.trim().length < 2) return setError("Write a reply first.");
    const parentId = replyingTo === "review" ? null : replyingTo;
    start(async () => {
      const result = await replyToReview(reviewId, slug, draft.trim(), parentId);
      if (!result.ok) return setError(result.message);
      setAll((current) => [...current, result.reply]);
      repliesCache.delete(slug);
      setReplyingTo(null);
      setDraft("");
      setError(null);
      setOpen(true);
      // Someone who can post is signed in, so the rest of the thread is theirs to read.
      setUnlocked(true);
    });
  };

  const choose = (reply: ReviewReplyItem, vote: "like" | "dislike") =>
    void actions.ensureSignedIn("Sign in to like or dislike this reply. It takes a minute.", () =>
      start(async () => {
        const result = await voteReply(reply.id, vote);
        if (!result.ok) return setError(result.message);
        setError(null);
        setAll((current) => current.map((x) => (x.id === reply.id ? { ...x, likes: result.likes, dislikes: result.dislikes, myVote: result.mine } : x)));
        repliesCache.delete(slug);
      }),
    );

  const reaction = (reply: ReviewReplyItem, vote: "like" | "dislike") => {
    const Icon = vote === "like" ? ThumbsUp : ThumbsDown;
    const count = vote === "like" ? reply.likes : reply.dislikes;
    const on = reply.myVote === vote;
    return (
      <button
        type="button"
        onClick={() => choose(reply, vote)}
        disabled={pending || reply.mine}
        title={reply.mine ? "You can't react to your own reply" : undefined}
        aria-pressed={on}
        aria-label={`${vote === "like" ? "Like" : "Dislike"} this reply (${count})`}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition disabled:cursor-default disabled:opacity-70 ${on ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand hover:text-brand"}`}
      >
        <Icon className={`h-3.5 w-3.5 ${on ? "fill-brand text-brand" : ""}`} aria-hidden="true" />
        {vote === "like" ? "Like" : "Dislike"}
        {count > 0 ? ` (${count})` : ""}
      </button>
    );
  };

  const take = (id: string) =>
    start(async () => {
      const result = await removeReply(id);
      if (!result.ok) return setError(result.message);
      // The replies under it go with it.
      const gone = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const x of all) {
          if (x.parentId && gone.has(x.parentId) && !gone.has(x.id)) {
            gone.add(x.id);
            grew = true;
          }
        }
      }
      setAll((current) => current.filter((x) => !gone.has(x.id)));
      repliesCache.delete(slug);
    });

  const box = (target: string, label: string) =>
    replyingTo === target && (
      <div className="mt-2">
        <label className="sr-only" htmlFor={`reply-${reviewId}-${target}`}>{label}</label>
        <textarea
          id={`reply-${reviewId}-${target}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={1000}
          autoFocus
          placeholder={label}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
        />
        {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
        <div className="mt-1.5 flex gap-2">
          <button type="button" onClick={send} disabled={pending} className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60">{pending ? "Posting…" : "Post reply"}</button>
          <button type="button" onClick={() => setReplyingTo(null)} className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand hover:text-brand">Cancel</button>
        </div>
      </div>
    );

  const thread = (parent: string | null, depth: number): React.ReactNode =>
    childrenOf(parent).map((x) => (
      <li key={x.id} className="mt-3">
        <div className="rounded-xl border border-line-soft bg-surface px-4 py-3">
          <p className="text-sm text-ink">{x.body}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
            <span className="font-semibold text-ink-soft">{x.author}</span>
            <span aria-hidden>&middot;</span>
            <span>{x.createdAt ? formatFull(x.createdAt) : ""}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {reaction(x, "like")}
            {reaction(x, "dislike")}
            <button type="button" onClick={() => startReply(x.id)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 font-semibold text-ink-soft transition hover:border-brand hover:text-brand">
              <CornerDownRight className="h-3 w-3" aria-hidden="true" /> Reply
            </button>
            {x.mine && (
              <button type="button" onClick={() => take(x.id)} disabled={pending} className="inline-flex items-center gap-1 font-semibold text-ink-faint hover:text-red-700 disabled:opacity-60">
                <Trash2 className="h-3 w-3" aria-hidden="true" /> Remove
              </button>
            )}
          </div>
          {box(x.id, `Reply to ${x.author}…`)}
        </div>
        {childrenOf(x.id).length > 0 && (
          <ul className={`${depth + 1 < MAX_INDENT ? "ml-5 border-l-2 border-brand/15 pl-4" : ""}`}>{thread(x.id, depth + 1)}</ul>
        )}
      </li>
    ));

  return (
    <div className="mt-4 border-t border-line pt-4 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <button type="button" onClick={() => startReply("review")} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-semibold text-ink-soft transition hover:border-brand hover:text-brand">
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Reply
        </button>
        {all.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="font-semibold text-brand hover:underline">
            {open ? "Hide" : "View"} {all.length} {all.length === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>
      {box("review", "Write a reply to this review…")}
      {open && all.length > 0 && <ul>{thread(null, 0)}</ul>}
      {open && hiddenCount > 0 && (
        <button type="button" onClick={moreReplies} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft/50 px-3 py-1.5 font-semibold text-brand-ink transition hover:bg-brand-soft">
          {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"} available
        </button>
      )}
      {error && replyingTo === null && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
