import { Play } from "lucide-react";
import { DetailCard } from "@/components/college/detail-ui";
import { mediaUrl } from "@/lib/media";
import { videoEmbedUrl } from "@/lib/college-content";
import type { TabMediaItem } from "@/lib/api";

/** The pictures and videos listed under a written tab, as a grid under its text. Nothing when there are none. */
export function TabMediaCard({ items, title, college }: { items: TabMediaItem[]; title: string; college: string }) {
  if (items.length === 0) return null;
  return (
    <DetailCard title={title}>
      <ul className="grid gap-5 sm:grid-cols-2">
        {items.map((m, i) => (
          <li key={`${m.src || m.videoId}-${i}`}>
            {m.kind === "image" ? (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(m.src)} alt={m.title || `Photo of ${college}`} loading="lazy" className="aspect-[16/10] w-full rounded-xl border border-line bg-bg-alt object-cover" />
                {m.title && <figcaption className="mt-2 text-sm text-ink-soft">{m.title}</figcaption>}
              </figure>
            ) : (
              <figure>
                <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-ink/90">
                  <iframe
                    src={videoEmbedUrl({ provider: m.provider as "youtube" | "vimeo", videoId: m.videoId })}
                    title={m.title || `Video of ${college}`}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 h-full w-full border-0"
                  />
                  <Play className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-white/70" aria-hidden="true" />
                </div>
                {m.title && <figcaption className="mt-2 text-sm text-ink-soft">{m.title}</figcaption>}
              </figure>
            )}
          </li>
        ))}
      </ul>
    </DetailCard>
  );
}
