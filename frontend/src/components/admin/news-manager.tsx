"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeArticle, savePinnedNews, setArticlePublished } from "@/lib/admin-actions";
import type { AdminArticle, AdminNews, LocationPicker } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { AdminSection } from "@/components/admin/admin-section";
import { ArticleModal, MAX_PINNED } from "@/components/admin/article-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  The homepage news: every article in a table, and which of them the news spread shows.

  The spread holds three. Tick articles to pin them (in the order ticked, with Up and Down),
  or pin none and it shows the three most recent published articles. Each row can be
  published or set back to draft, edited or deleted; every click saves at once. Add article
  and Edit open the same dialog.
*/

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function NewsManager({ news, categories, picker }: { news: AdminNews; categories: string[]; picker: LocationPicker }) {
  const router = useRouter();
  const [articles, setArticles] = useState<AdminArticle[]>(news.articles);
  const [pinned, setPinned] = useState<string[]>(news.pinned);
  const [seen, setSeen] = useState(news);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<AdminArticle | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  if (news !== seen) {
    setSeen(news);
    setArticles(news.articles);
    setPinned(news.pinned);
  }

  const q = query.trim().toLowerCase();
  const shown = (q ? articles.filter((a) => `${a.title} ${a.category}`.toLowerCase().includes(q)) : articles).slice().sort((a, b) => {
    // Pinned first, in their order; the rest newest first (the server's order).
    const pa = pinned.indexOf(a.slug);
    const pb = pinned.indexOf(b.slug);
    if (pa >= 0 || pb >= 0) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
    return 0;
  });
  const pinnedFull = pinned.length >= MAX_PINNED;

  const run = (apply: () => void, undo: () => void, call: () => Promise<{ error: string } | { ok: true }>, success: string) => {
    apply();
    clearFlash();
    startTransition(async () => {
      const result = await call();
      if ("error" in result) {
        undo();
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        showFlash("ok", success);
        router.refresh();
      }
    });
  };

  const changePinned = (next: string[], success: string) => {
    const previous = pinned;
    run(() => setPinned(next), () => setPinned(previous), () => savePinnedNews(next), success);
  };

  const togglePublished = (a: AdminArticle) => {
    const previous = articles;
    const published = !a.isPublished;
    run(
      () => setArticles(articles.map((x) => (x.slug === a.slug ? { ...x, isPublished: published } : x))),
      () => setArticles(previous),
      () => setArticlePublished(a.slug, published),
      published ? `${a.title} is now published.` : `${a.title} is now a draft and hidden from the site.`
    );
  };

  const remove = (a: AdminArticle) => {
    setConfirming(null);
    const previous = { articles, pinned };
    run(
      () => {
        setArticles(articles.filter((x) => x.slug !== a.slug));
        setPinned(pinned.filter((s) => s !== a.slug));
      },
      () => {
        setArticles(previous.articles);
        setPinned(previous.pinned);
      },
      () => removeArticle(a.slug, pinned),
      `${a.title} was deleted.`
    );
  };

  return (
    <AdminSection
      title="Manage articles"
      description={`Every article, and which ${MAX_PINNED} the homepage news shows. With none pinned, it shows the ${MAX_PINNED} most recent published articles.`}
      actions={
        <button type="button" onClick={() => setModal(null)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Add article
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">
            {pinned.length === 0 ? "None pinned: the homepage shows the most recent" : `${pinned.length} of ${MAX_PINNED} pinned to the homepage`}
          </p>
          <label className="sr-only" htmlFor="news-search">Search articles</label>
          <input id="news-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or category" className="w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" />
        </div>
        <StatusMessage flash={flash} />

        {articles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No articles yet. Click Add article to write the first one.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-alt text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="px-3 py-2.5 font-semibold">Pinned</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Article</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Category</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Date</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => {
                  const position = pinned.indexOf(a.slug);
                  const on = position >= 0;
                  return (
                    <tr key={a.slug} className={`border-b border-line-soft last:border-b-0 ${a.isPublished ? "" : "bg-bg-alt/60 text-ink-soft"}`}>
                      <td className="px-3 py-3">
                        <label className={`flex items-center gap-2 ${!on && pinnedFull ? "cursor-not-allowed" : "cursor-pointer"}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={pending || (!on && pinnedFull)}
                            onChange={(e) => changePinned(e.target.checked ? [...pinned, a.slug] : pinned.filter((s) => s !== a.slug), e.target.checked ? `${a.title} is pinned to the homepage.` : `${a.title} was unpinned.`)}
                            aria-label={`Pin ${a.title} to the homepage news`}
                            className="h-4 w-4 accent-[var(--color-brand)]"
                          />
                          {on && <span className="text-xs font-semibold text-ink-soft">#{position + 1}</span>}
                        </label>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-bg-alt">
                            {a.image && (
                              // Plain img: uploads come from the API's origin, not the optimizer's allow-list.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={mediaUrl(a.image)} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium text-ink">{a.title}</span>
                            <span className="line-clamp-1 block max-w-md text-xs text-ink-faint">{a.excerpt}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">{a.category || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(a.publishedAt)}</td>
                      <td className="px-3 py-3">
                        <button type="button" role="switch" aria-checked={a.isPublished} aria-label={`${a.title} is ${a.isPublished ? "published" : "a draft"}. Click to switch.`} disabled={pending} onClick={() => togglePublished(a)} className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${a.isPublished ? "bg-green-50 text-green-800 hover:bg-green-100" : "bg-bg-alt text-ink-soft hover:bg-line-soft"}`}>
                          {a.isPublished ? "Published" : "Draft"}
                        </button>
                        {on && !a.isPublished && <p className="mt-1 text-[11px] text-amber-800">Pinned, but hidden</p>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {on && (
                            <>
                              <button type="button" aria-label={`Move ${a.title} up`} disabled={position === 0 || pending} onClick={() => changePinned(move(pinned, position, -1), `Moved ${a.title} up. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
                              <button type="button" aria-label={`Move ${a.title} down`} disabled={position === pinned.length - 1 || pending} onClick={() => changePinned(move(pinned, position, 1), `Moved ${a.title} down. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
                            </>
                          )}
                          <button type="button" onClick={() => setModal(a)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">Edit</button>
                          {confirming === a.slug ? (
                            <>
                              <button type="button" disabled={pending} onClick={() => remove(a)} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Yes, delete</button>
                              <button type="button" onClick={() => setConfirming(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-brand">Keep</button>
                            </>
                          ) : (
                            <button type="button" disabled={pending} onClick={() => setConfirming(a.slug)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700 disabled:opacity-40">Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-ink-soft">No article matches &ldquo;{query}&rdquo;.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== undefined && (
        <ArticleModal
          key={modal ? modal.slug : "new"}
          article={modal}
          pinned={pinned}
          categories={categories}
          picker={picker}
          onClose={(message) => {
            setModal(undefined);
            if (message) showFlash("ok", message);
          }}
        />
      )}
    </AdminSection>
  );
}
