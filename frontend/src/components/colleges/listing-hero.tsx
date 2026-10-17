import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ShareLinks } from "@/components/colleges/share-links";
import { mediaUrl } from "@/lib/media";
import type { ListingHeader } from "@/lib/api";

/** The intro the admin wrote (paragraphs split by a blank line), or the page's own guide when there is none. */
export function introOf(header: ListingHeader | null | undefined, fallback: string[]): string[] {
  const written = (header?.intro ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return written.length > 0 ? written : fallback;
}

/**
 * The card at the top of a listing page (colleges, courses): where you are and who wrote it on the
 * left, the heading and a short guide beside it, and the share buttons and counselling button along
 * the bottom.
 */
export function ListingHero({
  crumbs,
  title,
  countLabel,
  intro,
  author,
}: {
  crumbs: { label: string; href?: string }[];
  title: string;
  /** The small tag after the heading, e.g. "16 Results". */
  countLabel: string;
  /** One or two paragraphs; the second sits behind "Read More". */
  intro: string[];
  author?: ListingHeader | null;
}) {
  const updated = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-surface via-surface to-brand-soft/60 shadow-sm">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand" />
      <div className="grid gap-x-8 gap-y-3 px-5 py-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div className="min-w-0">
          <Breadcrumbs items={crumbs} />
          <p className="mt-1 text-xs text-ink-faint">Updated on {updated}</p>
          {author?.name && (
            <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-line bg-surface/80 py-1.5 pl-1.5 pr-4 shadow-sm">
              {author.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(author.photo)} alt={author.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-soft" />
              ) : (
                <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink">
                  {author.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="leading-tight">
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink">
                  {author.name}
                  <BadgeCheck className="h-4 w-4 fill-emerald-600 text-white" aria-label="Verified" />
                </p>
                {author.role && <p className="text-xs capitalize text-ink-soft">{author.role}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
            {title}{" "}
            <span className="ml-1 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 align-middle text-xs font-semibold text-brand-ink">
              {countLabel}
            </span>
          </h1>
          <div className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            <p>{intro[0]}</p>
            {intro.length > 1 && (
              <details className="group">
                <summary className="cursor-pointer list-none font-medium text-brand hover:underline group-open:hidden">
                  Read More
                </summary>
                {intro.slice(1).map((paragraph) => (
                  <p key={paragraph} className="mt-1">{paragraph}</p>
                ))}
              </details>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 bg-surface/60 px-5 py-2.5">
        <ShareLinks title={title} />
        <Link
          href="/enquiry" data-track="cta_enquiry"
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
        >
          Get Free Counselling
        </Link>
      </div>
    </section>
  );
}
