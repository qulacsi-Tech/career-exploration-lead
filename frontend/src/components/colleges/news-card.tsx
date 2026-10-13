import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Newspaper } from "lucide-react";
import type { Article } from "@/lib/api";
import { articleImage } from "@/lib/article-images";
import { mediaUrl } from "@/lib/media";

/** A story on the news listing, styled to match the college, course and exam cards. */
export function NewsCard({ article, lead = false }: { article: Article; lead?: boolean }) {
  const href = `/articles/${article.slug}`;
  const image = articleImage(article.slug, article.image);

  return (
    <article className="@container relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_24px_-12px_rgba(177,36,62,0.35)]">
      {article.category && (
        <span className="absolute right-0 top-0 z-10 rounded-bl-xl bg-brand-ink px-3 py-1 text-[11px] font-bold tracking-wide text-white">
          {article.category}
        </span>
      )}

      <div className={`flex flex-col ${lead ? "@2xl:flex-row" : "@2xl:flex-row"}`}>
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className={`relative block shrink-0 overflow-hidden bg-brand-soft ${
            lead ? "aspect-[16/9] @2xl:aspect-auto @2xl:w-[44%]" : "aspect-[16/9] @2xl:aspect-auto @2xl:w-56"
          }`}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(image)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
            />
          ) : (
            <span className="grid h-full min-h-32 w-full place-items-center text-brand">
              <Newspaper className="h-10 w-10" />
            </span>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pr-24 text-xs text-ink-faint">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {article.date}
            </span>
            {article.readMinutes ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {article.readMinutes} min read
              </span>
            ) : null}
            {article.author && <span>{article.author}</span>}
          </div>

          <Link
            href={href}
            className={`mt-2 font-display font-semibold leading-snug text-ink hover:text-brand ${
              lead ? "text-xl @2xl:text-2xl" : "text-base @2xl:text-lg"
            }`}
          >
            {article.title}
          </Link>
          <p className={`mt-2 text-sm leading-relaxed text-ink-soft ${lead ? "line-clamp-4" : "line-clamp-2"}`}>
            {article.excerpt}
          </p>

          <div className="mt-auto flex pt-4">
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Read story
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
