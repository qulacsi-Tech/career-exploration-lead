import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * The shared body for the pages a visitor never means to land on: 404s and
 * errors.
 *
 * One component rather than three near-identical layouts, because these screens
 * are seen rarely and drift the moment they are maintained separately — the
 * kind of page that is still running last year's type scale because nobody
 * looks at it. The code, the wording and the actions change; the layout does
 * not.
 *
 * Every route here is a real page, checked against the app directory. A dead
 * link on the 404 page is the one place it is least forgivable.
 */
const DESTINATIONS = [
  { href: "/colleges", label: "Browse colleges", note: "30,000+ listed" },
  { href: "/courses", label: "Explore courses", note: "By stream and degree" },
  { href: "/exams", label: "Entrance exams", note: "Dates, cutoffs, results" },
  { href: "/compare", label: "Compare colleges", note: "Up to three at once" },
  { href: "/articles", label: "News & updates", note: "Admissions and placements" },
  { href: "/enquiry", label: "Talk to a counsellor", note: "Get a call back" },
];

export function RouteMessage({
  code,
  title,
  description,
  children,
}: {
  /** Shown as a large ghost numeral behind the heading. */
  code: string;
  title: string;
  description: string;
  /** Primary actions — a link home, a retry button. */
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="relative text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 select-none font-display text-[9rem] font-bold leading-none text-ink/[0.05] sm:text-[12rem]"
        >
          {code}
        </span>

        <div className="relative">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            {description}
          </p>

          {children && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>
          )}
        </div>
      </div>

      <div className="mt-14">
        <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
          Where you might be headed
        </h2>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((destination) => (
            <li key={destination.href}>
              <Link
                href={destination.href}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"
              >
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold text-ink transition-colors group-hover:text-brand">
                    {destination.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-soft">
                    {destination.note}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-brand transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The filled pill used for the primary action on these screens. */
export function RouteAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
    >
      {children}
    </Link>
  );
}
