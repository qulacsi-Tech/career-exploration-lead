import { notFound, permanentRedirect } from "next/navigation";
import { getHomeData } from "@/lib/api";

/**
 * The old stream address, /engineering/colleges. There is one colleges listing, /colleges, and a stream
 * is a filter on it, so this goes there for good with the filter applied. Bookmarks and links from
 * outside keep working. An unknown stream is a 404.
 */
export default async function StreamCollegesRedirect({ params }: { params: Promise<{ stream: string }> }) {
  const { stream: streamSlug } = await params;
  const home = await getHomeData();
  const stream = home.streams.find((s) => s.slug === streamSlug);
  if (!stream) notFound();
  permanentRedirect(`/colleges?stream=${encodeURIComponent(stream.name)}`);
}
