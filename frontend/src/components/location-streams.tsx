import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FieldIcon } from "@/lib/field-icons";

export type LocationStream = {
  slug: string;
  name: string;
  count: number;
  /** Icon key from the Fields list, if this stream has one. */
  icon?: string;
};

/**
 * The streams that have colleges in a city, each linking to that stream's colleges
 * in that city ("Engineering Colleges in Bengaluru"). Only streams with at least one
 * college are listed, so no card leads to an empty page.
 */
export function LocationStreams({
  locationSlug,
  locationName,
  streams,
  activeSlug,
}: {
  locationSlug: string;
  locationName: string;
  streams: LocationStream[];
  /** Highlights the stream whose page this is shown on. */
  activeSlug?: string;
}) {
  if (streams.length === 0) return null;

  return (
    <section aria-labelledby="location-streams-heading" className="mb-8">
      <h2 id="location-streams-heading" className="font-display text-lg font-bold text-ink sm:text-xl">
        Choose a stream in {locationName}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Pick the kind of college you are looking for.</p>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {streams.map((stream) => {
          const active = stream.slug === activeSlug;
          return (
            <li key={stream.slug}>
              <Link
                href={`/location/${locationSlug}/${stream.slug}`}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-4 rounded-2xl border p-4 transition ${
                  active ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand hover:shadow-sm"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <FieldIcon name={stream.icon ?? ""} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-semibold text-ink group-hover:text-brand">
                    {stream.name} Colleges in {locationName}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {stream.count} college{stream.count === 1 ? "" : "s"}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:text-brand" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
