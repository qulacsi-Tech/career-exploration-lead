"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Gallery uploader: drop a batch of images, then name and describe each one.
 *
 * Alt text is captured per image at upload time rather than left for later.
 * This is a public, SEO-driven site — the proposal calls for image sitemaps —
 * and alt text added "afterwards" never gets added. The count of images still
 * missing it is shown so an incomplete batch is visible rather than silent.
 *
 * Previews are object URLs and are revoked on removal and on unmount; without
 * that, working through a long gallery leaks the whole batch into memory.
 */

type PendingImage = {
  id: string;
  file: File;
  /** Object URL for the preview — must be revoked when the item goes away. */
  url: string;
  label: string;
  alt: string;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

/** "Campus main block.jpg" -> "Campus main block", as a starting label. */
const labelFromFilename = (name: string) =>
  name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function MediaUploader() {
  const [images, setImages] = useState<PendingImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<PendingImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Revoke every outstanding preview when the tab or modal goes away.
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, []);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const accepted = Array.from(fileList)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: newId(),
        file,
        url: URL.createObjectURL(file),
        label: labelFromFilename(file.name),
        alt: "",
      }));
    if (accepted.length) setImages((prev) => [...prev, ...accepted]);
  };

  const removeImage = (id: string) =>
    setImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((image) => image.id !== id);
    });

  const update = (id: string, patch: Partial<Pick<PendingImage, "label" | "alt">>) =>
    setImages((prev) => prev.map((image) => (image.id === id ? { ...image, ...patch } : image)));

  const missingAlt = images.filter((image) => !image.alt.trim()).length;

  return (
    <div className="space-y-4">
      {/*
        The drop zone is a label wrapping the file input, so clicking or
        keyboard-activating it opens the picker without a click handler — the
        browser's own behaviour, which stays keyboard accessible for free.
      */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          // Ignore drags moving between children of the zone.
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? "border-brand bg-brand-soft/40" : "border-line bg-bg-alt hover:border-brand/50"
        }`}
      >
        <UploadIcon className="h-7 w-7 text-ink-faint" />
        <p className="mt-2 text-sm font-medium text-ink">
          Drag images here, or <span className="text-brand">browse</span>
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          JPG, PNG, WebP or SVG. Select several at once — each gets its own name and alt text.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            // Reset so re-picking the same file fires change again.
            e.target.value = "";
          }}
        />
      </label>

      {images.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-soft">
            {images.length} image{images.length === 1 ? "" : "s"} ready
            {missingAlt > 0 && (
              <span className="ml-2 rounded border border-brand/40 bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand-ink">
                {missingAlt} missing alt text
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => images.forEach((image) => removeImage(image.id))}
            className="text-xs font-medium text-ink-faint transition hover:text-brand"
          >
            Clear all
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {images.map((image) => (
          <li key={image.id} className="rounded-lg border border-line p-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Local object URL, so a plain img rather than next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt || image.label || "Selected image preview"}
                className="h-24 w-full shrink-0 rounded-md border border-line object-cover sm:w-36"
              />

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`media-label-${image.id}`} className="block text-xs font-semibold text-ink">
                    Image name
                  </label>
                  <input
                    id={`media-label-${image.id}`}
                    value={image.label}
                    onChange={(e) => update(image.id, { label: e.target.value })}
                    placeholder="Main campus block"
                    className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
                  />
                  <p className="mt-1 truncate text-[11px] text-ink-faint">
                    {image.file.name} · {formatSize(image.file.size)}
                  </p>
                </div>

                <div>
                  <label htmlFor={`media-alt-${image.id}`} className="block text-xs font-semibold text-ink">
                    Alt text{" "}
                    <span className={image.alt.trim() ? "text-ink-faint" : "text-brand"}>
                      {image.alt.trim() ? "" : "· required"}
                    </span>
                  </label>
                  <input
                    id={`media-alt-${image.id}`}
                    value={image.alt}
                    onChange={(e) => update(image.id, { alt: e.target.value })}
                    placeholder="Students outside the main campus block"
                    aria-invalid={!image.alt.trim()}
                    className={`mt-1.5 w-full rounded-lg border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
                      image.alt.trim() ? "border-line focus:border-brand" : "border-brand/50 focus:border-brand"
                    }`}
                  />
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Describe what is in the shot — used by screen readers and image search.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeImage(image.id)}
                aria-label={`Remove ${image.label || image.file.name}`}
                className="h-fit shrink-0 rounded-md border border-line p-1.5 text-ink-faint transition hover:border-brand hover:text-brand"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/*
        Nothing leaves the browser: the backend has no upload route yet, only an
        empty backend/uploads directory. These stay as object URLs until the
        media endpoint exists.
      */}
      <p className="text-[11px] text-ink-faint">
        Files are held in the browser for now — uploading needs the media endpoint.
      </p>
    </div>
  );
}

/**
 * Single-image upload, for slots that hold exactly one picture — the Open Graph
 * image, a logo, a cover. Same drag-or-browse behaviour as the gallery, with
 * one preview that gets replaced rather than a growing list.
 *
 * Used instead of a path text field anywhere an image is chosen: the stored
 * path is whatever the media endpoint returns, so a hand-typed one is only an
 * opportunity for a typo and a silently broken image.
 */
export function ImageUploadField({
  label,
  name,
  hint,
  altLabel = "Alt text",
  altPlaceholder,
  withAlt = true,
  className,
}: {
  label: string;
  name: string;
  hint?: string;
  altLabel?: string;
  altPlaceholder?: string;
  withAlt?: boolean;
  className?: string;
}) {
  const [image, setImage] = useState<PendingImage | null>(null);
  const imageRef = useRef<PendingImage | null>(null);

  useEffect(() => {
    imageRef.current = image;
  }, [image]);

  useEffect(() => {
    return () => {
      if (imageRef.current) URL.revokeObjectURL(imageRef.current.url);
    };
  }, []);

  const [dragging, setDragging] = useState(false);

  const setFile = (fileList: FileList | null) => {
    const file = Array.from(fileList ?? []).find((f) => f.type.startsWith("image/"));
    if (!file) return;
    setImage((prev) => {
      // Replacing: release the previous preview before dropping the reference.
      if (prev) URL.revokeObjectURL(prev.url);
      return {
        id: newId(),
        file,
        url: URL.createObjectURL(file),
        label: labelFromFilename(file.name),
        alt: "",
      };
    });
  };

  const clear = () =>
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-ink">{label}</p>

      {!image ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            setFile(e.dataTransfer.files);
          }}
          className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
            dragging ? "border-brand bg-brand-soft/40" : "border-line bg-bg-alt hover:border-brand/50"
          }`}
        >
          <UploadIcon className="h-5 w-5 text-ink-faint" />
          <p className="mt-1.5 text-xs font-medium text-ink">
            Drop an image, or <span className="text-brand">browse</span>
          </p>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <div className="mt-1.5 rounded-lg border border-line p-3">
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.alt || image.label || "Selected image preview"}
              className="h-16 w-24 shrink-0 rounded-md border border-line object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{image.file.name}</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">{formatSize(image.file.size)}</p>
              <div className="mt-1.5 flex gap-3">
                <label className="cursor-pointer text-[11px] font-medium text-brand hover:underline">
                  Replace
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      setFile(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={clear}
                  className="text-[11px] font-medium text-ink-faint transition hover:text-brand"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          {withAlt && (
            <div className="mt-3">
              <label htmlFor={`${name}-alt`} className="block text-xs font-semibold text-ink">
                {altLabel}
              </label>
              <input
                id={`${name}-alt`}
                value={image.alt}
                onChange={(e) =>
                  setImage((prev) => (prev ? { ...prev, alt: e.target.value } : prev))
                }
                placeholder={altPlaceholder}
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 15v2.5A2.5 2.5 0 0 0 6 20h12a2.5 2.5 0 0 0 2.5-2.5V15" strokeLinecap="round" />
    </svg>
  );
}
