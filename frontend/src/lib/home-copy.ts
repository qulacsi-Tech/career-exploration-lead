/**
 * Homepage copy: the hero, every section heading and the promo banner.
 *
 * The API serves these from storage and the admin edits them. The values here
 * are the fallback for when the API cannot be reached, so the page still reads
 * correctly. They match the seed the database starts from.
 */

export type SectionCopy = {
  eyebrow: string;
  heading: string;
  accent: string;
  subheading: string;
};

/** Heading and labels for a rotating-card section (recommended programmes or colleges). */
export type StoryCopy = {
  heading: string;
  accent: string;
  /** Small line above each card's headline. Used by the programmes row. */
  itemEyebrow: string;
  /** Line under each card's headline. Used by the colleges row. */
  itemSubline: string;
  buttonLabel: string;
};

/** The fixed labels on each location card. */
export type LocationCardCopy = {
  /** Text after the college count, e.g. "Ranked Institutions". */
  institutionsLabel: string;
  /** Label above the average package. */
  ctcLabel: string;
  buttonLabel: string;
};

/** The fixed words on the Top Colleges cards and their View all button. */
export type CollegeCardCopy = {
  buttonLabel: string;
  viewAllLabel: string;
};

/** The fixed words on the Top Exams cards and their View all button. */
export type ExamCardCopy = {
  cutoffLabel: string;
  answerKeyLabel: string;
  buttonLabel: string;
  viewAllLabel: string;
};

export type PromoBannerCopy = {
  heading: string;
  buttonLabel: string;
  buttonHref: string;
  /** Relative path under /api/uploads, or empty for the built-in picture. */
  image: string;
  imageAlt: string;
};

export type HomeCopy = {
  hero: {
    headline: string;
    subheadline: string;
    searchPlaceholder: string;
    searchButton: string;
    /** Relative path under /api/uploads, or empty for the built-in illustration. */
    image: string;
    imageAlt: string;
  };
  locations: SectionCopy;
  streams: SectionCopy;
  locationCard: LocationCardCopy;
  collegeCard: CollegeCardCopy;
  examCard: ExamCardCopy;
  topExams: SectionCopy;
  programs: StoryCopy;
  careers: SectionCopy;
  promoBanner: PromoBannerCopy;
  universities: StoryCopy;
  data: SectionCopy;
  articles: SectionCopy;
};

export type HomeCopyPart = keyof HomeCopy;

export const DEFAULT_HOME_COPY: HomeCopy = {
  hero: {
    headline: "Find Colleges, Courses & Exams That Are Best For You",
    subheadline: "Search 30,000+ colleges, compare fees and placements, and get free counselling from admission experts.",
    searchPlaceholder: "Search by college, course or exam",
    searchButton: "Search",
    image: "",
    imageAlt: "",
  },
  locations: { eyebrow: "Destination hubs", heading: "Where Ambition Meets", accent: "Opportunity", subheading: "" },
  streams: {
    eyebrow: "",
    heading: "Chart Your Discipline.",
    accent: "Shape Your Tomorrow.",
    subheading: "Pick a stream to see its colleges, entrance exams, fees and placement records.",
  },
  locationCard: { institutionsLabel: "Ranked Institutions", ctcLabel: "Average CTC", buttonLabel: "Explore Colleges" },
  collegeCard: { buttonLabel: "Courses & fees", viewAllLabel: "View All" },
  examCard: { cutoffLabel: "Cutoff", answerKeyLabel: "Answer key", buttonLabel: "Read more", viewAllLabel: "View All" },
  topExams: { eyebrow: "", heading: "Top Exams", accent: "", subheading: "Exams Cherry Picked For You" },
  programs: {
    heading: "Recommended",
    accent: "Colleges",
    itemEyebrow: "Online & On-campus",
    itemSubline: "",
    buttonLabel: "Explore this program",
  },
  careers: {
    eyebrow: "",
    heading: "Explore Careers",
    accent: "",
    subheading: "Explore your preferred streams to learn about the relevant colleges, exams and more!",
  },
  promoBanner: {
    heading: "Browse through our list of popular programs and universities",
    buttonLabel: "Discover More",
    buttonHref: "/colleges",
    image: "",
    imageAlt: "",
  },
  universities: {
    heading: "Recommended",
    accent: "Colleges",
    itemEyebrow: "",
    itemSubline: "Accredited programs, verified placement records and open intakes.",
    buttonLabel: "Know more",
  },
  data: {
    eyebrow: "",
    heading: "Data",
    accent: "",
    subheading:
      "We simplify information for you on over 30,000 colleges, 500 exams and 500 courses across domains and regions all over India",
  },
  articles: { eyebrow: "", heading: "Latest News &", accent: "Updates", subheading: "" },
};

/**
 * The API's copy laid over the defaults, section by section. A response from an
 * older backend that lacks a newer section still renders with its default
 * wording instead of crashing the page.
 */
export function mergeHomeCopy(stored: Partial<HomeCopy> | null | undefined): HomeCopy {
  const merged = { ...DEFAULT_HOME_COPY } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_HOME_COPY) as HomeCopyPart[]) {
    merged[key] = { ...DEFAULT_HOME_COPY[key], ...(stored?.[key] ?? {}) };
  }
  return merged as HomeCopy;
}
