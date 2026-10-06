import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Building2, ArrowUpRight } from "lucide-react";
import { DEFAULT_HOME_COPY, type LocationCardCopy, type SectionCopy } from "@/lib/home-copy";
import type { HomeLocation } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import type { LocationHighlights } from "@/lib/location-colleges";

/**
 * Destination hubs, as a stack of cards that cover each other as the page scrolls.
 *
 * Every card is on the page at once. Each one is `position: sticky` at the same
 * offset, just under the site header, so as you scroll the next card rises and lands
 * exactly on top of the one before it. The section's heading is not pinned: it scrolls
 * away so the whole card has the screen. After the last card the stack scrolls away with
 * the section. There is no script: the layout is plain CSS (see `.hub-stack` in
 * globals.css).
 *
 * ## Why nothing above it may clip overflow
 *
 * `position: sticky` sticks to the nearest ancestor that scrolls. An ancestor with
 * `overflow: hidden` or `auto` becomes that ancestor and the cards stop sticking, so
 * this section and its wrappers deliberately set no overflow. The rounded corners are
 * clipped on the card itself instead.
 *
 * ## The cover effect
 *
 * Where the browser supports scroll-driven animations, the card being covered shrinks
 * slightly and dims as the next one rises over it. Each card names its own scroll
 * timeline and the card before it listens to that name, so the covered card is driven
 * by the card that is covering it. Elsewhere the cards simply stack, which reads fine.
 *
 * ## Short screens
 *
 * The card's height follows the screen, so it always fits under the site header. A card
 * that still cannot fit (a very short screen) is not pinned and the cards run in a
 * normal column.
 */
export function LocationCarousel({
  locations,
  copy = DEFAULT_HOME_COPY.locations,
  card = DEFAULT_HOME_COPY.locationCard,
  highlights = {},
}: {
  locations: HomeLocation[];
  copy?: SectionCopy;
  card?: LocationCardCopy;
  /** Branches and college names for each location, keyed by location slug. */
  highlights?: Record<string, LocationHighlights>;
}) {
  // Nothing ticked in the admin: no empty frame.
  if (locations.length === 0) return null;

  const last = locations.length - 1;
  // Every timeline name has to be declared on a shared ancestor so a card can listen to its neighbour's.
  const scope = locations.map((_, i) => `--hub-${i}`).join(", ");

  return (
    <section className="relative bg-bg pt-12 pb-16 lg:pt-16 lg:pb-20">
      {/* The heading scrolls away; only the cards pin. */}
      <div className="mx-auto w-[90%] max-w-[1500px] pb-2 sm:pb-3">
        {copy.eyebrow && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">{copy.eyebrow}</span>
        )}
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {copy.heading} {copy.accent && <span className="italic text-brand">{copy.accent}</span>}
        </h2>
      </div>

      <div className="mx-auto w-[90%] max-w-[1500px] pt-3 sm:pt-4">
        <ol className="hub-stack" style={{ "--hub-scope": scope } as CSSProperties}>
          {locations.map((location, index) => (
            <li
              key={location.slug}
              className="hub-stack-item"
              style={
                {
                  "--hub-own": `--hub-${index}`,
                  // The card before this one listens to this card's timeline; the last card has none.
                  "--hub-next": index < last ? `--hub-${index + 1}` : "none",
                } as CSSProperties
              }
            >
              <DestinationCard location={location} index={index} card={card} highlights={highlights[location.slug]} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function DestinationCard({
  location,
  index,
  card,
  highlights,
}: {
  location: HomeLocation;
  index: number;
  card: LocationCardCopy;
  highlights?: LocationHighlights;
}) {
  const branches = highlights?.branches ?? [];
  const colleges = highlights?.colleges ?? [];
  // The more there is to say, the more room the words get. A sparse card gives the photo up
  // to 70% of the width; a full one splits the card 50/50. (Literal class names, for Tailwind.)
  const weight = Math.min(branches.length, 4) + (colleges.length > 0 ? 2 : 0);
  const columns =
    weight <= 3
      ? "md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
      : weight <= 5
        ? "md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
        : "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]";
  const href = `/location/${location.slug}`;
  return (
    <div
      className={`hub-stack-card group relative grid h-full w-full grid-cols-1 gap-4 overflow-hidden rounded-[32px] border border-line bg-surface p-3 shadow-[0_30px_70px_-30px_rgba(28,33,40,0.4)] md:gap-8 md:p-4 lg:gap-12 ${columns}`}
    >
      {/* Photo: the left half of the card. A plain strip at the top on a phone. */}
      <Link href={href} aria-label={`${location.name} colleges`} className="relative block h-48 overflow-hidden rounded-[22px] bg-brand-ink md:h-full">
        {location.image.startsWith("/api/") ? (
          // Uploaded in the admin: served by the API, so a plain img rather than next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(location.image)}
            alt={`${location.name} campus destination`}
            loading={index < 2 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          />
        ) : location.image ? (
          <Image
            src={location.image}
            alt={`${location.name} campus destination`}
            fill
            sizes="(max-width: 768px) 90vw, 700px"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
            priority={index < 2}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

        <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-all duration-300 group-hover:border-transparent group-hover:bg-white group-hover:text-black">
          <ArrowUpRight className="h-4 w-4" />
        </span>

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink shadow-sm backdrop-blur">
          <Building2 className="h-3.5 w-3.5 text-brand" />
          {location.collegeCount}+ {card.institutionsLabel}
        </span>
      </Link>

      {/* Words: tags, "City, State" on one line, then a button per branch. */}
      <div className="flex min-w-0 flex-col justify-center gap-3 px-1 pb-2 md:gap-4 md:py-3 md:pr-3 lg:pr-6">
        {location.labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {location.labels.map((label, i) => (
              <span
                key={label}
                className={
                  i === 0
                    ? "inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1 text-xs font-medium text-white"
                    : "hidden rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft sm:inline-flex"
                }
              >
                {i === 0 && <MapPin className="h-3.5 w-3.5" />}
                {label}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink lg:text-5xl">
          <Link href={href}>
            {location.name}
            {location.state && <span className="italic text-brand">, {location.state}</span>}
          </Link>
        </h3>

        {branches.length > 0 ? (
          <div className="flex flex-col items-start gap-2.5">
            {branches.slice(0, 4).map((branch) => (
              <Link
                key={branch.slug}
                href={`${href}?stream=${branch.slug}`}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white"
              >
                Explore {branch.name} Institutions
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        ) : (
          <Link
            href={href}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white"
          >
            {card.buttonLabel}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}

        {colleges.length > 0 && <CollegeTicker colleges={colleges} />}
      </div>
    </div>
  );
}

/**
 * The college names in the location, drifting upward in a loop. The list is rendered
 * twice so the loop has no gap; the copy is hidden from screen readers. It pauses while
 * the pointer is over it, and stands still (a plain scrollable list) for visitors who
 * ask for reduced motion. Each name links to the college's page.
 */
function CollegeTicker({ colleges }: { colleges: { slug: string; name: string }[] }) {
  // Too few names to be worth scrolling: show them as they are.
  const moving = colleges.length > 4;
  const list = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex flex-col gap-1.5 pb-1.5">
      {colleges.map((college) => (
        <li key={college.slug}>
          <Link
            href={`/college/${college.slug}`}
            tabIndex={hidden ? -1 : undefined}
            className="inline-flex max-w-full items-center gap-2 text-sm text-ink-soft transition-colors hover:text-brand"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span className="truncate">{college.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mt-1 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Institutions here</p>
      <div
        className={`college-ticker relative mt-2 h-32 overflow-hidden ${moving ? "" : "overflow-y-auto"}`}
        style={{ maskImage: "linear-gradient(to bottom, transparent, #000 15%, #000 85%, transparent)" }}
      >
        <div className={moving ? "college-ticker-track" : undefined} style={moving ? { animationDuration: `${colleges.length * 2.5}s` } : undefined}>
          {list(false)}
          {moving && list(true)}
        </div>
      </div>
    </div>
  );
}
