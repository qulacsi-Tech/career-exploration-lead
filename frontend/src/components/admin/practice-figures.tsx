"use client";

import { useRef, useState, useTransition } from "react";
import { uploadHomeImage } from "@/lib/admin-actions";
import { mediaUrl } from "@/lib/media";

/*
  Figures in practice questions: an image, a GIF or a diagram.

  A figure is one line of the question's text, written as

      ![what it shows](/api/uploads/practice-ab12.png "640x380")

  so it sits where it is typed (above or below the words, as the question needs) and also
  works from a spreadsheet import. These helpers do the typing for the admin: upload a file
  or give a link, describe it for people who cannot see it, and it is added to the text.
  Each figure in the text is shown as a small picture with a Remove button.
*/

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_MB = 4;

const FIGURE_LINE = /^!\[([^\]]*)\]\((\S+?)(?:\s+"(\d+)x(\d+)")?\)$/;

export type Figure = { line: string; alt: string; src: string };

/** The figure lines in a text, in order. */
export function figuresIn(text: string): Figure[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .map((line) => {
      const m = FIGURE_LINE.exec(line);
      return m ? { line, alt: m[1], src: m[2] } : null;
    })
    .filter((f): f is Figure => f !== null);
}

/** The text with one figure line taken out, and the blank line it leaves tidied away. */
export function withoutFigure(text: string, line: string): string {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.trim() === line);
  if (at < 0) return text;
  lines.splice(at, 1);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** The text with a figure added as its own block at the end. */
export function withFigure(text: string, src: string, alt: string, size?: { width: number; height: number }): string {
  const safeAlt = alt.replace(/[[\]]/g, " ").replace(/\s+/g, " ").trim();
  const line = `![${safeAlt}](${src}${size ? ` "${size.width}x${size.height}"` : ""})`;
  return text.trim() ? `${text.trim()}\n\n${line}` : line;
}

function readSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

/** Small pictures of the figures in a text, each with a Remove button. */
export function FigurePreviews({ text, onChange }: { text: string; onChange: (next: string) => void }) {
  const figures = figuresIn(text);
  if (figures.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-3">
      {figures.map((f) => (
        <li key={f.line} className="w-36 rounded-lg border border-line bg-bg-alt p-1.5">
          {/* Plain img: uploads come from the API's origin, and a GIF must keep animating. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(f.src)} alt={f.alt} className="h-20 w-full rounded object-contain" />
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-soft" title={f.alt}>
            {f.alt}
          </p>
          <button type="button" onClick={() => onChange(withoutFigure(text, f.line))} className="mt-1 text-[11px] font-medium text-red-700 hover:underline">
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

/** "Add image" with its small panel: describe it, then upload a file or give a link. */
export function FigureButton({
  onAdd,
  compact,
  label = "Add an image, GIF or diagram",
}: {
  /** Called with the figure's address, its description and its size when known. */
  onAdd: (src: string, alt: string, size?: { width: number; height: number }) => void;
  /** A short button, for an option row. */
  compact?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setAlt("");
    setLink("");
    setNote(null);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setNote(null);
    if (!ACCEPT.split(",").includes(file.type)) return setNote("Use a JPG, PNG, WebP or GIF image.");
    if (file.size > MAX_MB * 1024 * 1024) return setNote(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`);
    try {
      await readSize(file); // refuses a file the browser cannot read as an image
    } catch {
      return setNote("That file could not be read as an image.");
    }
    const form = new FormData();
    form.append("kind", "practice");
    form.append("file", file);
    startTransition(async () => {
      const result = await uploadHomeImage(form);
      if ("error" in result) return setNote(result.error);
      onAdd(result.url, alt, { width: result.width, height: result.height });
      close();
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const addLink = () => {
    const url = link.trim();
    if (!/^https:\/\/\S+$/i.test(url)) return setNote("A link must start with https://");
    onAdd(url, alt);
    close();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg border border-brand font-semibold text-brand hover:bg-brand hover:text-white ${compact ? "shrink-0 px-2.5 py-1.5 text-xs" : "mt-2 px-3 py-1.5 text-xs"}`}
      >
        {compact ? "Image" : label}
      </button>
    );
  }

  const ready = alt.trim().length > 0;
  return (
    <div className="mt-2 w-full max-w-xl space-y-3 rounded-lg border border-brand/40 bg-brand-soft/40 p-3">
      <div>
        <label className="block text-xs font-semibold text-ink">
          Describe the image <span className="text-brand">*</span>
          <input
            value={alt}
            maxLength={300}
            autoFocus
            onChange={(e) => setAlt(e.target.value)}
            placeholder="What it shows, without giving the answer away"
            className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm font-normal text-ink focus:border-brand focus:outline-none"
          />
        </label>
        <p className="mt-1 text-xs text-ink-faint">Read out for candidates who cannot see the image.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${ready && !pending ? "cursor-pointer bg-brand text-white hover:bg-brand-dark" : "cursor-not-allowed bg-bg-alt text-ink-faint"}`}>
          {pending ? "Uploading…" : "Upload a file"}
          <input ref={fileRef} type="file" accept={ACCEPT} disabled={!ready || pending} className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        <span className="text-xs text-ink-faint">JPG, PNG, WebP or GIF, up to {MAX_MB} MB</span>
      </div>

      <div className="flex gap-2">
        <input
          aria-label="Or paste an image link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Or paste a link: https://…"
          className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <button type="button" onClick={addLink} disabled={!ready || !link.trim()} className="shrink-0 rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40">
          Use link
        </button>
      </div>

      {note && (
        <p role="alert" className="text-xs text-red-700">
          {note}
        </p>
      )}
      <button type="button" onClick={close} className="text-xs text-ink-soft underline-offset-2 hover:underline">
        Cancel
      </button>
    </div>
  );
}
