/**
 * Programs and the ranked lists of colleges that hang off them.
 *
 * Three separate-looking asks in the 4 Sep MOM — a program filter on the admin
 * college list, dynamic homepage bands, and "select a program and a ranking
 * type" — are all consumers of this one shape. Modelled once here so the logic
 * is not written three times and left to drift.
 *
 * Kept out of lib/mock-data.ts deliberately: that file is the record set the
 * public site renders (colleges, courses, exams), and this is the editorial
 * layer that arranges those records. Different lifetimes, different owners once
 * the API exists — mock-data becomes the content endpoints, this becomes the
 * rankings endpoints.
 *
 * Shaped as an API response would be, per the plan's §2.2: entities carry ids
 * and slugs, relations are by slug rather than inlined objects, and lists read
 * as collections. Wiring the backend later should be swapping the data source,
 * not rewriting the components that read it.
 */

import { colleges } from "@/lib/mock-data";

/** A field of study. `stream` matches College.stream, which is the join. */
export type Program = {
  slug: string;
  name: string;
  stream: string;
};

/**
 * The kind of ranking, not the ranking itself.
 *
 * `scope` drives what `RankingList.scopeValue` means and what the admin form
 * asks for: a city name, nothing at all, an authority, or an exam slug.
 */
export type RankingType = {
  slug: string;
  name: string;
  scope: "city" | "national" | "authority" | "exam";
};

/**
 * One ranking configuration — what the MOM means by "the admin selects the
 * program and the ranking type": *Management + NIRF*, *Engineering + Top in
 * Bengaluru*, *Management + CAT-based*.
 *
 * A college appears in many lists at different ranks, which is why entries are
 * their own collection rather than an array on the list.
 */
export type RankingList = {
  slug: string;
  programSlug: string;
  rankingTypeSlug: string;
  name: string;
  /** City name, authority or exam slug, per the ranking type's scope. Empty for national. */
  scopeValue: string;
  updatedAt: string;
};

/**
 * A college's place in one ranking list.
 *
 * `isPinned` and `priority` are what satisfy the MOM's "option to add specific
 * colleges to the list, by priority or ranking": a pinned entry sorts above
 * everything computed, so an editor can promote a college into a homepage slot
 * without touching the underlying ranking.
 */
export type RankingEntry = {
  rankingListSlug: string;
  collegeSlug: string;
  rank: number;
  isPinned: boolean;
  /** Order among pinned entries; ignored when isPinned is false. */
  priority: number;
};

export const programs: Program[] = [
  { slug: "management", name: "Management", stream: "Management" },
  { slug: "engineering", name: "Engineering", stream: "Engineering" },
  { slug: "medical", name: "Medical", stream: "Medical" },
  { slug: "law", name: "Law", stream: "Law" },
  { slug: "science", name: "Science", stream: "Science" },
  { slug: "commerce", name: "Commerce", stream: "Commerce" },
];

export const rankingTypes: RankingType[] = [
  { slug: "top-in-city", name: "Top colleges in a city", scope: "city" },
  { slug: "top-in-india", name: "Top colleges in India", scope: "national" },
  { slug: "authority", name: "Authority ranking", scope: "authority" },
  { slug: "exam-based", name: "Exam-based ranking", scope: "exam" },
];

export const rankingLists: RankingList[] = [
  {
    slug: "management-nirf",
    programSlug: "management",
    rankingTypeSlug: "authority",
    name: "NIRF Management Rankings",
    scopeValue: "NIRF",
    updatedAt: "2 Sep 2026",
  },
  {
    slug: "management-cat",
    programSlug: "management",
    rankingTypeSlug: "exam-based",
    name: "Top MBA Colleges Accepting CAT",
    scopeValue: "cat",
    updatedAt: "28 Aug 2026",
  },
  {
    slug: "management-bengaluru",
    programSlug: "management",
    rankingTypeSlug: "top-in-city",
    name: "Top Management Colleges in Bengaluru",
    scopeValue: "Bengaluru",
    updatedAt: "19 Aug 2026",
  },
  {
    slug: "engineering-india",
    programSlug: "engineering",
    rankingTypeSlug: "top-in-india",
    name: "Top Engineering Colleges in India",
    scopeValue: "",
    updatedAt: "1 Sep 2026",
  },
  {
    slug: "engineering-nirf",
    programSlug: "engineering",
    rankingTypeSlug: "authority",
    name: "NIRF Engineering Rankings",
    scopeValue: "NIRF",
    updatedAt: "26 Aug 2026",
  },
  {
    slug: "medical-neet",
    programSlug: "medical",
    rankingTypeSlug: "exam-based",
    name: "Top Medical Colleges Accepting NEET UG",
    scopeValue: "neet-ug",
    updatedAt: "30 Aug 2026",
  },
];

/**
 * Entries, flat rather than nested under their list — the shape a join table
 * returns, and the shape the admin editor reorders in place.
 *
 * Eastwind is pinned to the top of the NIRF management list even though BIMS
 * outranks it there on paper; that pin is the editorial override the MOM asks
 * for, and it demonstrates the mechanism on screen.
 */
export const rankingEntries: RankingEntry[] = [
  { rankingListSlug: "management-nirf", collegeSlug: "eastwind-institute-of-management", rank: 22, isPinned: true, priority: 1 },
  { rankingListSlug: "management-nirf", collegeSlug: "bengaluru-institute-of-management-studies", rank: 34, isPinned: false, priority: 0 },
  { rankingListSlug: "management-nirf", collegeSlug: "horizon-school-of-business", rank: 41, isPinned: false, priority: 0 },

  { rankingListSlug: "management-cat", collegeSlug: "bengaluru-institute-of-management-studies", rank: 1, isPinned: false, priority: 0 },
  { rankingListSlug: "management-cat", collegeSlug: "eastwind-institute-of-management", rank: 2, isPinned: false, priority: 0 },
  { rankingListSlug: "management-cat", collegeSlug: "horizon-school-of-business", rank: 3, isPinned: false, priority: 0 },

  { rankingListSlug: "management-bengaluru", collegeSlug: "bengaluru-institute-of-management-studies", rank: 1, isPinned: false, priority: 0 },

  { rankingListSlug: "engineering-india", collegeSlug: "kaveri-institute-of-technology", rank: 1, isPinned: false, priority: 0 },
  { rankingListSlug: "engineering-india", collegeSlug: "northgate-college-of-engineering", rank: 2, isPinned: false, priority: 0 },

  { rankingListSlug: "engineering-nirf", collegeSlug: "kaveri-institute-of-technology", rank: 48, isPinned: false, priority: 0 },
  { rankingListSlug: "engineering-nirf", collegeSlug: "northgate-college-of-engineering", rank: 63, isPinned: false, priority: 0 },

  { rankingListSlug: "medical-neet", collegeSlug: "sanjeevani-medical-college", rank: 1, isPinned: false, priority: 0 },
  { rankingListSlug: "medical-neet", collegeSlug: "meridian-institute-of-medical-sciences", rank: 2, isPinned: false, priority: 0 },
];

/* ------------------------------------------------------------------ *
 * Selectors
 *
 * The "pick a program, pick a ranking, get colleges" logic the plan warns
 * against writing three times. Every screen calls these rather than filtering
 * the arrays itself, so when the API arrives there is one place to change.
 * ------------------------------------------------------------------ */

export const programBySlug = (slug: string) => programs.find((p) => p.slug === slug);

export const rankingTypeBySlug = (slug: string) =>
  rankingTypes.find((t) => t.slug === slug);

export const rankingListBySlug = (slug: string) =>
  rankingLists.find((l) => l.slug === slug);

/** Ranking configurations for one program — what the list selector offers. */
export const rankingListsForProgram = (programSlug: string) =>
  rankingLists.filter((list) => list.programSlug === programSlug);

/** Colleges in a program, via the stream join. Drives the admin program filter. */
export const collegesInProgram = (programSlug: string) => {
  const program = programBySlug(programSlug);
  if (!program) return [];
  return colleges.filter((college) => college.stream === program.stream);
};

/**
 * A ranking list resolved to college records, in display order.
 *
 * Pinned entries first, by priority; everything else by rank. That ordering is
 * the whole point of `isPinned` — an editor promotes a college into a homepage
 * slot without editing the ranking it came from.
 *
 * Entries whose college no longer exists are dropped rather than rendered as a
 * gap: a ranking list outliving a deleted college is exactly what happens once
 * this is a real join table.
 */
export const rankedColleges = (rankingListSlug: string) =>
  rankingEntries
    .filter((entry) => entry.rankingListSlug === rankingListSlug)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isPinned && b.isPinned) return a.priority - b.priority;
      return a.rank - b.rank;
    })
    .map((entry) => ({
      entry,
      college: colleges.find((college) => college.slug === entry.collegeSlug),
    }))
    .filter((row): row is { entry: RankingEntry; college: (typeof colleges)[number] } =>
      row.college !== undefined,
    );

/** How many colleges a list holds — shown on the rankings table. */
export const rankingListSize = (rankingListSlug: string) =>
  rankingEntries.filter((entry) => entry.rankingListSlug === rankingListSlug).length;

/**
 * Human-readable scope, for tables and section summaries.
 * A national list has no scope value, so it reads as its type name alone.
 */
export const describeScope = (list: RankingList) => {
  const type = rankingTypeBySlug(list.rankingTypeSlug);
  if (!type) return list.scopeValue;
  if (type.scope === "national") return "India";
  if (type.scope === "exam") return list.scopeValue.toUpperCase().replace(/-/g, " ");
  return list.scopeValue;
};

/* ------------------------------------------------------------------ *
 * Homepage college bands (MOM §1.7)
 * ------------------------------------------------------------------ */

/**
 * One "Top Colleges" / "Recommended Colleges" / "Popular Colleges" band on the
 * homepage.
 *
 * Repeatable rather than three fixed slots — the 5 Sep decision on §11 Q7. The
 * MOM reads as a rename, but it lists all three names together, which only
 * makes sense if several such bands can coexist. Repeatable covers the rename
 * case too; fixed slots would not cover this one.
 *
 * A band binds to a ranking list, so it inherits that list's order and pins
 * rather than keeping a second copy of the ordering. `manualSlugs` is the
 * editorial layer on top: colleges named here lead the band regardless of where
 * the ranking put them.
 */
export type CollegeBand = {
  id: string;
  heading: string;
  subheading: string;
  programSlug: string;
  rankingListSlug: string;
  /** Colleges promoted into this band by hand, in the order given. */
  manualSlugs: string[];
  /** How many cards the band shows. */
  limit: number;
  isVisible: boolean;
};

export const homepageBands: CollegeBand[] = [
  {
    id: "top-colleges",
    heading: "Top Colleges",
    subheading: "Colleges Cherry Picked For You",
    programSlug: "management",
    rankingListSlug: "management-nirf",
    manualSlugs: [],
    limit: 6,
    isVisible: true,
  },
  /*
    Recommended and Popular are switched off at the client's request (5 Sep):
    they are to stay hidden until the rankings behind them are real.

    Left in place rather than deleted — they are the demonstration that bands
    are repeatable, and the homepage editor can switch either back on without a
    code change, which is the whole point of the band model.
  */
  {
    id: "recommended-colleges",
    heading: "Recommended Colleges",
    subheading: "Engineering colleges matched to your search",
    programSlug: "engineering",
    rankingListSlug: "engineering-india",
    manualSlugs: [],
    limit: 6,
    isVisible: false,
  },
  {
    id: "popular-colleges",
    heading: "Popular Colleges",
    subheading: "Most viewed medical colleges this month",
    programSlug: "medical",
    rankingListSlug: "medical-neet",
    manualSlugs: ["meridian-institute-of-medical-sciences"],
    limit: 6,
    isVisible: false,
  },
];

/**
 * Resolves a band to the colleges it displays.
 *
 * Manual picks first, in the order the editor put them, then the ranking list's
 * own order with those already used removed — so promoting a college moves it
 * up rather than showing it twice. Truncated to the band's limit last, which is
 * what makes a manual pick actually guarantee a slot.
 */
export const bandColleges = (band: CollegeBand) => {
  const ranked = rankedColleges(band.rankingListSlug).map((row) => row.college);

  const manual = band.manualSlugs
    .map((slug) => colleges.find((college) => college.slug === slug))
    .filter((college): college is (typeof colleges)[number] => college !== undefined);

  const used = new Set(manual.map((college) => college.slug));
  return [...manual, ...ranked.filter((college) => !used.has(college.slug))].slice(0, band.limit);
};
