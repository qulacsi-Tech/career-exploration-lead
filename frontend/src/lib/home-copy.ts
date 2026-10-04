/**
 * Homepage copy: the hero, the locations heading and the streams heading.
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

export type HomeCopy = {
  hero: {
    headline: string;
    subheadline: string;
    searchPlaceholder: string;
    searchButton: string;
  };
  locations: SectionCopy;
  streams: SectionCopy;
};

export const DEFAULT_HOME_COPY: HomeCopy = {
  hero: {
    headline: "Find Colleges, Courses & Exams That Are Best For You",
    subheadline: "Search 30,000+ colleges, compare fees and placements, and get free counselling from admission experts.",
    searchPlaceholder: "Search by college, course or exam",
    searchButton: "Search",
  },
  locations: { eyebrow: "Destination hubs", heading: "Where Ambition Meets", accent: "Opportunity", subheading: "" },
  streams: {
    eyebrow: "",
    heading: "Chart Your Discipline.",
    accent: "Shape Your Tomorrow.",
    subheading: "Pick a stream to see its colleges, entrance exams, fees and placement records.",
  },
};
