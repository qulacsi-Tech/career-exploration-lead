"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { loadCollegeNews, removeArticle, setArticlePublished } from "@/lib/admin-actions";
import type { AdminArticle, LocationPicker } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { ArticleModal } from "@/components/admin/article-modal";
import { AddButton, Card, EmptyNote } from "@/components/admin/college-editor/shared";

/*
  The college's own news, in the site's article format: the same dialog as Articles (title, short text, sections
  of text, points, tables and steps, a picture, category, author, date) with the college already chosen as what it
  is about. They are real articles, so they show on this college's News tab and also in the site's news. Each
  change is saved at once, apart from the editor's Save.
*/

type Loaded = { articles: AdminArticle[]; categories: string[]; picker: LocationPicker };

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export function CollegeArticles({ slug }: { slug: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<AdminArticle | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const result = await loadCollegeNews(slug);
    if (result.error !== undefined) return setError(result.error);
    setError(null);
    setData({ articles: result.articles ?? [], categories: result.categories ?? [], picker: result.picker as LocationPicker });
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = (a: AdminArticle) =>
    startTransition(async () => {
      const result = await setArticlePublished(a.slug, !a.isPublished);
      if ("error" in result) return setError(result.error);
      setNote(`${a.title} is ${a.isPublished ? "hidden from" : "shown on"} the site.`);
      await load();
    });

  const remove = (a: AdminArticle) =>
    startTransition(async () => {
      const result = await removeArticle(a.slug, []);
      setConfirming(null);
      if ("error" in result) return setError(result.error);
      setNote(`${a.title} was deleted.`);
      await load();
    });

  return (
    <Card
      title="Articles"
      description="News about this college, written in the same format as the site's articles: text, points, tables and steps, a picture, a category and an author. They show on this college's News tab, and in the site's news."
      actions={<AddButton onClick={() => setModal(null)}>Add an article</AddButton>}
    >
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {note && !error && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{note}</p>}

      {!data && !error ? (
        <EmptyNote>Loading…</EmptyNote>
      ) : data && data.articles.length === 0 ? (
        <EmptyNote>No articles about this college yet. Add one and it shows on the News tab.</EmptyNote>
      ) : (
        data && (
          <ul className="divide-y divide-line-soft rounded-xl border border-line">
            {data.articles.map((a) => (
              <li key={a.slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
                {a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(a.image)} alt="" className="h-12 w-20 shrink-0 rounded-lg border border-line object-cover" />
                ) : (
                  <span aria-hidden className="h-12 w-20 shrink-0 rounded-lg bg-brand-soft" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {[formatDate(a.publishedAt), a.category, a.author].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.isPublished ? "bg-emerald-50 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{a.isPublished ? "Published" : "Draft"}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {a.isPublished && (
                    <Link href={`/articles/${a.slug}`} target="_blank" aria-label={`Open ${a.title} on the site`} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-brand hover:text-brand">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                  <button type="button" onClick={() => setModal(a)} className="rounded-lg border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-brand-soft">Edit</button>
                  <button type="button" onClick={() => publish(a)} disabled={pending} className="rounded-lg border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-brand hover:text-brand disabled:opacity-50">
                    {a.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  {confirming === a.slug ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <button type="button" onClick={() => remove(a)} disabled={pending} className="rounded-lg bg-red-700 px-3 py-1 font-semibold text-white disabled:opacity-50">Delete</button>
                      <button type="button" onClick={() => setConfirming(null)} className="text-ink-soft underline">Keep</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirming(a.slug)} className="rounded-lg border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-red-700 hover:text-red-700">Delete</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {modal !== undefined && data && (
        <ArticleModal
          key={modal ? modal.slug : "new"}
          article={modal}
          pinned={[]}
          categories={data.categories}
          picker={data.picker}
          forCollege={slug}
          onClose={(message) => {
            setModal(undefined);
            if (message) {
              setNote(message);
              void load();
            }
          }}
        />
      )}
    </Card>
  );
}
