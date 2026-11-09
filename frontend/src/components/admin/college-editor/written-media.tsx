"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Play, Trash2 } from "lucide-react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { parseVideoLink } from "@/components/admin/college-editor/tab-media";
import { Card } from "@/components/admin/college-editor/shared";
import type { TabMediaItem } from "@/lib/api";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { mediaUrl } from "@/lib/media";

const MAX = 30;
const field = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

/**
 * Pictures and videos for a written tab (Admissions, Infrastructure, Scholarships): shown under its text, and, when
 * ticked, in the Gallery tab too. Each one is its own saved entry, so it stays put after Save. Saved with the Save button.
 */
export function WrittenMedia({ record, update, tab }: EditorProps & { tab: string }) {
  const items: TabMediaItem[] = record.detail.tabMedia?.[tab] ?? [];
  const set = (list: TabMediaItem[]) =>
    update((r) => {
      const next = { ...(r.detail.tabMedia ?? {}) };
      if (list.length > 0) next[tab] = list;
      else delete next[tab];
      return { ...r, detail: { ...r.detail, tabMedia: next } };
    });
  const patch = (i: number, change: Partial<TabMediaItem>) => set(items.map((m, n) => (n === i ? { ...m, ...change } : m)));
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const list = [...items];
    [list[i], list[j]] = [list[j], list[i]];
    set(list);
  };

  const [adding, setAdding] = useState<"image" | "video" | null>(null);
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [gallery, setGallery] = useState(false);
  const parsed = parseVideoLink(link);
  const reset = () => {
    setAdding(null);
    setSrc("");
    setAlt("");
    setLink("");
    setTitle("");
    setGallery(false);
  };

  const addImage = () => {
    if (!src || alt.trim().length < 3) return;
    set([...items, { kind: "image", src, provider: "", videoId: "", title: alt.trim(), gallery }]);
    reset();
  };
  const addVideo = () => {
    if (!parsed) return;
    set([...items, { kind: "video", src: "", provider: parsed.provider, videoId: parsed.videoId, title: title.trim(), gallery }]);
    reset();
  };

  return (
    <Card
      title="Pictures and videos"
      description="Add pictures, or YouTube and Vimeo videos, to show under this tab's text. Tick “Also show in the Gallery” to put one in the Gallery tab too."
    >
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">Nothing added yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((m, i) => (
            <li key={`${m.src || m.videoId}-${i}`} className="flex flex-wrap items-start gap-4 rounded-xl border border-line bg-bg-alt/40 p-3">
              <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
                {m.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(m.src)} alt={m.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-ink/80 text-white">
                    <Play className="h-7 w-7" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <label className="block text-xs font-semibold text-ink">
                  {m.kind === "image" ? "What the picture shows" : "Video title (optional)"}
                  <input value={m.title} maxLength={200} onChange={(e) => patch(i, { title: e.target.value })} className={field} />
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={m.gallery} onChange={(e) => patch(i, { gallery: e.target.checked })} className="h-4 w-4 accent-[var(--color-brand)]" />
                  Also show in the Gallery
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-md border border-line p-1.5 text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" className="rounded-md border border-line p-1.5 text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => set(items.filter((_, n) => n !== i))} aria-label="Remove" className="rounded-md border border-line p-1.5 text-ink-soft transition hover:border-red-300 hover:text-red-700">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding === null ? (
        items.length < MAX && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAdding("image")} className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft">Add a picture</button>
            <button type="button" onClick={() => setAdding("video")} className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft">Add a video</button>
          </div>
        )
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
          {adding === "image" ? (
            <>
              <ImageUploadField kind="gallery" value={src} onChange={setSrc} fallbackNote="Choose a picture to add." />
              <label className="block text-xs font-semibold text-ink">
                What the picture shows <span className="font-normal text-ink-faint">(at least 3 characters; read aloud and used by image search)</span>
                <input value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} className={field} />
              </label>
            </>
          ) : (
            <>
              <label className="block text-xs font-semibold text-ink">
                YouTube or Vimeo link
                <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={field} />
                {link.trim() !== "" && !parsed && <span className="mt-1 block font-normal text-red-700">That is not a YouTube or Vimeo link.</span>}
              </label>
              <label className="block text-xs font-semibold text-ink">
                Title <span className="font-normal text-ink-faint">(optional)</span>
                <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={field} />
              </label>
            </>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={gallery} onChange={(e) => setGallery(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
            Also show it in the Gallery tab
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={adding === "image" ? addImage : addVideo} disabled={adding === "image" ? !src || alt.trim().length < 3 : !parsed} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
              Add {adding === "image" ? "picture" : "video"}
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">Cancel</button>
          </div>
        </div>
      )}
    </Card>
  );
}
