import Link from "next/link";
import { BadgeCheck, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { HeroIntro } from "@/components/colleges/hero-intro";
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
  const hasAuthor = Boolean(author?.name) && !author?.hideAuthor;
  const updated = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-surface via-surface to-brand-soft/60 shadow-sm">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand" />
      <div className={`grid gap-x-8 gap-y-3 px-5 py-3 ${hasAuthor ? "lg:grid-cols-[250px_minmax(0,1fr)]" : ""}`}>
        {/* With no author the left column goes away: the crumbs sit above the heading and the text starts at the left edge. */}
        <div className={hasAuthor ? "min-w-0" : "flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1"}>
          <Breadcrumbs items={crumbs} />
          <p className={`text-sm text-ink-soft ${hasAuthor ? "mt-1" : ""}`}>Updated on {updated}</p>
          {hasAuthor && author && (
            <div className="mt-2 inline-flex items-center gap-3 rounded-full border border-line bg-surface/80 py-1.5 pl-1.5 pr-4 shadow-sm">
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
          <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-brand">
            <Sparkles className="tcp-wiggle h-3.5 w-3.5" aria-hidden="true" />
            Your shortlist starts here
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {title}{" "}
            <span className="ml-1 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 align-middle text-xs font-semibold text-brand-ink">
              {countLabel}
            </span>
          </h1>
          <HeroIntro paragraphs={intro} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 bg-surface/60 px-5 py-2">
        <ShareLinks title={title} />
        <Link
          href="/enquiry" data-track="cta_enquiry"
          className="tcp-wiggle rounded-full bg-brand px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
        >
          Get Free Counselling
        </Link>
      </div>
    </section>
  );
}
