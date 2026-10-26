import { notFound, permanentRedirect } from "next/navigation";
import { ApiError, getCollectionMeta } from "@/lib/api";

/**
 * A collection's old address, /colleges/<slug>. A collection now opens the colleges list with its
 * filters already applied, so the old link goes there for good. Links in search results, the footer
 * and bookmarks made before that keep working. An unknown or unpublished collection is a 404.
 */
export default async function CollectionRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let href: string;
  try {
    href = (await getCollectionMeta(slug)).href;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  permanentRedirect(href);
}
