import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { fullArticles } from "@/lib/articles-data";

export const metadata: Metadata = {
  title: "Articles & Admission Guides",
  description:
    "Admission processes, placement reports and course guides for colleges and entrance exams across India.",
};

/** The article index, linked from the header's "More" and the homepage rail. */
export default function ArticlesIndexPage() {
  const [lead, ...rest] = fullArticles;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Articles" }]} />

      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
        Articles &amp; Admission Guides
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Admission processes, placement reports and course explainers, written for
        candidates deciding where to apply.
      </p>

      {/* The newest piece gets the wide treatment — a listing where every card is
          the same size gives a reader no way in. */}
      <Link
        href={`/articles/${lead.slug}`}
        className="mt-8 block rounded-2xl border border-line bg-surface p-6 transition hover:border-brand sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
          <Chip tone="brand">{lead.category}</Chip>
          <span>{lead.date}</span>
          <span>&middot; {lead.readMinutes} min read</span>
        </div>
        <h2 className="mt-3 font-display text-xl font-bold text-ink sm:text-2xl">{lead.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">{lead.excerpt}</p>
        <span className="mt-4 inline-block text-sm font-semibold text-brand">Read article →</span>
      </Link>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rest.map((article) => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            className="rounded-2xl border border-line bg-surface p-5 transition hover:border-brand"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
              <Chip>{article.category}</Chip>
              <span>{article.date}</span>
            </div>
            <h2 className="mt-2 font-display text-base font-bold text-ink">{article.title}</h2>
            <p className="mt-1.5 line-clamp-3 text-sm text-ink-soft">{article.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
