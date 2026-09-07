import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { RichText } from "@/components/rich-text";
import {
  collectionBySlug,
  collectionColleges,
  collectionHref,
  canonicalFor,
  describeCollectionScope,
  publishedCollections,
} from "@/lib/collections-data";
import { isRichTextEmpty } from "@/lib/rich-text";

/**
 * A collection's public page — /colleges/<slug>.
 *
 * Sits beside /colleges (the full directory) rather than under a /collections
 * prefix: "collections" is a CMS word that would appear in every URL and earn
 * nothing in search, while /colleges/mba-colleges-in-bangalore reads as what it
 * is. The single-college page is /college/<slug>, singular — a different
 * segment, so there is no routing collision, only a name close enough to be
 * worth pointing out to whoever edits these next.
 *
 * Structurally the same page as a city or stream listing, and deliberately
 * built on the same `CollegeListing` shell for that reason.
 */

/**
 * Only published collections get a page. An unpublished one 404s rather than
 * rendering a draft at a guessable URL — and `publishBlocker` already stops a
 * collection resolving to zero colleges from being published, so the empty
 * state below is a safety net rather than something a visitor should ever see.
 */
export function generateStaticParams() {
  return publishedCollections().map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (!collection || !collection.isPublished) return { title: "Collection not found" };

  return {
    title: collection.seo.metaTitle || collection.title,
    description: collection.seo.metaDescription,
    /*
      Not always this page's own URL. A collection whose scope is a single
      filter duplicates a city or stream page that already serves those
      colleges, and two URLs competing for one query is how a site cannibalises
      its own ranking. `canonicalFor` points at the original in that case.
    */
    alternates: { canonical: canonicalFor(collection) },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (!collection || !collection.isPublished) notFound();

  // Unlimited: the homepage placement's card count trims a band, not the page
  // the band links to.
  const rows = collectionColleges(collection, { limit: undefined });

  /*
    Sibling collections — the other groups a visitor might have meant. Scoped to
    ones sharing this collection's program so the list stays relevant: from "MBA
    Colleges in Bangalore", "MBA Colleges in Pune" is a useful next click and
    "Top Engineering Colleges" is not.
  */
  const related = publishedCollections().filter(
    (other) =>
      other.id !== collection.id &&
      other.scope.programSlug === collection.scope.programSlug,
  );

  return (
    <CollegeListing
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Colleges", href: "/colleges" },
        { label: collection.title },
      ]}
      title={collection.title}
      subtitle={
        collection.subheading ||
        `${rows.length} college${rows.length === 1 ? "" : "s"} · ${describeCollectionScope(collection.scope)}`
      }
      colleges={rows}
      emptyMessage="No colleges match this collection yet."
      sidebar={
        <>
          <CounsellingCard context={collection.title.toLowerCase()} />
          <SidebarLinks
            title="Related collections"
            items={related.map((other) => ({
              label: other.title,
              href: collectionHref(other),
              meta: String(collectionColleges(other, { limit: undefined }).length),
            }))}
          />
        </>
      }
    >
      {/*
        Intro copy and FAQs are rendered as children rather than through the
        shell's plain-string `intro` prop: this is editor-authored rich text with
        headings and links, and the FAQ block is the collection's own.
      */}
      {!isRichTextEmpty(collection.seo.intro) && (
        <section className="mt-10 border-t border-line pt-8">
          <RichText doc={collection.seo.intro} className="max-w-3xl" />
        </section>
      )}

      {collection.seo.faqs.length > 0 && (
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="font-display text-xl font-bold text-ink">
            Frequently asked questions
          </h2>
          <dl className="mt-4 max-w-3xl space-y-4">
            {collection.seo.faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-line bg-surface p-4">
                <dt className="font-display text-sm font-semibold text-ink">{faq.question}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </CollegeListing>
  );
}
