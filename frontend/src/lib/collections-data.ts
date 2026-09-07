/**
 * Collections — curated, SEO-addressable groups of colleges.
 *
 * ## Why this exists
 *
 * Four things on this site were four unrelated pieces of code that all answered
 * the same question, "which colleges belong under this heading":
 *
 *   - homepage bands        (a `CollegeBand`, edited in a Sections tab)
 *   - footer link columns   (a hardcoded array of strings, every href="#")
 *   - city pages            (/location/[slug])
 *   - stream pages          (/[stream]/colleges)
 *
 * A collection is that question asked once. "Top MBA Colleges", "MBA Colleges
 * in Bangalore" and "B.Tech Colleges" are not three kinds of thing — they are
 * three collections with different scopes. Once a collection has its own slug
 * and its own SEO fields, the footer is just a list of them and clicking one
 * lands on a real page.
 *
 * ## The rule that keeps this from becoming a mess
 *
 * A collection stores *which* colleges it holds. It does not store what order
 * they rank in — that stays in Rankings, and a collection points at a ranking
 * list rather than keeping a second copy of it. This is the principle
 * `CollegeBand` was built on, kept: membership and ordering are different
 * decisions with different owners, and merging them gives you two screens that
 * disagree about the same list the first time either is edited.
 *
 * ## Composition
 *
 *   colleges     the members, chosen explicitly by an editor
 *   scope        what the collection is a category of — metadata, and the
 *                filter that narrows the picker when choosing members
 *   ordering     a ranking list, or the order they were chosen in
 *
 * Membership is a decision, not a query. An editor ticks the colleges that
 * belong and nothing else appears — no college is added to a live page by a
 * rule firing later. The trade is that a college added to the directory joins
 * no collection until someone puts it in one, which is the intended behaviour:
 * these pages are curated, and a silent auto-insert onto a page carrying paid
 * placements is the failure worth avoiding.
 *
 * `scope` survives that change because it still earns its place. It says what
 * the collection *is* — the badges on the list, the words in
 * `describeCollectionScope`, the overlap check that protects the canonical —
 * and it filters the checklist down from the whole directory when an editor is
 * choosing members.
 *
 * Shaped as an API response per the plan's §2.2 — ids and slugs, relations by
 * slug, lists that read as collections — so wiring the backend later is
 * swapping the data source, not rewriting the screens that read it.
 */

import { colleges, locations, exams, courses } from "@/lib/mock-data";
import type { College } from "@/lib/mock-data";
import { matchesCity } from "@/lib/location-match";
import {
  programBySlug,
  rankedColleges,
  rankingListBySlug,
  collegesInProgram,
} from "@/lib/rankings-data";
import { docFromParagraphs, emptyDoc, type RichTextDoc } from "@/lib/rich-text";

/**
 * What defines membership, before the editorial layer.
 *
 * Every field optional and AND-ed: a collection with no scope at all is the
 * whole directory, which is a legitimate thing to want ("All Colleges") and
 * needs no special case.
 */
export type CollectionScope = {
  programSlug?: string;
  locationSlug?: string;
  /** Exam slug from mock-data's `exams`; joined against College.examsAccepted. */
  examSlug?: string;
  /** Course slug from mock-data's `courses`; joined against College.courses[].name. */
  courseSlug?: string;
};

/** Where a collection surfaces on the public site. */
export type CollectionPlacements = {
  /**
   * A homepage band. This is what `CollegeBand` used to be — a band is no
   * longer its own entity, it is a collection *placed* on the homepage, which
   * is why the homepage editor shrank to picking collections and setting how
   * many cards each shows.
   */
  homepage?: { order: number; limit: number; isVisible: boolean };
  /** A link in a footer column. `column` is the column heading. */
  footer?: { column: string; order: number };
};

export type CollectionSeo = {
  metaTitle: string;
  metaDescription: string;
  /**
   * Set when this collection deliberately overlaps a page that already owns the
   * keyword — a city collection alongside /location/[slug]. Points search
   * engines at the original rather than letting the two compete. See
   * `canonicalFor`, which fills this in automatically when it is left blank.
   */
  canonical?: string;
  /** Body copy above the listing. Optional — many collections are a list alone. */
  intro: RichTextDoc;
  faqs: { question: string; answer: string }[];
};

export type Collection = {
  id: string;
  /** Resolves to /colleges/<slug>. Must be unique; see `slugConflicts`. */
  slug: string;
  /** The public H1, and the label used in the footer. */
  title: string;
  /**
   * The homepage band heading, when it should read differently from the page
   * title — "Top Colleges" on the homepage, "Top MBA Colleges in India" as a
   * page title that has to carry the keyword. Blank falls back to `title`.
   */
  heading: string;
  subheading: string;

  /**
   * What this collection is a category of. Filters are AND-ed and all optional.
   *
   * Does NOT decide membership — see `collegeSlugs`. It labels the collection,
   * drives the duplicate-page check behind the canonical, and narrows the
   * checklist an editor picks members from.
   */
  scope: CollectionScope;

  /**
   * The members, in the order the editor chose them.
   *
   * This is the whole membership. A college not named here does not appear,
   * whatever the scope matches.
   */
  collegeSlugs: string[];

  /**
   * Ordering source. Blank keeps the order above.
   *
   * A bound ranking reorders the chosen colleges by their rank in it; chosen
   * colleges the ranking does not contain follow, still in the editor's order.
   * It never adds a college — ordering and membership stay separate concerns,
   * which is what lets the ordering live in Rankings without that screen
   * silently changing what is on a page.
   */
  rankingListSlug: string;

  seo: CollectionSeo;
  placements: CollectionPlacements;
  isPublished: boolean;
  updatedAt: string;
};

/* ------------------------------------------------------------------ *
 * Records
 * ------------------------------------------------------------------ */

/**
 * The three homepage bands, migrated from `homepageBands` in lib/rankings-data,
 * plus the footer links from components/site-footer — which were plain strings
 * pointing at "#" and are now real destinations.
 *
 * Visibility is carried over exactly: Recommended and Popular stay switched off
 * per the client's 5 Sep instruction that they wait until the rankings behind
 * them are real. They are kept rather than deleted for the same reason as
 * before — they demonstrate that the model is repeatable.
 */
export const collections: Collection[] = [
  {
    id: "top-colleges",
    slug: "top-management-colleges",
    title: "Top Management Colleges in India",
    heading: "Top Colleges",
    subheading: "Colleges Cherry Picked For You",
    scope: { programSlug: "management" },
    rankingListSlug: "management-nirf",
    collegeSlugs: [
      "eastwind-institute-of-management",
      "bengaluru-institute-of-management-studies",
      "horizon-school-of-business",
    ],
    seo: {
      metaTitle: "Top Management Colleges in India 2026: Fees, Placements & Rankings",
      metaDescription:
        "NIRF-ranked management colleges in India, compared by fees, placements, accepted exams and reviews.",
      intro: docFromParagraphs(
        "India's management colleges are ranked here by their NIRF standing, with fees, placement averages and accepted entrance exams shown side by side.",
      ),
      faqs: [],
    },
    placements: { homepage: { order: 0, limit: 6, isVisible: true } },
    isPublished: true,
    updatedAt: "2 Sep 2026",
  },
  {
    id: "recommended-colleges",
    slug: "recommended-engineering-colleges",
    title: "Recommended Engineering Colleges",
    heading: "Recommended Colleges",
    subheading: "Engineering colleges matched to your search",
    scope: { programSlug: "engineering" },
    rankingListSlug: "engineering-india",
    collegeSlugs: [
      "kaveri-institute-of-technology",
      "northgate-college-of-engineering",
    ],
    seo: {
      metaTitle: "Recommended Engineering Colleges in India 2026",
      metaDescription:
        "Engineering colleges recommended by our admission counsellors, with fees, placements and cutoffs.",
      intro: emptyDoc(),
      faqs: [],
    },
    placements: { homepage: { order: 1, limit: 6, isVisible: false } },
    isPublished: false,
    updatedAt: "5 Sep 2026",
  },
  {
    id: "popular-colleges",
    slug: "popular-medical-colleges",
    title: "Popular Medical Colleges",
    heading: "Popular Colleges",
    subheading: "Most viewed medical colleges this month",
    scope: { programSlug: "medical" },
    rankingListSlug: "medical-neet",
    collegeSlugs: [
      "meridian-institute-of-medical-sciences",
      "sanjeevani-medical-college",
    ],
    seo: {
      metaTitle: "Popular Medical Colleges in India 2026",
      metaDescription:
        "The medical colleges students are viewing most, with NEET cutoffs, fees and placement detail.",
      intro: emptyDoc(),
      faqs: [],
    },
    placements: { homepage: { order: 2, limit: 6, isVisible: false } },
    isPublished: false,
    updatedAt: "5 Sep 2026",
  },

  /* --- Footer: MBA ------------------------------------------------- */
  {
    id: "top-mba-colleges",
    slug: "top-mba-colleges",
    title: "Top MBA Colleges",
    heading: "",
    subheading: "Ranked MBA programmes across India",
    scope: { programSlug: "management", courseSlug: "mba" },
    rankingListSlug: "management-nirf",
    collegeSlugs: [
      "eastwind-institute-of-management",
      "bengaluru-institute-of-management-studies",
      "horizon-school-of-business",
      "kr-mangalam-university",
    ],
    seo: {
      metaTitle: "Top MBA Colleges in India 2026: Fees, Placements & Cutoffs",
      metaDescription:
        "Compare the top MBA colleges in India by fees, average package, accepted exams and NIRF rank.",
      intro: docFromParagraphs(
        "These are the MBA programmes that rank highest nationally, with total fees, placement averages and the entrance exams each college accepts.",
      ),
      faqs: [],
    },
    placements: { footer: { column: "MBA", order: 0 } },
    isPublished: true,
    updatedAt: "2 Sep 2026",
  },
  {
    id: "mba-colleges-bangalore",
    slug: "mba-colleges-in-bangalore",
    title: "MBA Colleges in Bangalore",
    heading: "",
    subheading: "Management colleges across Bengaluru",
    scope: { programSlug: "management", locationSlug: "bangalore" },
    rankingListSlug: "management-bengaluru",
    collegeSlugs: [
      "bengaluru-institute-of-management-studies",
    ],
    seo: {
      metaTitle: "MBA Colleges in Bangalore 2026: Fees, Placements & Admission",
      metaDescription:
        "Every MBA college in Bangalore compared by fees, placements, accepted exams and student reviews.",
      intro: emptyDoc(),
      faqs: [],
    },
    // Deliberately left blank: `canonicalFor` detects the overlap with
    // /location/bangalore and fills this in, so the two pages do not compete
    // for the same query. See `overlapsExistingPage`.
    placements: { footer: { column: "MBA", order: 1 } },
    isPublished: true,
    updatedAt: "19 Aug 2026",
  },
  {
    id: "mba-colleges-pune",
    slug: "mba-colleges-in-pune",
    title: "MBA Colleges in Pune",
    heading: "",
    subheading: "Management colleges across Pune",
    scope: { programSlug: "management", locationSlug: "pune" },
    rankingListSlug: "",
    collegeSlugs: [
      "eastwind-institute-of-management",
    ],
    seo: {
      metaTitle: "MBA Colleges in Pune 2026: Fees, Placements & Admission",
      metaDescription:
        "MBA colleges in Pune compared by fees, placements, accepted entrance exams and reviews.",
      intro: emptyDoc(),
      faqs: [],
    },
    placements: { footer: { column: "MBA", order: 2 } },
    isPublished: true,
    updatedAt: "19 Aug 2026",
  },
  {
    id: "mba-colleges-cat",
    slug: "mba-colleges-accepting-cat",
    title: "CAT Exam",
    heading: "",
    subheading: "Colleges accepting the Common Admission Test",
    scope: { programSlug: "management", examSlug: "cat" },
    rankingListSlug: "management-cat",
    collegeSlugs: [
      "bengaluru-institute-of-management-studies",
      "eastwind-institute-of-management",
      "horizon-school-of-business",
      "kr-mangalam-university",
    ],
    seo: {
      metaTitle: "MBA Colleges Accepting CAT 2026: Cutoffs, Fees & Placements",
      metaDescription:
        "Colleges that admit through CAT, with sectional cutoffs, total fees and placement records.",
      intro: emptyDoc(),
      faqs: [],
    },
    placements: { footer: { column: "MBA", order: 4 } },
    isPublished: true,
    updatedAt: "28 Aug 2026",
  },

  /* --- Footer: Engineering ----------------------------------------- */
  {
    id: "top-engineering-colleges",
    slug: "top-engineering-colleges",
    title: "Top Engineering Colleges",
    heading: "",
    subheading: "Ranked engineering colleges across India",
    scope: { programSlug: "engineering" },
    rankingListSlug: "engineering-india",
    collegeSlugs: [
      "kaveri-institute-of-technology",
      "northgate-college-of-engineering",
    ],
    seo: {
      metaTitle: "Top Engineering Colleges in India 2026: Fees, Placements & Cutoffs",
      metaDescription:
        "The highest-ranked engineering colleges in India, compared by fees, placements and JEE cutoffs.",
      intro: emptyDoc(),
      faqs: [],
    },
    placements: { footer: { column: "Engineering", order: 0 } },
    isPublished: true,
    updatedAt: "1 Sep 2026",
  },
  {
    id: "btech-colleges",
    slug: "btech-colleges",
    title: "B.Tech Colleges",
    heading: "",
    subheading: "Colleges offering the B.Tech degree",
    scope: { programSlug: "engineering", courseSlug: "b-tech" },
    rankingListSlug: "engineering-nirf",
    collegeSlugs: [
      "kaveri-institute-of-technology",
      "northgate-college-of-engineering",
    ],
    seo: {
      metaTitle: "B.Tech Colleges in India 2026: Fees, Placements & Admission",
      metaDescription:
        "B.Tech colleges compared by total fees, placement averages, accepted exams and approvals.",
      intro: emptyDoc(),
      faqs: [],
    },
    placements: { footer: { column: "Engineering", order: 1 } },
    isPublished: true,
    updatedAt: "26 Aug 2026",
  },
];

/* ------------------------------------------------------------------ *
 * Scope resolution
 * ------------------------------------------------------------------ */

/** Case- and punctuation-insensitive compare, for the string joins below. */
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Does a college accept the exam identified by `examSlug`?
 *
 * `College.examsAccepted` holds display names ("CAT", "NEET UG") while exams
 * carry slugs ("cat", "karnataka-pgcet"), so this normalises both sides rather
 * than comparing them raw. The exam's full name is checked too — "Common
 * Admission Test (CAT)" against a record that only writes "CAT" — by testing
 * whether either string contains the other once normalised.
 *
 * Same category of workaround as the city aliases, and the same fix: a real
 * join table the moment colleges and exams are rows rather than literals.
 */
const acceptsExam = (college: College, examSlug: string) => {
  const exam = exams.find((e) => e.slug === examSlug);
  const target = normalise(examSlug);
  const examName = exam ? normalise(exam.name) : "";

  return college.examsAccepted.some((accepted) => {
    const value = normalise(accepted);
    if (value === target) return true;
    return examName !== "" && (examName.includes(value) || value.includes(examName));
  });
};

/** Does a college run the course identified by `courseSlug`? */
const offersCourse = (college: College, courseSlug: string) => {
  const course = courses.find((c) => c.slug === courseSlug);
  if (!course) return false;
  const target = normalise(course.name);
  const slugTarget = normalise(courseSlug);

  return college.courses.some((offered) => {
    const value = normalise(offered.name);
    return value.includes(target) || value.includes(slugTarget) || target.includes(value);
  });
};

/**
 * Every college matching a scope, in directory order.
 *
 * Filters are AND-ed, and an unset filter is not a filter — an empty scope
 * returns the whole directory rather than nothing, which is what makes an
 * "All Colleges" collection work without a special case.
 *
 * A filter naming something that does not exist (a deleted location, a renamed
 * program) returns no colleges rather than being ignored. Silently widening a
 * scope would put colleges on a page whose heading does not describe them.
 */
export const collegesInScope = (scope: CollectionScope): College[] => {
  let rows = colleges;

  if (scope.programSlug) {
    rows = programBySlug(scope.programSlug) ? collegesInProgram(scope.programSlug) : [];
  }

  if (scope.locationSlug) {
    const location = locations.find((l) => l.slug === scope.locationSlug);
    rows = location
      ? rows.filter((college) => matchesCity(location.slug, location.name, college.city))
      : [];
  }

  if (scope.examSlug) {
    const slug = scope.examSlug;
    rows = exams.some((e) => e.slug === slug)
      ? rows.filter((college) => acceptsExam(college, slug))
      : [];
  }

  if (scope.courseSlug) {
    const slug = scope.courseSlug;
    rows = courses.some((c) => c.slug === slug)
      ? rows.filter((college) => offersCourse(college, slug))
      : [];
  }

  return rows;
};

/* ------------------------------------------------------------------ *
 * Membership
 * ------------------------------------------------------------------ */

const collegeBySlug = (slug: string) => colleges.find((college) => college.slug === slug);

/**
 * A collection resolved to the colleges it shows, in display order.
 *
 * Membership is exactly `collegeSlugs` — the scope is not consulted here. An
 * editor's selection is the answer, so a college joins a live page only when
 * somebody puts it there, and a scope edited later cannot quietly add or drop
 * one.
 *
 * Order comes from the bound ranking when there is one: chosen colleges the
 * ranking knows about lead, in its order (pins in the ranking included, which is
 * how the Rankings screen still influences what leads a band); the rest follow
 * in the order the editor chose them. Without a ranking it is the editor's order
 * alone.
 *
 * A named college that no longer exists is dropped rather than rendered as a
 * gap — a collection outliving a deleted college is exactly what happens once
 * this is a real join table.
 *
 * `limit` defaults to the homepage placement's card count when there is one, and
 * to unlimited otherwise — a listing page shows everything, a band shows six.
 */
export const collectionColleges = (
  collection: Collection,
  options: { limit?: number } = {},
): College[] => {
  const chosen = collection.collegeSlugs
    .map(collegeBySlug)
    .filter((college): college is College => college !== undefined);

  let ordered = chosen;
  if (collection.rankingListSlug) {
    const rank = new Map(
      rankedColleges(collection.rankingListSlug).map((row, index) => [row.college.slug, index]),
    );
    // Stable partition rather than a sort with a fallback: chosen colleges the
    // ranking does not list keep the editor's order among themselves instead of
    // being shuffled by whatever sentinel rank they were given.
    const ranked = chosen
      .filter((college) => rank.has(college.slug))
      .sort((a, b) => rank.get(a.slug)! - rank.get(b.slug)!);
    const unranked = chosen.filter((college) => !rank.has(college.slug));
    ordered = [...ranked, ...unranked];
  }

  const limit = options.limit ?? collection.placements.homepage?.limit;
  return typeof limit === "number" ? ordered.slice(0, limit) : ordered;
};

/**
 * Chosen colleges the scope would not have described.
 *
 * Not an error — the scope does not gate membership, and putting a strong
 * out-of-city college on a city page is a real editorial move. It is surfaced in
 * the editor because it is also exactly what a mis-click looks like, and the
 * editor is the one who can tell which.
 */
export const selectionOutsideScope = (collection: Collection): string[] => {
  const inScope = new Set(collegesInScope(collection.scope).map((college) => college.slug));
  return collection.collegeSlugs.filter((slug) => !inScope.has(slug));
};

/* ------------------------------------------------------------------ *
 * Reverse index — the badges
 * ------------------------------------------------------------------ */

/**
 * Which collections a college appears in — the badges on its admin record.
 *
 * A membership list read directly now that membership is stored rather than
 * computed. Deliberately ignores each collection's card limit: a college is in a
 * collection whether or not it made the homepage band's top six, and a badge
 * saying otherwise would be describing a placement, not a membership.
 */
export const collectionsFor = (collegeSlug: string): Collection[] =>
  collections.filter((collection) => collection.collegeSlugs.includes(collegeSlug));

/* ------------------------------------------------------------------ *
 * Placements
 * ------------------------------------------------------------------ */

/** Homepage bands, in editor order. Unpublished and hidden ones are dropped. */
export const homepageCollections = () =>
  collections
    .filter((collection) => collection.isPublished && collection.placements.homepage?.isVisible)
    .sort((a, b) => (a.placements.homepage!.order - b.placements.homepage!.order))
    .map((collection) => ({
      collection,
      colleges: collectionColleges(collection),
    }))
    // A band bound to an empty scope renders as a heading over nothing, so it is
    // dropped rather than shown hollow. Carried over from the old band logic.
    .filter(({ colleges: rows }) => rows.length > 0);

/**
 * Footer columns, built from the collections placed in them.
 *
 * Column order follows the order of first appearance in `collections`, which
 * keeps MBA left of Engineering without a second list to maintain. The static
 * "Company" column (About, Contact, Privacy, Terms) is not collections and stays
 * in the footer component.
 */
export const footerColumns = () => {
  const columns = new Map<string, { label: string; href: string; order: number }[]>();

  for (const collection of collections) {
    const placement = collection.placements.footer;
    if (!placement || !collection.isPublished) continue;

    const links = columns.get(placement.column) ?? [];
    links.push({
      label: collection.title,
      href: collectionHref(collection),
      order: placement.order,
    });
    columns.set(placement.column, links);
  }

  return [...columns.entries()].map(([title, links]) => ({
    title,
    links: links.sort((a, b) => a.order - b.order),
  }));
};

/* ------------------------------------------------------------------ *
 * Routing, SEO and editor guardrails
 * ------------------------------------------------------------------ */

export const collectionHref = (collection: Collection) => `/colleges/${collection.slug}`;

export const collectionBySlug = (slug: string) =>
  collections.find((collection) => collection.slug === slug);

/** Published collections only — what /colleges/[slug] is allowed to serve. */
export const publishedCollections = () =>
  collections.filter((collection) => collection.isPublished);

/**
 * The page that already owns this collection's keyword, if there is one.
 *
 * A collection scoped to nothing but a location duplicates /location/[slug]; one
 * scoped to nothing but a program duplicates /[stream]/colleges. Both serve
 * near-identical college sets, and left alone the two URLs compete for the same
 * query with Google picking whichever it prefers.
 *
 * Only an *exact* single-filter match counts. "MBA Colleges in Bangalore" is
 * program + location — genuinely narrower than the city page, a page worth
 * having on its own, and not flagged.
 */
export const overlapsExistingPage = (collection: Collection): string | null => {
  const { programSlug, locationSlug, examSlug, courseSlug } = collection.scope;
  const filters = [programSlug, locationSlug, examSlug, courseSlug].filter(Boolean);
  if (filters.length !== 1) return null;

  if (locationSlug && locations.some((l) => l.slug === locationSlug)) {
    return `/location/${locationSlug}`;
  }
  if (programSlug && programBySlug(programSlug)) {
    return `/${programSlug}/colleges`;
  }
  return null;
};

/**
 * The canonical URL for a collection's page.
 *
 * An explicit `seo.canonical` wins. Otherwise an overlapping page claims it, so
 * the default is safe: an editor who builds "Colleges in Pune" without thinking
 * about canonicals does not silently cannibalise the city page that already
 * ranks for it.
 */
export const canonicalFor = (collection: Collection) =>
  collection.seo.canonical || overlapsExistingPage(collection) || collectionHref(collection);

/**
 * Slugs claimed by more than one collection.
 *
 * Two collections on one URL means one is unreachable, and which one wins
 * depends on array order — the sort of bug that is invisible until a page
 * quietly serves the wrong content. Surfaced in the admin list rather than left
 * for the route to arbitrate.
 */
export const slugConflicts = (): string[] => {
  const seen = new Set<string>();
  const clashes = new Set<string>();
  for (const collection of collections) {
    if (seen.has(collection.slug)) clashes.add(collection.slug);
    seen.add(collection.slug);
  }
  return [...clashes];
};

/**
 * Why a collection cannot be published, or null when it can.
 *
 * A published collection is an indexed page, so an empty one is worse than a
 * hidden homepage band: the band just does not render, while the page is a live
 * URL serving a heading over nothing. Checked at publish time rather than
 * hidden at render time.
 */
export const publishBlocker = (collection: Collection): string | null => {
  if (!collection.slug.trim()) return "Needs a URL slug.";
  if (!collection.title.trim()) return "Needs a title.";
  if (collection.collegeSlugs.length === 0) {
    return "No colleges chosen — select at least one.";
  }
  if (!collection.seo.metaTitle.trim()) return "Needs a meta title.";
  return null;
};

/**
 * The scope in words, for admin tables and the badges on a college record —
 * "Management · Bangalore · CAT". Empty scope reads as the whole directory.
 */
export const describeCollectionScope = (scope: CollectionScope): string => {
  const parts: string[] = [];

  if (scope.programSlug) parts.push(programBySlug(scope.programSlug)?.name ?? scope.programSlug);
  if (scope.locationSlug) {
    parts.push(locations.find((l) => l.slug === scope.locationSlug)?.name ?? scope.locationSlug);
  }
  if (scope.examSlug) {
    const exam = exams.find((e) => e.slug === scope.examSlug);
    // The short form: "Common Admission Test (CAT)" is too long for a table cell.
    parts.push(exam ? exam.name.replace(/^.*\(([^)]+)\)$/, "$1") : scope.examSlug.toUpperCase());
  }
  if (scope.courseSlug) {
    parts.push(courses.find((c) => c.slug === scope.courseSlug)?.name ?? scope.courseSlug);
  }

  return parts.length > 0 ? parts.join(" · ") : "All colleges";
};

/** The ordering source in words, for the admin table. */
export const describeOrdering = (collection: Collection) => {
  if (!collection.rankingListSlug) return "Directory order";
  return rankingListBySlug(collection.rankingListSlug)?.name ?? "Unbound ranking";
};
