"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ImageOff, Trash2 } from "lucide-react";
import { mediaUrl } from "@/lib/media";

/*
  How a picture and a video look inside the editor. Each is drawn as it will look on the page; click one to select it
  and the editing bar opens under it (its description or title, the Gallery tick, and Remove). The stored document
  keeps the picture's path, not the full address drawn here.
*/

function Bar({ children }: { children: React.ReactNode }) {
  return <div contentEditable={false} className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-brand/30 bg-brand-soft/40 px-3 py-2 text-xs">{children}</div>;
}

function GalleryTick({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-brand-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--color-brand)]" />
      Also show in Gallery
    </label>
  );
}

export function ImageView({ node, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const [failed, setFailed] = useState(false);
  const src = String(node.attrs.src ?? "");
  const full = mediaUrl(src);

  return (
    <NodeViewWrapper className="my-3" data-drag-handle>
      <div contentEditable={false} className={`overflow-hidden rounded-lg border bg-bg-alt ${selected ? "border-brand ring-2 ring-brand/30" : "border-line"}`}>
        {failed ? (
          <div className="flex items-center gap-3 px-4 py-6 text-sm text-ink-soft">
            <ImageOff className="h-5 w-5 shrink-0 text-ink-faint" aria-hidden="true" />
            <span className="min-w-0">
              The picture could not be loaded.
              <span className="block truncate text-xs text-ink-faint">{full}</span>
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={full} alt={String(node.attrs.alt ?? "")} onError={() => setFailed(true)} onLoad={() => setFailed(false)} className="mx-auto block max-h-[22rem] w-auto max-w-full object-contain" />
        )}
      </div>
      {selected && (
        <Bar>
          <label className="flex min-w-[12rem] flex-1 items-center gap-2 font-semibold text-ink">
            Describes
            <input
              value={String(node.attrs.alt ?? "")}
              onChange={(e) => updateAttributes({ alt: e.target.value })}
              maxLength={200}
              className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-normal text-ink focus:border-brand focus:outline-none"
            />
          </label>
          <GalleryTick checked={!!node.attrs.gallery} onChange={(gallery) => updateAttributes({ gallery })} />
          <button type="button" onClick={() => deleteNode()} className="inline-flex items-center gap-1 font-semibold text-red-700 hover:underline">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
          </button>
        </Bar>
      )}
    </NodeViewWrapper>
  );
}

const embed = (provider: string, id: string) => (provider === "vimeo" ? `https://player.vimeo.com/video/${id}` : `https://www.youtube-nocookie.com/embed/${id}`);

export function VideoView({ node, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const { provider, videoId, title } = node.attrs as { provider: string; videoId: string; title: string };

  return (
    <NodeViewWrapper className="my-3" data-drag-handle>
      <div contentEditable={false} className={`relative aspect-video overflow-hidden rounded-lg border bg-bg-alt ${selected ? "border-brand ring-2 ring-brand/30" : "border-line"}`}>
        <iframe src={embed(provider, videoId)} title={title || "Video"} loading="lazy" className="absolute inset-0 h-full w-full border-0" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        {/* Clicking selects the block; the player itself works on the public page. */}
        {!selected && <span className="absolute inset-0" aria-hidden="true" />}
      </div>
      {selected && (
        <Bar>
          <label className="flex min-w-[12rem] flex-1 items-center gap-2 font-semibold text-ink">
            Title
            <input
              value={title}
              onChange={(e) => updateAttributes({ title: e.target.value })}
              maxLength={120}
              className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-normal text-ink focus:border-brand focus:outline-none"
            />
          </label>
          <GalleryTick checked={!!node.attrs.gallery} onChange={(gallery) => updateAttributes({ gallery })} />
          <button type="button" onClick={() => deleteNode()} className="inline-flex items-center gap-1 font-semibold text-red-700 hover:underline">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
          </button>
        </Bar>
      )}
    </NodeViewWrapper>
  );
}
