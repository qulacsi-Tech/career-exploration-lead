"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, HelpCircle, ImagePlus, Lightbulb, Lock, Megaphone, MessageCircle, MessagesSquare, Send, Trash2, X } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import {
  createPost,
  joinCommunity,
  loadCommunityPosts,
  reactToPost,
  removeOwnPost,
  removeOwnReply,
  replyToPost,
  uploadPostImage,
} from "@/lib/community-actions";
import { POST_KINDS, REACTIONS, type CommunityPost, type CommunityPostsPage, type CommunityViewer, type PostKind, type Reaction } from "@/lib/community-api";

const KIND: Record<PostKind, { label: string; icon: typeof MessagesSquare; tone: string; prompt: string }> = {
  discussion: { label: "Discussion", icon: MessagesSquare, tone: "bg-brand-soft text-brand-ink", prompt: "Start a conversation…" },
  question: { label: "Question", icon: HelpCircle, tone: "bg-sky-50 text-sky-800", prompt: "What would you like to ask?" },
  suggestion: { label: "Suggestion", icon: Lightbulb, tone: "bg-amber-50 text-amber-800", prompt: "Share a tip, a resource or an idea…" },
  banner: { label: "Banner", icon: Megaphone, tone: "bg-violet-50 text-violet-800", prompt: "Say what the banner is about…" },
  achievement: { label: "Achievement", icon: Award, tone: "bg-emerald-50 text-emerald-800", prompt: "Tell everyone what you achieved…" },
};

const REACTION: Record<Reaction, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  celebrate: { emoji: "🎉", label: "Celebrate" },
  insightful: { emoji: "💡", label: "Insightful" },
};

function ago(iso: string | null): string {
  if (!iso) return "";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [60, "min"],
    [60, "h"],
    [24, "d"],
    [7, "w"],
  ];
  let value = seconds / 60;
  let unit = "min";
  for (let i = 1; i < units.length && value >= units[i][0]; i++) {
    value /= units[i][0];
    unit = units[i][1];
  }
  if (unit === "w" && value >= 5) return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${Math.floor(value)}${unit === "min" ? " min" : unit} ago`;
}

function Avatar({ name, src }: { name: string; src: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-full border border-line object-cover" />;
  }
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
      {initials}
    </span>
  );
}

/**
 * The community's feed: join or leave, write a post, filter by kind, react, reply. What a person may do comes from
 * the API (`viewer`); the page only hides what would be refused. Signed out, any action goes to sign in.
 */
export function CommunityFeed({
  communityId,
  examName,
  viewer,
  initial,
  loginHref,
  layout = "page",
}: {
  communityId: string;
  examName: string;
  viewer: CommunityViewer;
  initial: CommunityPostsPage;
  loginHref: string;
  /** "tab": inside the exam page's tab column, which already has the exam's own sidebar, so one column here. */
  layout?: "page" | "tab";
}) {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPost[]>(initial.items);
  const [page, setPage] = useState({ total: initial.total, hasMore: initial.hasMore, locked: initial.locked });
  const [kind, setKind] = useState<PostKind | null>(null);
  const [member, setMember] = useState(viewer.member);
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const canAct = viewer.signedIn && !viewer.blocked && !viewer.adminAccount;

  const failed = (result: { ok: false; message: string; needsSignIn?: boolean }) => {
    if (result.needsSignIn) router.push(loginHref);
    else setNotice(result.message);
  };

  const reload = (nextKind: PostKind | null) =>
    start(async () => {
      const result = await loadCommunityPosts(communityId, 0, nextKind);
      if (!result.ok) return failed(result);
      setPosts(result.page.items);
      setPage({ total: result.page.total, hasMore: result.page.hasMore, locked: result.page.locked });
    });

  const more = () =>
    start(async () => {
      const result = await loadCommunityPosts(communityId, posts.length, kind);
      if (!result.ok) return failed(result);
      setPosts((old) => [...old, ...result.page.items.filter((p) => !old.some((o) => o.id === p.id))]);
      setPage({ total: result.page.total, hasMore: result.page.hasMore, locked: result.page.locked });
    });

  const toggleJoin = () => {
    if (!viewer.signedIn) return router.push(loginHref);
    start(async () => {
      const result = await joinCommunity(communityId, !member);
      if (!result.ok) return failed(result);
      setMember(!member);
      router.refresh();
    });
  };

  const update = (id: string, change: (p: CommunityPost) => CommunityPost | null) =>
    setPosts((old) =>
      old.flatMap((p) => {
        if (p.id !== id) return [p];
        const next = change(p);
        return next ? [next] : [];
      }),
    );

  return (
    <div className={layout === "tab" ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]"}>
      <div className="min-w-0 space-y-4">
        {notice && (
          <p role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {notice}
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss" className="shrink-0">
              <X className="h-4 w-4" />
            </button>
          </p>
        )}

        {canAct && member ? (
          <Composer
            communityId={communityId}
            onPosted={() => {
              setKind(null);
              reload(null);
              router.refresh();
            }}
            onError={failed}
          />
        ) : (
          <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-ink-soft">
              {!viewer.signedIn
                ? `Sign in and join to post in the ${examName} community.`
                : viewer.adminAccount
                  ? "Admin accounts read here and moderate from the admin."
                  : viewer.blocked
                    ? "You can read this community, but not post in it."
                    : `Join the ${examName} community to post. You can reply and react without joining.`}
            </p>
            {!viewer.blocked && !viewer.adminAccount && (
              <button type="button" onClick={toggleJoin} disabled={pending} className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60">
                {viewer.signedIn ? "Join community" : "Sign in to join"}
              </button>
            )}
          </div>
        )}

        <div role="tablist" aria-label="Show posts of a kind" className="flex flex-wrap gap-2">
          {[null, ...POST_KINDS].map((k) => (
            <button
              key={k ?? "all"}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => {
                setKind(k);
                reload(k);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${kind === k ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"}`}
            >
              {k ? KIND[k].label : "All"}
            </button>
          ))}
        </div>

        {posts.length === 0 && !pending && (
          <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-6 py-12 text-center text-sm text-ink-soft">
            {kind ? `No ${KIND[kind].label.toLowerCase()} posts yet.` : "No posts yet. Be the first to say hello!"}
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            canAct={canAct}
            signedIn={viewer.signedIn}
            locked={page.locked}
            loginHref={loginHref}
            onChange={(next) => update(post.id, () => next)}
            onRemoved={() => {
              update(post.id, () => null);
              setPage((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
            }}
            onError={failed}
          />
        ))}

        {page.locked && (
          <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
            <div aria-hidden="true" className="space-y-3 p-5 blur-[3px] select-none">
              <div className="h-4 w-1/3 rounded bg-bg-alt" />
              <div className="h-3 w-full rounded bg-bg-alt" />
              <div className="h-3 w-5/6 rounded bg-bg-alt" />
              <div className="h-3 w-2/3 rounded bg-bg-alt" />
            </div>
            <div className="absolute inset-0 grid place-items-center bg-surface/70 p-4 text-center">
              <div>
                <Lock className="mx-auto h-6 w-6 text-brand" aria-hidden="true" />
                <p className="mt-2 font-display text-lg font-bold text-ink">
                  {page.total - posts.length} more {page.total - posts.length === 1 ? "post" : "posts"} in this community
                </p>
                <p className="mt-1 text-sm text-ink-soft">Sign in to read everything, reply and react.</p>
                <Link href={loginHref} className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">
                  Sign in to see more
                </Link>
              </div>
            </div>
          </div>
        )}

        {page.hasMore && (
          <button type="button" onClick={more} disabled={pending} className="w-full rounded-xl border border-line bg-surface py-2.5 text-sm font-semibold text-brand transition hover:border-brand disabled:opacity-60">
            {pending ? "Loading…" : "Show more posts"}
          </button>
        )}
      </div>

      <aside className={layout === "tab" ? "grid gap-4 sm:grid-cols-2" : "space-y-4 lg:sticky lg:top-24 lg:self-start"}>
        {member && canAct && (
          <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
            <p className="font-semibold text-ink">You are a member</p>
            <button type="button" onClick={toggleJoin} disabled={pending} className="mt-2 text-sm font-medium text-ink-soft underline-offset-4 hover:text-brand hover:underline">
              Leave community
            </button>
          </div>
        )}
        <div className="rounded-2xl bg-brand-soft p-4 text-sm text-brand-ink">
          <p className="font-display text-base font-bold">Community rules</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Be kind and help each other.</li>
            <li>No spam, ads or personal contact details.</li>
            <li>Share only what you have the right to share.</li>
          </ul>
          <p className="mt-2 text-xs text-brand-ink/80">The team may hide posts or restrict accounts that break these.</p>
        </div>
      </aside>
    </div>
  );
}

function Composer({ communityId, onPosted, onError }: { communityId: string; onPosted: () => void; onError: (r: { ok: false; message: string; needsSignIn?: boolean }) => void }) {
  const [kind, setKind] = useState<PostKind>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  const upload = async (picked: File | undefined) => {
    if (!picked) return;
    setError("");
    setUploading(true);
    const form = new FormData();
    form.set("file", picked);
    const result = await uploadPostImage(form);
    setUploading(false);
    if (file.current) file.current.value = "";
    if (!result.ok) return result.needsSignIn ? onError(result) : setError(result.message);
    setImage(result.url);
  };

  const submit = () =>
    start(async () => {
      setError("");
      if (body.trim().length < 5) return setError("Write at least 5 characters.");
      if (kind === "banner" && !image) return setError("A banner needs a picture.");
      const result = await createPost(communityId, { kind, title: title.trim(), body, image });
      if (!result.ok) return result.needsSignIn ? onError(result) : setError(result.message);
      setTitle("");
      setBody("");
      setImage("");
      setKind("discussion");
      onPosted();
    });

  return (
    <form
      className="rounded-2xl border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind of post">
        {POST_KINDS.map((k) => {
          const Icon = KIND[k].icon;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${kind === k ? KIND[k].tone + " ring-2 ring-brand/40" : "bg-bg-alt text-ink-soft hover:text-ink"}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {KIND[k].label}
            </button>
          );
        })}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="Title (optional)"
        aria-label="Title"
        className="mt-3 w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={4000}
        rows={3}
        placeholder={KIND[kind].prompt}
        aria-label="Post"
        className="mt-2 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />
      {image && (
        <div className="relative mt-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(image)} alt="" className="max-h-48 rounded-xl border border-line" />
          <button type="button" onClick={() => setImage("")} aria-label="Remove picture" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-bg-alt hover:text-brand">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {uploading ? "Uploading…" : image ? "Change picture" : kind === "banner" ? "Add banner picture" : "Add picture"}
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        <button type="submit" disabled={pending || uploading} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60">
          <Send className="h-4 w-4" aria-hidden="true" />
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}

function PostCard({
  post,
  canAct,
  signedIn,
  locked,
  loginHref,
  onChange,
  onRemoved,
  onError,
}: {
  post: CommunityPost;
  canAct: boolean;
  signedIn: boolean;
  locked: boolean;
  loginHref: string;
  onChange: (p: CommunityPost) => void;
  onRemoved: () => void;
  onError: (r: { ok: false; message: string; needsSignIn?: boolean }) => void;
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const meta = KIND[post.kind] ?? KIND.discussion;
  const Icon = meta.icon;
  const hiddenReplies = post.replyCount - post.replies.length;

  const react = (r: Reaction) => {
    if (!signedIn) return router.push(loginHref);
    const next = post.myReaction === r ? null : r;
    start(async () => {
      const result = await reactToPost(post.id, next);
      if (!result.ok) return onError(result);
      onChange({ ...post, reactions: result.reactions, myReaction: result.myReaction });
    });
  };

  const sendReply = () =>
    start(async () => {
      if (reply.trim().length < 2) return;
      const result = await replyToPost(post.id, reply);
      if (!result.ok) return onError(result);
      setReply("");
      onChange({ ...post, replies: [...post.replies, result.reply], replyCount: post.replyCount + 1 });
    });

  const deletePost = () => {
    if (!window.confirm("Delete this post and its replies?")) return;
    start(async () => {
      const result = await removeOwnPost(post.id);
      if (!result.ok) return onError(result);
      onRemoved();
    });
  };

  const deleteReply = (id: string) => {
    if (!window.confirm("Delete your reply?")) return;
    start(async () => {
      const result = await removeOwnReply(id);
      if (!result.ok) return onError(result);
      onChange({ ...post, replies: post.replies.filter((r) => r.id !== id), replyCount: Math.max(0, post.replyCount - 1) });
    });
  };

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <Avatar name={post.author} src={post.authorAvatar} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{post.author}</p>
          <p className="text-xs text-ink-faint">{ago(post.createdAt)}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.tone}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {meta.label}
        </span>
        {post.mine && (
          <button type="button" onClick={deletePost} disabled={pending} aria-label="Delete your post" className="shrink-0 rounded-lg p-1 text-ink-faint transition hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      {post.title && <h2 className="mt-3 font-display text-lg font-bold text-ink">{post.title}</h2>}
      <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink">{post.body}</p>
      {post.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(post.image)} alt={post.title || `${meta.label} picture`} loading="lazy" className="mt-3 max-h-[28rem] w-full rounded-xl border border-line object-contain bg-bg-alt" />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {REACTIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => react(r)}
            disabled={pending || (signedIn && !canAct)}
            aria-pressed={post.myReaction === r}
            aria-label={`${REACTION[r].label} (${post.reactions[r]})`}
            title={REACTION[r].label}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition disabled:cursor-not-allowed ${post.myReaction === r ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line text-ink-soft hover:border-brand/50"}`}
          >
            <span aria-hidden="true">{REACTION[r].emoji}</span>
            {post.reactions[r] > 0 && <span>{post.reactions[r]}</span>}
          </button>
        ))}
        <button type="button" onClick={() => setOpen((o) => !o)} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-ink-soft transition hover:text-brand">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {post.replyCount > 0 ? `${post.replyCount} ${post.replyCount === 1 ? "reply" : "replies"}` : "Reply"}
        </button>
      </div>

      {(open || post.replies.length > 0) && (
        <div className="mt-3 space-y-3 border-t border-line-soft pt-3">
          {post.replies.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              <Avatar name={r.author} src={r.authorAvatar} />
              <div className="min-w-0 flex-1 rounded-xl bg-bg-alt px-3 py-2">
                <p className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-ink">{r.author}</span>
                  <span className="text-ink-faint">{ago(r.createdAt)}</span>
                  {r.mine && (
                    <button type="button" onClick={() => deleteReply(r.id)} aria-label="Delete your reply" className="ml-auto text-ink-faint hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm text-ink">{r.body}</p>
              </div>
            </div>
          ))}
          {hiddenReplies > 0 && locked && (
            <Link href={loginHref} className="block text-sm font-semibold text-brand hover:underline">
              Sign in to read {hiddenReplies} more {hiddenReplies === 1 ? "reply" : "replies"}
            </Link>
          )}
          {canAct ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendReply();
              }}
            >
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                maxLength={2000}
                placeholder="Write a reply…"
                aria-label="Write a reply"
                className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
              />
              <button type="submit" disabled={pending || reply.trim().length < 2} aria-label="Send reply" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </form>
          ) : (
            !signedIn && (
              <Link href={loginHref} className="block text-sm font-semibold text-brand hover:underline">
                Sign in to reply
              </Link>
            )
          )}
        </div>
      )}
    </article>
  );
}
