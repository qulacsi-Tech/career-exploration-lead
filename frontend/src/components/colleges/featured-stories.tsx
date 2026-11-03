import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { articleImage } from "@/lib/article-images";
import { mediaUrl } from "@/lib/media";
import type { Article } from "@/lib/api";

/**
 * A banner of the stories the team has highlighted (the ones pinned for the homepage news): a large first story
 * with its picture and "Read now", then the others as links. It sits above "Latest stories" on the news page and
 * above "More articles" on a story's own page.
 */
export function FeaturedStories({ stories }: { stories: Article[] }) {
  if (stories.length === 0) return null;
  const [lead, ...rest] = stories;
  const picture = articleImage(lead.slug, lead.image);

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-ink via-brand-dark to-brand text-white shadow-md">
      <p className="flex items-center gap-1.5 px-5 pt-4 text-xs font-bold uppercase tracking-wide text-white/80">
        <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" /> Featured stories
      </p>
      <Link href={`/articles/${lead.slug}`} className="group mt-3 block">
        {picture && (
          // Plain img: an uploaded picture comes from the API's origin, and its height is not known.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(picture)} alt="" className="aspect-[16/9] w-full object-cover opacity-90 transition group-hover:opacity-100" />
        )}
        <span className="block px-5 pt-3 font-display text-lg font-bold leading-snug group-hover:underline">{lead.title}</span>
        <span className="mt-1 line-clamp-2 block px-5 text-sm text-white/80">{lead.excerpt}</span>
        <span className="mt-2 inline-flex items-center gap-1 px-5 text-sm font-semibold text-gold">
          Read now <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>
      {rest.length > 0 && (
        <ul className="mt-4 divide-y divide-white/15 border-t border-white/15">
          {rest.map((other) => (
            <li key={other.slug}>
              <Link href={`/articles/${other.slug}`} className="block px-5 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10">
                {other.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="h-4" />
    </div>
  );
}
