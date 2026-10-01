import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { CollegeCard } from "@/components/college-card";
import { getArticle, getArticleSlugs, getArticles, getCollege } from "@/lib/api";

export async function generateStaticParams() {
  try {
    const slugs = await getArticleSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getArticle(slug);
    return {
      title: article.title,
      description: article.excerpt,
      alternates: { canonical: `/articles/${article.slug}` },
      openGraph: {
        type: "article",
        title: article.title,
        description: article.excerpt,
        publishedTime: article.date,
      },
    };
  } catch {
    return { title: "Article not found" };
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let article: Awaited<ReturnType<typeof getArticle>>;
  try {
    article = await getArticle(slug);
  } catch {
    notFound();
  }

  // Fetch related colleges by slug (parallel, ignore individual failures)
  const relatedSlugs = article.relatedCollegeSlugs ?? [];
  const mentioned = (
    await Promise.allSettled(relatedSlugs.map((s) => getCollege(s)))
  )
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getCollege>>> =>
      r.status === "fulfilled"
    )
    .map((r) => r.value);

  // Other articles for the sidebar
  let more: Awaited<ReturnType<typeof getArticles>>["data"] = [];
  try {
    const res = await getArticles({ limit: 5 });
    more = res.data.filter((a) => a.slug !== slug).slice(0, 3);
  } catch {
    more = [];
  }

  // Render plain-text body: split on double newlines into paragraphs
  const bodyParagraphs = article.body
    ? article.body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
    : [];

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
            {article.category && <Chip tone="brand">{article.category}</Chip>}
            <span>{article.date}</span>
            {article.author && <span>&middot; {article.author}</span>}
            {article.readMinutes && <span>&middot; {article.readMinutes} min read</span>}
          </div>

          <h1 className="mt-3 max-w-3xl font-display text-2xl font-bold text-ink sm:text-3xl">
            {article.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-soft">
            {article.excerpt}
          </p>

          {bodyParagraphs.length > 0 && (
            <div className="mt-6 max-w-3xl space-y-4 border-t border-line pt-6 text-sm leading-relaxed text-ink-soft">
              {bodyParagraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

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
