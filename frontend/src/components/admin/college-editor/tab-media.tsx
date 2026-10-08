"use client";

import { useRef, useState, useTransition } from "react";
import { uploadHomeImage } from "@/lib/admin-actions";
import type { CollegeGalleryItem, CollegeVideoItem } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { AddButton, Card, EmptyNote, Row, TextInput, inputCls, move } from "@/components/admin/college-editor/shared";

/*
  Gallery: the campus photos and the videos. Photos are uploaded (JPG, PNG, WebP or GIF, up to
  4 MB, at least 800 by 450 px) and each needs a description, which is read out to people who
  cannot see it and used by image search. Videos are a YouTube or Vimeo link.
*/

const MAX_PHOTOS = 40;
const MAX_VIDEOS = 20;

// ── Photos ───────────────────────────────────────────────────────────────────

export function GalleryTab({ record, update }: EditorProps) {
  const photos = record.detail.gallery;
  const set = (list: CollegeGalleryItem[]) => update((r) => ({ ...r, detail: { ...r.detail, gallery: list } }));
  const patch = (i: number, change: Partial<CollegeGalleryItem>) => set(photos.map((p, n) => (n === i ? { ...p, ...change } : p)));
  const fileRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const chosen = [...files].slice(0, MAX_PHOTOS - photos.length);
    setNotes([]);
    startTransition(async () => {
      const added: CollegeGalleryItem[] = [];
      const problems: string[] = [];
      for (const file of chosen) {
        const form = new FormData();
        form.append("kind", "gallery");
        form.append("file", file);
        const result = await uploadHomeImage(form);
        if ("error" in result) problems.push(`${file.name}: ${result.error}`);
        else added.push({ src: result.url, alt: "", name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), highlight: false });
      }
      if (added.length > 0) update((r) => ({ ...r, detail: { ...r.detail, gallery: [...r.detail.gallery, ...added] } }));
      setNotes(problems);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <Card
      title="Photos"
      description="Highlighted photos come first on the Gallery tab and the first one is shown large. Every photo needs a description of what it shows."
      actions={
        <label className={`rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand ${photos.length >= MAX_PHOTOS || pending ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-brand hover:text-white"}`}>
          {pending ? "Uploading…" : "Upload photos"}
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={photos.length >= MAX_PHOTOS || pending} className="sr-only" onChange={(e) => upload(e.target.files)} />
        </label>
      }
    >
      <p className="text-xs text-ink-faint">{photos.length} of {MAX_PHOTOS} · JPG, PNG, WebP or GIF, up to 4 MB, at least 800 × 450 px</p>
      {notes.length > 0 && (
        <ul role="alert" className="space-y-1 text-xs text-red-700">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {photos.length === 0 ? (
        <EmptyNote>No photos. The Gallery tab shows an empty message.</EmptyNote>
      ) : (
        <ul className="space-y-4">
          {photos.map((p, i) => (
            <Row key={p.src} title={p.name || `Photo ${i + 1}`} index={i} count={photos.length} onMove={(d) => set(move(photos, i, d))} onRemove={() => set(photos.filter((_, n) => n !== i))} error={p.alt.trim().length < 3 ? "Describe what the photo shows (at least 3 characters)." : undefined}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[10rem_minmax(0,1fr)]">
                {/* Plain img: uploads come from the API's origin, and a GIF must keep animating. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(p.src)} alt={p.alt} className="aspect-[4/3] w-full rounded-lg border border-line bg-bg-alt object-cover" />
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TextInput id={`ga-${i}-name`} label="Caption" max={120} value={p.name} onChange={(v) => patch(i, { name: v })} hint="Shown on the photo." />
                    <TextInput id={`ga-${i}-alt`} label="Description" required max={200} value={p.alt} onChange={(v) => patch(i, { alt: v })} hint="What it shows, e.g. Students in the central library." />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={p.highlight} onChange={(e) => patch(i, { highlight: e.target.checked })} className="h-4 w-4 accent-[var(--color-brand)]" />
                    Highlight: show first
                  </label>
                </div>
              </div>
            </Row>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Videos ───────────────────────────────────────────────────────────────────

/** Reads a YouTube or Vimeo link into a provider and a video id. Null when it is neither. */
export function parseVideoLink(text: string): { provider: "youtube" | "vimeo"; videoId: string } | null {
  const t = text.trim();
  const yt = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{6,20})/.exec(t);
  if (yt) return { provider: "youtube", videoId: yt[1] };
  const vm = /^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{4,12})/.exec(t);
  if (vm) return { provider: "vimeo", videoId: vm[1] };
  return null;
}

const videoUrl = (v: CollegeVideoItem) => (v.provider === "youtube" ? `https://www.youtube.com/watch?v=${v.videoId}` : `https://vimeo.com/${v.videoId}`);

function VideoRow({ video, index, count, onChange, onRemove }: { video: CollegeVideoItem; index: number; count: number; onChange: (v: CollegeVideoItem) => void; onRemove: () => void }) {
  // The text being typed is kept here; the record only ever holds a link that was understood.
  const [raw, setRaw] = useState(video.videoId ? videoUrl(video) : "");
  const bad = raw.trim() !== "" && parseVideoLink(raw) === null;
  return (
    <Row title={video.title || `Video ${index + 1}`} index={index} count={count} onRemove={onRemove} error={bad ? "That is not a YouTube or Vimeo link." : raw.trim() === "" ? "Paste the video's link." : undefined}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <TextInput id={`vi-${index}-title`} label="Title" required max={120} value={video.title} onChange={(v) => onChange({ ...video, title: v })} />
        <div>
          <label htmlFor={`vi-${index}-link`} className="block text-xs font-semibold text-ink">Video link <span className="text-brand">*</span></label>
          <input
            id={`vi-${index}-link`}
            value={raw}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => {
              setRaw(e.target.value);
              const parsed = parseVideoLink(e.target.value);
              onChange(parsed ? { ...video, ...parsed } : { ...video, videoId: "" });
            }}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-ink-faint">A YouTube or Vimeo link. It plays in the page, nothing is stored here.</p>
        </div>
      </div>
    </Row>
  );
}

export function VideosTab({ record, update }: EditorProps) {
  const videos = record.detail.videos;
  const set = (list: CollegeVideoItem[]) => update((r) => ({ ...r, detail: { ...r.detail, videos: list } }));
  return (
    <Card
      title="Videos"
      description="Shown under the photos on the Gallery tab."
      actions={<AddButton onClick={() => set([...videos, { title: "", provider: "youtube", videoId: "" }])} disabled={videos.length >= MAX_VIDEOS}>Add a video</AddButton>}
    >
      {videos.length === 0 ? (
        <EmptyNote>No videos.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {/* Keyed by position: the link being typed is local to its row, so rows are not reordered. */}
          {videos.map((v, i) => (
            <VideoRow key={i} video={v} index={i} count={videos.length} onChange={(next) => set(videos.map((x, n) => (n === i ? next : x)))} onRemove={() => set(videos.filter((_, n) => n !== i))} />
          ))}
        </ul>
      )}
    </Card>
  );
}
