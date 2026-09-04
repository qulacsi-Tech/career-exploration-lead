"use client";

import { useState } from "react";
import {
  HIGHLIGHT_CAP,
  mediaFor,
  galleryFor,
  videosFor,
  parseVideoUrl,
  videoWatchUrl,
  type CollegeVideo,
  type GalleryImage,
} from "@/lib/college-content";
import { MediaUploader } from "@/components/admin/media-uploader";
import { TextField } from "@/components/admin/admin-fields";

/**
 * The Media tab, split into the three collections the MOM asks for (§1.3).
 *
 * They are sub-tabs rather than three stacked sections because each carries its
 * own uploader and record list — stacked, the panel becomes a scroll nobody
 * reaches the bottom of, which is the same reason the parent modal is tabbed.
 *
 *   Media    press, rankings and print coverage — a publication, a date and an
 *            outbound link, and the file is as often a PDF as an image
 *   Gallery  campus photography — alt text required, highlights capped
 *   Videos   embedded, not uploaded (5 Sep decision on §11 Q3)
 */

const SUB_TABS = [
  { id: "media", label: "Media & press" },
  { id: "gallery", label: "Gallery" },
  { id: "videos", label: "Videos" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

export function CollegeMediaTabs({ collegeSlug }: { collegeSlug: string }) {
  const [sub, setSub] = useState<SubTabId>("media");

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Media collections" className="flex flex-wrap gap-1.5">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={sub === t.id}
            onClick={() => setSub(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              sub === t.id
                ? "border-brand bg-brand text-white"
                : "border-line text-ink-soft hover:border-brand hover:text-brand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "media" && <MediaCollection collegeSlug={collegeSlug} />}
      {sub === "gallery" && <GalleryCollection collegeSlug={collegeSlug} />}
      {sub === "videos" && <VideoCollection collegeSlug={collegeSlug} />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Media & press
 * ------------------------------------------------------------------ */

function MediaCollection({ collegeSlug }: { collegeSlug: string }) {
  const items = mediaFor(collegeSlug);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          Press &amp; print coverage ({items.length})
        </h3>
        <p className="mt-1 text-xs text-ink-soft">
          Rankings coverage, print features and promotional material. Not campus
          photography — that belongs in the Gallery.
        </p>

        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-line px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                <span className="rounded border border-line px-1.5 py-px text-[10px] font-bold uppercase text-ink-soft">
                  {item.fileType}
                </span>
                <span className="font-semibold text-ink">{item.publication}</span>
                <span>· {item.date}</span>
              </div>
              <p className="mt-1.5 text-sm text-ink">{item.title}</p>
              {item.externalLink && (
                <a
                  href={item.externalLink}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-1 inline-block truncate text-xs text-brand hover:underline"
                >
                  {item.externalLink}
                </a>
              )}
            </li>
          ))}
          {items.length === 0 && (
            <li className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">
              No press coverage recorded for this college.
            </li>
          )}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">Add coverage</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Title" name="media-title" placeholder="Ranked 34th in NIRF Management 2025" />
          <TextField label="Publication" name="media-publication" placeholder="The Economic Times" />
          <TextField label="Date" name="media-date" type="date" />
          <TextField
            label="External link"
            name="media-link"
            placeholder="https://…"
            hint="Optional. Links out to the original article."
            className="sm:col-span-2"
          />
        </div>
        <div className="mt-3">
          <MediaUploader acceptPdf />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Gallery
 * ------------------------------------------------------------------ */

/**
 * Campus photography, with the highlight selection the MOM asks for — "option
 * to select the best/highlight images for display".
 *
 * The cap is enforced on saved records here and on pending uploads inside
 * MediaUploader, and the two share a budget: the uploader is told how many
 * highlights are already spoken for so a batch cannot push the total past five.
 */
function GalleryCollection({ collegeSlug }: { collegeSlug: string }) {
  const [images, setImages] = useState<GalleryImage[]>(() => galleryFor(collegeSlug));

  const highlights = images.filter((image) => image.isHighlight);
  const capReached = highlights.length >= HIGHLIGHT_CAP;

  const toggle = (id: string) =>
    setImages((prev) =>
      prev.map((image) => {
        if (image.id !== id) return image;
        if (!image.isHighlight && capReached) return image;
        return { ...image, isHighlight: !image.isHighlight };
      }),
    );

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            Campus photos ({images.length})
          </h3>
          <span className="text-[11px] text-ink-faint">
            {highlights.length} of {HIGHLIGHT_CAP} highlights used
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          Highlights lead the college page, and the first one is the thumbnail in
          listings. Capped at {HIGHLIGHT_CAP} so the selection still means something.
        </p>

        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {images.map((image) => (
            <li
              key={image.id}
              className={`rounded-lg border px-3 py-2.5 ${
                image.isHighlight ? "border-brand bg-brand-soft/40" : "border-line"
              }`}
            >
              <p className="text-sm font-medium text-ink">{image.name}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-faint">{image.alt}</p>
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={image.isHighlight}
                  onChange={() => toggle(image.id)}
                  disabled={!image.isHighlight && capReached}
                  className="h-4 w-4 rounded border-line text-brand focus:ring-brand disabled:opacity-40"
                />
                <span className={!image.isHighlight && capReached ? "opacity-50" : ""}>
                  Highlight
                </span>
              </label>
            </li>
          ))}
          {images.length === 0 && (
            <li className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft sm:col-span-2">
              No photos yet.
            </li>
          )}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">Add photos</h3>
        <p className="mt-1 text-xs text-ink-soft">
          Alt text is required on every image — image sitemaps are in scope.
        </p>
        <div className="mt-3">
          <MediaUploader highlightCap={HIGHLIGHT_CAP} highlightsInUse={highlights.length} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Videos
 * ------------------------------------------------------------------ */

/**
 * Videos are embedded, not uploaded.
 *
 * Self-hosting means storage, bandwidth, transcoding and a player; embedding
 * gives all four away free, and the admin UI becomes one URL field. So the
 * record stores provider + id, and this form's job is to turn whatever an
 * editor pastes into that pair — a watch link, a share link, an embed URL or a
 * bare id all work, and anything else is refused rather than saved broken.
 */
function VideoCollection({ collegeSlug }: { collegeSlug: string }) {
  const [videos, setVideos] = useState<CollegeVideo[]>(() => videosFor(collegeSlug));
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const parsed = parseVideoUrl(url);
  const showError = url.trim().length > 0 && parsed === null;
  const canAdd = parsed !== null && title.trim().length > 0;

  const add = () => {
    if (!parsed || !title.trim()) return;
    setVideos((prev) => [
      ...prev,
      {
        id: `${parsed.provider}-${parsed.videoId}`,
        collegeSlug,
        title: title.trim(),
        provider: parsed.provider,
        videoId: parsed.videoId,
      },
    ]);
    setUrl("");
    setTitle("");
  };

  const remove = (id: string) => setVideos((prev) => prev.filter((v) => v.id !== id));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          Videos ({videos.length})
        </h3>
        <p className="mt-1 text-xs text-ink-soft">
          Campus tours and testimonials, embedded from YouTube or Vimeo.
        </p>

        <ul className="mt-3 space-y-2">
          {videos.map((video) => (
            <li
              key={video.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2.5"
            >
              {/* The provider's own thumbnail, so the list is scannable without
                  embedding a player per row. Vimeo has no equivalent by-id
                  thumbnail URL, so it gets a labelled tile instead. */}
              {video.provider === "youtube" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                  alt=""
                  className="h-12 w-20 shrink-0 rounded border border-line object-cover"
                />
              ) : (
                <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded border border-line bg-bg-alt text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                  Vimeo
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{video.title}</span>
                <a
                  href={videoWatchUrl(video)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs text-brand hover:underline"
                >
                  {videoWatchUrl(video)}
                </a>
              </span>

              <button
                type="button"
                onClick={() => remove(video.id)}
                className="shrink-0 text-xs font-medium text-ink-faint transition hover:text-brand"
              >
                Remove
              </button>
            </li>
          ))}
          {videos.length === 0 && (
            <li className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">
              No videos yet.
            </li>
          )}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">Add a video</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="video-url" className="block text-xs font-semibold text-ink">
              Video URL
            </label>
            <input
              id="video-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              aria-invalid={showError}
              className={`mt-1.5 w-full rounded-lg border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
                showError ? "border-brand" : "border-line focus:border-brand"
              }`}
            />
            <p className={`mt-1 text-[11px] ${showError ? "text-brand" : "text-ink-faint"}`}>
              {showError
                ? "Not a YouTube or Vimeo link we recognise."
                : parsed
                  ? `Detected ${parsed.provider} · ${parsed.videoId}`
                  : "Paste a YouTube or Vimeo link — watch, share or embed all work."}
            </p>
          </div>

          <TextField
            label="Title"
            name="video-title"
            value={title}
            onChange={setTitle}
            placeholder="Campus tour 2026"
          />
        </div>

        {parsed && (
          <div className="mt-3 max-w-md overflow-hidden rounded-lg border border-line">
            <div className="aspect-video">
              <iframe
                src={
                  parsed.provider === "youtube"
                    ? `https://www.youtube-nocookie.com/embed/${parsed.videoId}`
                    : `https://player.vimeo.com/video/${parsed.videoId}`
                }
                title="Video preview"
                allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add video
        </button>
      </div>
    </div>
  );
}