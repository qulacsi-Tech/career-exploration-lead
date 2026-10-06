import Link from "next/link";
import type { LocationStream } from "@/components/location-streams";

/**
 * Filter chips for a city page: "All" plus every stream that has colleges there. Each
 * chip is a link to `?stream=<slug>`, so a filtered view can be shared and works without
 * script. "All" links back to the plain city page, which is the reset.
 */
export function LocationStreamFilter({
  locationSlug,
  streams,
  activeSlug,
  total,
}: {
  locationSlug: string;
  streams: LocationStream[];
  activeSlug?: string;
  total: number;
}) {
  if (streams.length === 0) return null;

  const chip = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
      active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
    }`;

  return (
    <nav aria-label="Filter by stream" className="mb-6 flex flex-wrap items-center gap-2">
      <Link
        href={`/location/${locationSlug}`}
        scroll={false}
        aria-current={!activeSlug ? "page" : undefined}
        className={chip(!activeSlug)}
      >
        All <span className="text-xs opacity-80">{total}</span>
      </Link>
      {streams.map((stream) => (
        <Link
          key={stream.slug}
          href={`/location/${locationSlug}?stream=${stream.slug}`}
          scroll={false}
          aria-current={stream.slug === activeSlug ? "page" : undefined}
          className={chip(stream.slug === activeSlug)}
        >
          {stream.name} <span className="text-xs opacity-80">{stream.count}</span>
        </Link>
      ))}
      {activeSlug && (
        <Link href={`/location/${locationSlug}`} scroll={false} className="ml-1 text-sm font-medium text-brand underline-offset-4 hover:underline">
          Reset
        </Link>
      )}
    </nav>
  );
}
