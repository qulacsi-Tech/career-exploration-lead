"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveArticle, savePinnedNews } from "@/lib/admin-actions";
import type { AdminArticle, ArticleInput, LocationPicker } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { CollegeMultiPicker } from "@/components/admin/college-multi-picker";
import { DateField } from "@/components/admin/date-field";
import { ImageUploadField } from "@/components/admin/image-upload-field";

/*
  One article: add or edit, in one dialog.

  The title, the short text shown on the homepage, the full text, the category (chosen from
  the directory's categories), the author, the reading time, the date and whether it is
  published, plus the colleges it is about (chosen from the directory). One Save keeps it all,
  and ticking "Pin to the homepage news" puts it in the news spread (which holds three).

  The page address is made from the title when the article is created and stays the same
  after a rename.
*/

const input = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
export const MAX_PINNED = 3;

const today = () => new Date().toISOString().slice(0, 10);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-08" -> "8 Oct 2026", the form the date picker works in. */
const toText = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "";
};
/** The reverse. */
const toIso = (text: string) => {
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(text.trim());
  const month = m ? MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}` : "";
};

function Text({ id, label, value, onChange, max, hint, required, rows }: { id: string; label: string; value: string; onChange: (v: string) => void; max: number; hint?: string; required?: boolean; rows?: number }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {rows ? (
        <textarea id={id} rows={rows} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      ) : (
        <input id={id} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      )}
      <p className="mt-1 text-xs text-ink-faint">
        {hint ? `${hint} ` : ""}
        {value.length}/{max}
      </p>
    </div>
  );
}

export function ArticleModal({
  article,
  pinned,
  categories,
  picker,
  onClose,
}: {
  /** The article to edit, or null to add one. */
  article: AdminArticle | null;
  /** The slugs pinned to the homepage now, in order. */
  pinned: string[];
  /** Category names from the directory (the Fields list). */
  categories: string[];
  /** The directory's colleges, for "colleges this is about". */
  picker: LocationPicker;
  onClose: (message?: string) => void;
}) {
  const router = useRouter();
  const wasPinned = article ? pinned.includes(article.slug) : false;
  const pinnedFull = pinned.length >= MAX_PINNED;
  const cannotPin = !wasPinned && pinnedFull;

  const [draft, setDraft] = useState<ArticleInput>(() =>
    article
      ? { title: article.title, excerpt: article.excerpt, body: article.body, author: article.author, category: article.category, readMinutes: article.readMinutes, publishedAt: article.publishedAt, isPublished: article.isPublished, relatedCollegeSlugs: article.relatedCollegeSlugs, image: article.image }
      : { title: "", excerpt: "", body: "", author: "Editorial Desk", category: "", readMinutes: 5, publishedAt: today(), isPublished: true, relatedCollegeSlugs: [], image: "" }
  );
  const [pin, setPin] = useState(wasPinned);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const canSave = draft.title.trim().length >= 3 && draft.excerpt.trim().length >= 1 && toText(draft.publishedAt) !== "";
  const categoryOptions = draft.category && !categories.includes(draft.category) ? [draft.category, ...categories] : categories;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const saved = await saveArticle(article ? article.slug : null, draft);
      if ("error" in saved) {
        setError(saved.error);
        return;
      }
      const shouldPin = pin && !cannotPin;
      if (shouldPin !== pinned.includes(saved.slug)) {
        const next = shouldPin ? [...pinned, saved.slug] : pinned.filter((s) => s !== saved.slug);
        const result = await savePinnedNews(next);
        if ("error" in result) {
          router.refresh();
          setError(`${draft.title.trim()} was saved, but the homepage news could not be updated: ${result.error}`);
          return;
        }
      }
      router.refresh();
      onClose(article ? `${draft.title.trim()} saved.` : `${draft.title.trim()} was added.`);
    });
  };

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {!canSave && <span className="text-xs text-amber-800">Enter a title and the short text, and choose a date.</span>}
        <button type="button" onClick={() => onClose()} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">Cancel</button>
        <button type="button" onClick={save} disabled={!canSave || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Saving…" : article ? "Save" : "Add article"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminModal open onClose={() => onClose()} size="full" title={article ? `Edit ${article.title}` : "Add article"} description="The article's text, picture, category, date and the colleges it is about." footer={footer}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Text id="art-title" label="Title" required max={500} value={draft.title} onChange={(v) => set("title", v)} hint={article ? "The page address stays the same after a rename." : "Becomes the page address."} />
          <Text id="art-excerpt" label="Short text" required rows={3} max={600} value={draft.excerpt} onChange={(v) => set("excerpt", v)} hint="Shown on the homepage news and in lists." />
          <Text id="art-body" label="Article" rows={12} max={20000} value={draft.body} onChange={(v) => set("body", v)} hint="The full text. A blank line starts a new paragraph." />
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="font-display text-sm font-semibold text-ink">Picture</h3>
            <div className="mt-4">
              <ImageUploadField kind="article" value={draft.image} onChange={(v) => set("image", v)} fallbackNote="No picture. The article is shown without one." />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="font-display text-sm font-semibold text-ink">Details</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="art-category" className="block text-xs font-semibold text-ink">Category</label>
                <select id="art-category" value={draft.category} onChange={(e) => set("category", e.target.value)} className={input}>
                  <option value="">No category</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <Text id="art-author" label="Author" max={200} value={draft.author} onChange={(v) => set("author", v)} />
              <div>
                <label htmlFor="art-read" className="block text-xs font-semibold text-ink">Reading time (minutes)</label>
                <input id="art-read" type="number" min={1} max={120} value={draft.readMinutes} onChange={(e) => set("readMinutes", Math.max(1, Math.min(120, Math.floor(Number(e.target.value) || 5))))} className={input} />
              </div>
              <DateField id="art-date" label="Published on" value={toText(draft.publishedAt)} onChange={(v) => set("publishedAt", toIso(v) || draft.publishedAt)} />
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-3">
                <input type="checkbox" checked={draft.isPublished} onChange={(e) => set("isPublished", e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
                <span className="text-sm text-ink">
                  Published
                  <span className="mt-0.5 block text-xs text-ink-soft">Unpublished articles are hidden from the site.</span>
                </span>
              </label>
              <label className={`flex items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-3 ${cannotPin ? "opacity-70" : "cursor-pointer"}`}>
                <input type="checkbox" checked={pin && !cannotPin} disabled={cannotPin} onChange={(e) => setPin(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
                <span className="text-sm text-ink">
                  Pin to the homepage news
                  {cannotPin && <span className="mt-0.5 block text-xs text-ink-soft">{MAX_PINNED} articles are pinned already. Unpin one in the table first.</span>}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <fieldset className="mt-5 rounded-xl border border-line bg-surface p-4">
        <legend className="px-2 text-xs font-semibold text-ink">Colleges this article is about</legend>
        <p className="mb-3 text-xs text-ink-faint">Optional. Chosen from the directory.</p>
        <CollegeMultiPicker idPrefix="art-col" colleges={picker.colleges} streams={picker.streams} selected={draft.relatedCollegeSlugs} onChange={(v) => set("relatedCollegeSlugs", v)} max={20} />
      </fieldset>
    </AdminModal>
  );
}
