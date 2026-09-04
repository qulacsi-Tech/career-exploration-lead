import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { CollegeCard } from "@/components/college-card";
import { RichText } from "@/components/rich-text";
import { fullArticles, articleBySlug, otherArticles } from "@/lib/articles-data";
import { colleges } from "@/lib/mock-data";
import { richTextToPlain } from "@/lib/rich-text";

export function generateStaticParams() {
  return fullArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return { title: "Article not found" };

  return {
    title: article.title,
    // Falls back to the opening of the body rather than leaving it empty: a
    // missing description hands the search engine the choice of snippet.
    description: article.excerpt || richTextToPlain(article.body, 155),
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.date,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) notFound();

  const mentioned = article.relatedCollegeSlugs
    .map((s) => colleges.find((c) => c.slug === s))
    .filter((c): c is (typeof colleges)[number] => c !== undefined);

  const more = otherArticles(article.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Articles", href: "/articles" },
          { label: article.title },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
            <Chip tone="brand">{article.category}</Chip>
            <span>{article.date}</span>
            <span>&middot; {article.author}</span>
            <span>&middot; {article.readMinutes} min read</span>
          </div>

          {/* Measured column: body copy set the full width of a 1216px page is
              unreadable, whatever the font. */}
          <h1 className="mt-3 max-w-3xl font-display text-2xl font-bold text-ink sm:text-3xl">
            {article.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-soft">
            {article.excerpt}
          </p>

          <div className="mt-6 max-w-3xl border-t border-line pt-6">
            <RichText doc={article.body} />
          </div>

          {mentioned.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-lg font-bold text-ink">
                Colleges mentioned in this article
              </h2>
              <div className="mt-4 space-y-4">
                {mentioned.map((college) => (
                  <CollegeCard key={college.slug} college={college} />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-brand/30 bg-brand-soft p-5">
            <p className="font-display font-semibold text-brand-ink">Need help deciding?</p>
            <p className="mt-1 text-xs text-brand-ink/80">
              Talk to an admission counsellor about the colleges in this article.
            </p>
            <Link
              href="/enquiry"
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Get Free Counselling
            </Link>
          </div>

          {more.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="font-display font-semibold text-ink">More articles</p>
              <ul className="mt-3 space-y-3">
                {more.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/articles/${other.slug}`}
                      className="text-sm font-medium text-ink hover:text-brand"
                    >
                      {other.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-faint">{other.date}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
