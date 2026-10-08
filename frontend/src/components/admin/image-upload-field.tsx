"use client";

import { useRef, useState, useTransition } from "react";
import { uploadHomeImage } from "@/lib/admin-actions";
import { mediaUrl } from "@/lib/media";

/*
  One image slot on the homepage.

  The numbers below are what the public page actually draws, not guesses: the
  hero fills the full width of the section at about 500 px tall, and the promo
  banner picture fills the right half of the banner, about 600 by 200 px. Both
  are drawn with object-fit: cover, so a picture of the wrong proportions is
  cropped rather than stretched.

  The size check runs here first so a wrong file is turned away before it is
  uploaded. The API repeats the check, because this one can be bypassed.
*/

type Slot = {
  kind: "hero" | "banner" | "location" | "college" | "exam" | "program" | "article" | "logo" | "gallery";
  label: string;
  recommended: [number, number];
  minimum: [number, number];
  previewClass: string;
  notes: string[];
};

const MAX_MB = 4;

const SLOTS: Record<Slot["kind"], Slot> = {
  hero: {
    kind: "hero",
    label: "Background image",
    recommended: [1920, 640],
    minimum: [1600, 500],
    previewClass: "aspect-[3/1]",
    notes: [
      "The headline and search box sit in the centre, with a dark overlay so the white text stays readable. Keep the middle of the picture simple.",
      "Do not put text or logos in the picture. It would sit under the headline and be cropped on phones.",
      "On phones the left and right edges are trimmed, so keep the subject away from the sides.",
    ],
  },
  location: {
    kind: "location",
    label: "College photo",
    recommended: [1200, 1000],
    minimum: [800, 660],
    previewClass: "aspect-[6/5]",
    notes: [
      "The photo fills the left half of the card, about 640 by 540 px, with rounded corners. The institutions count sits in a chip at the bottom left, so keep that corner simple.",
      "Do not put text or logos in the picture. They would be cropped.",
      "On phones the photo becomes a wide strip at the top of the card, so keep the subject in the middle.",
    ],
  },
  college: {
    kind: "college",
    label: "College photo",
    recommended: [1200, 800],
    minimum: [800, 520],
    previewClass: "aspect-[3/2]",
    notes: [
      "The photo fills the top of the card, about 380 by 230 px. When someone points at the card it grows to fill the whole card behind the text, so keep the subject in the middle.",
      "Do not put text or logos in the picture. They would be cropped and sit under the card's own text.",
      "It is also the wide banner at the top of the college's own page, where it is cropped to the middle, so keep the subject centred.",
    ],
  },
  exam: {
    kind: "exam",
    label: "Exam photo",
    recommended: [1200, 800],
    minimum: [800, 520],
    previewClass: "aspect-[3/2]",
    notes: [
      "The photo fills the top of the card, about 380 by 230 px. When someone points at the card it grows to fill the whole card behind the text, so keep the subject in the middle.",
      "Do not put text or logos in the picture. They would be cropped and sit under the card's own text.",
    ],
  },
  logo: {
    kind: "logo",
    label: "Logo",
    recommended: [400, 400],
    minimum: [120, 120],
    previewClass: "aspect-square max-w-[160px]",
    notes: [
      "Shown in a small square tile on the college page, over the banner. A square picture with some space around the mark works best.",
      "Without a logo the tile shows the college's initials.",
    ],
  },
  gallery: {
    kind: "gallery",
    label: "Gallery photo",
    recommended: [1600, 1000],
    minimum: [800, 450],
    previewClass: "aspect-[16/10]",
    notes: ["Shown on the college's Gallery tab, the first one large. Describe what it shows in the description box: it is read aloud and used by image search."],
  },
  article: {
    kind: "article",
    label: "Article picture",
    recommended: [1600, 800],
    minimum: [800, 400],
    previewClass: "aspect-[2/1]",
    notes: [
      "The picture runs wide above the lead story on the homepage news, about 800 by 400 px, in muted tones, and across the top of the article's own page. It is cropped to fit, so keep the subject in the middle.",
      "Do not put text or logos in the picture. They would be cropped.",
    ],
  },
  program: {
    kind: "program",
    label: "Programme photo",
    recommended: [1200, 800],
    minimum: [800, 520],
    previewClass: "aspect-[3/2]",
    notes: [
      "The photo fills the picture side of the programme card on the homepage Recommended row, about 560 by 420 px, and is cropped to fit. Keep the subject in the middle.",
      "Do not put text or logos in the picture. They would be cropped and sit under the card's own text.",
    ],
  },
  banner: {
    kind: "banner",
    label: "Banner picture",
    recommended: [1200, 400],
    minimum: [800, 270],
    previewClass: "aspect-[3/1]",
    notes: [
      "The picture fills the right half of the banner and fades into the brand colour on its left edge. Put the subject on the right.",
      "It is hidden on phones and small tablets, where the banner shows text only.",
    ],
  },
};


const ACCEPT = "image/jpeg,image/png,image/webp";

type Note = { kind: "ok" | "warn" | "error"; text: string };

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

export function ImageUploadField({
  kind,
  value,
  onChange,
  fallbackNote,
}: {
  kind: Slot["kind"];
  /** The stored path, or empty for the built-in picture. */
  value: string;
  onChange: (path: string) => void;
  /** What shows on the site while this is empty. */
  fallbackNote: string;
}) {
  const slot = SLOTS[kind];
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [pending, startTransition] = useTransition();
  const [recW, recH] = slot.recommended;
  const [minW, minH] = slot.minimum;

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setNote(null);

    if (!ACCEPT.split(",").includes(file.type)) {
      setNote({ kind: "error", text: "Use a JPG, PNG or WebP image." });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setNote({
        kind: "error",
        text: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB. Compress it (squoosh.app works well) and try again.`,
      });
      return;
    }

    let size: { width: number; height: number };
    try {
      size = await readSize(file);
    } catch {
      setNote({ kind: "error", text: "That file could not be read as an image." });
      return;
    }
    if (size.width < minW || size.height < minH) {
      setNote({
        kind: "error",
        text: `That image is ${size.width} × ${size.height} px, which is too small and would look blurry. The minimum is ${minW} × ${minH} px; ${recW} × ${recH} px is ideal.`,
      });
      return;
    }

    const ratioOff = Math.abs(size.width / size.height / (recW / recH) - 1);
    const warn =
      ratioOff > 0.25
        ? `The shape differs from the ideal ${recW} × ${recH} px, so the picture will be cropped to fit. Check the preview after saving.`
        : null;

    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    startTransition(async () => {
      const result = await uploadHomeImage(form);
      if ("error" in result) {
        setNote({ kind: "error", text: result.error });
        return;
      }
      onChange(result.url);
      setNote({
        kind: warn ? "warn" : "ok",
        text: `Uploaded (${result.width} × ${result.height} px). ${warn ? warn + " " : ""}It goes live when you click Save.`,
      });
    });
  };

  const tone = {
    ok: "border-line bg-bg-alt text-ink-soft",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <p className="text-xs font-semibold text-ink">{slot.label}</p>

      <div className="rounded-lg border border-line bg-bg-alt px-4 py-3 text-xs text-ink-soft">
        <p className="font-semibold text-ink">
          Ideal size {recW} × {recH} px · at least {minW} × {minH} px · JPG, PNG or WebP · up to {MAX_MB} MB
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {slot.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={`relative w-full max-w-md overflow-hidden rounded-lg border border-line bg-bg-alt ${slot.previewClass}`}
        >
          {value ? (
            // Plain img: the file comes from the API's own origin, not the optimizer's allow-list.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(value)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-ink-faint">
              {fallbackNote}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label={`Choose ${slot.label.toLowerCase()}`}
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => input.current?.click()}
            className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-50"
          >
            {pending ? "Uploading…" : value ? "Replace image" : "Choose image"}
          </button>
          {value && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                onChange("");
                setNote({ kind: "ok", text: "Removed. The built-in picture returns when you click Save." });
              }}
              className="rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:border-red-700 hover:text-red-700 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {note && (
        <p role={note.kind === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${tone[note.kind]}`}>
          {note.text}
        </p>
      )}
    </div>
  );
}
