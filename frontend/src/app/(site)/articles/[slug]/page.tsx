import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ShareLinks } from "@/components/colleges/share-links";
import { Chip } from "@/components/ui/chip";
import { CollegeCard } from "@/components/college-card";
import { ArticleSections } from "@/components/article-sections";
import { sectionAnchor } from "@/lib/article-sections";
import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { FeaturedStories } from "@/components/colleges/featured-stories";
import { getArticle, getArticleSlugs, getArticles, getCollege, getHomeData, getListingSlots } from "@/lib/api";
import { ListingSlotView } from "@/components/colleges/listing-slot";
import { sidebarSlots, slotsAt, slotsForStory, withSidebarSlots } from "@/lib/slot-layout";
import { articleImage } from "@/lib/article-images";
import { mediaUrl } from "@/lib/media";
import { ActionButton } from "@/components/college/college-actions";

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

  // Other articles for the sidebar, and the one that comes next in the list (the older one; the first again from the last).
  let more: Awaited<ReturnType<typeof getArticles>>["data"] = [];
  let next: (typeof more)[number] | null = null;
  try {
    // The API gives at most 50 at a time; a bigger ask fails, which used to hide Next and More articles.
    const res = await getArticles({ limit: 50 });
    more = res.data.filter((a) => a.slug !== slug).slice(0, 3);
    const at = res.data.findIndex((a) => a.slug === slug);
    const candidate = res.data[at + 1] ?? res.data[0];
    next = candidate && candidate.slug !== slug ? candidate : null;
  } catch {
    more = [];
  }
  // The stories the team has highlighted (the ones pinned for the homepage news), shown as a banner above "More articles".
  const featured = (await getHomeData().catch(() => null))?.articles.filter((a) => a.slug !== slug).slice(0, 3) ?? [];

  // Render plain-text body: split on double newlines into paragraphs
  const bodyParagraphs = article.body
    ? article.body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
    : [];

  const sections = article.sections ?? [];
  // Banners and ads set in the admin (Articles > Story page): between the sections or in the right column.
  const slots = slotsForStory((await getListingSlots("article").catch(() => null))?.slots ?? [], slug);
  const column = sidebarSlots(slots);
  const top = slotsAt(slots, "top");
  const bottom = slotsAt(slots, "bottom");
  const picture = articleImage(article.slug, article.image);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* One tinted bar from edge to edge: the trail on the left, bolder than elsewhere, and the share
          buttons at the right-hand end, so the row reads as filled and not as a few items in white space. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-line bg-gradient-to-r from-brand-soft via-bg-alt to-surface px-5 py-3.5 shadow-sm">
        <Breadcrumbs
          emphasis
          items={[
            { label: "Home", href: "/" },
            { label: "Articles", href: "/articles" },
            { label: article.title },
          ]}
        />
        <ShareLinks title={article.title} />
      </div>

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

          {picture && (
            // Plain img: an uploaded picture comes from the API's origin, and its height is not known.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(picture)} alt={article.title} className="mt-6 aspect-[20/9] w-full max-w-3xl rounded-xl border border-line object-cover" />
          )}

          {top.length > 0 && (
            <div className="mt-6 max-w-3xl space-y-4">
              {top.map((slot) => (
                <ListingSlotView key={slot.id} slot={slot} />
              ))}
            </div>
          )}

          {sections.length > 0 && (
            <ArticleSections sections={sections} />
          )}

          {sections.length === 0 && bodyParagraphs.length > 0 && (
            <div className="mt-6 max-w-3xl space-y-4 border-t border-line pt-6 text-sm leading-relaxed text-ink-soft">
              {bodyParagraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {bottom.length > 0 && (
            <div className="mt-8 max-w-3xl space-y-4">
              {bottom.map((slot) => (
                <ListingSlotView key={slot.id} slot={slot} />
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

          {next && (
            <Link
              href={`/articles/${next.slug}`}
              className="group mt-12 flex max-w-3xl items-center justify-between gap-4 rounded-2xl border border-line bg-gradient-to-r from-brand-soft via-bg-alt to-surface p-5 transition hover:border-brand/50 hover:shadow-md sm:p-6"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">Next article</p>
                <p className="mt-1 line-clamp-2 font-display text-lg font-bold text-ink group-hover:text-brand sm:text-xl">{next.title}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {[next.category, next.date].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-white transition group-hover:translate-x-1">
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
            </Link>
          )}
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {withSidebarSlots(
            [
          sections.filter((s) => s.heading).length > 1 ? (
            <nav key="toc" aria-label="In this article" className="rounded-2xl bg-brand-soft p-5">
              <p className="font-display text-lg font-semibold text-brand-ink">In this article</p>
              <ol className="mt-3 space-y-2 text-sm">
                {sections.map((s, i) =>
                  s.heading ? (
                    <li key={i}>
                      <a href={`#${sectionAnchor(s.heading, i)}`} className="text-brand-ink/80 hover:text-brand">
                        {s.heading}
                      </a>
                    </li>
                  ) : null,
                )}
              </ol>
            </nav>
          ) : null,

          <div key="help" className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Need help deciding?</p>
            <p className="mt-2 text-sm text-brand-ink/80">
              Talk to an admission counsellor about the colleges in this article.
            </p>
            <ActionButton kind="callback"
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Get Free Counselling
            </ActionButton>
          </div>,

          featured.length > 0 ? <FeaturedStories key="featured" stories={featured} /> : null,

          more.length > 0 ? (
            <div key="more" className="rounded-2xl bg-brand-soft p-5">
              <p className="font-display text-lg font-semibold text-brand-ink">More articles</p>
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
          ) : null,
            ].filter(Boolean),
            column,
            (slot) => <ListingSlotView key={slot.id} slot={slot} compact />,
          )}
        </aside>
      </div>
    </div>
  );
}
