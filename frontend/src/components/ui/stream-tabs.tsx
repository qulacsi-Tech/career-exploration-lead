import Link from "next/link";

/**
 * Stream filter row that sits under the "Top Colleges" / "Top Exams" headings.
 * Static links for now — swapped for a client-side filter once the listing API
 * can serve per-stream results.
 */
export function StreamTabs({
  streams,
  active,
  hrefFor,
}: {
  streams: string[];
  active: string;
  hrefFor: (stream: string) => string;
}) {
  return (
    <div className="mt-7 flex flex-wrap justify-center gap-3">
      {streams.map((stream) => (
        <Link
          key={stream}
          href={hrefFor(stream)}
          aria-current={stream === active ? "page" : undefined}
          className={`rounded-md border px-4 py-2 text-sm transition ${
            stream === active
              ? "border-brand text-brand"
              : "border-line text-ink-soft hover:border-brand hover:text-brand"
          }`}
        >
          {stream}
        </Link>
      ))}
    </div>
  );
}
