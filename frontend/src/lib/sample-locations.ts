import { getLocation, type HomeLocation, type Location } from "@/lib/api";

// ── Sample destinations ────────────────────────────────────────────────────────
// Shown only when the admin has no active destination cards (see Home() below). They are
// illustrative: the fee ranges are not sourced. As soon as one location is active, these
// disappear and the admin's own cards take over.
export const STATIC_LOCATIONS: HomeLocation[] = [
  {
    slug: "bangalore", name: "Bangalore", state: "Karnataka", collegeCount: 214,
    labels: ["Silicon Valley of India", "Top Startup Ecosystem"],
    description: "Global epicenter for IT, Artificial Intelligence, Product Startups & Tech Giants.",
    avgPackage: "₹8.5 - 24 LPA", image: "/images/locations/bangalore.jpg",
    courseFees: [{ category: "MBA", fees: "₹8L - 22L" }, { category: "B.Tech", fees: "₹4L - 16L" }, { category: "Medical", fees: "₹12L - 30L" }],
  },
  {
    slug: "hyderabad", name: "Hyderabad", state: "Telangana", collegeCount: 156,
    labels: ["Cyber City & Biotech", "Highest Growth Index"],
    description: "Rapidly expanding IT corridor, pharmaceutical research & Fortune 500 campuses.",
    avgPackage: "₹7.5 - 20 LPA", image: "/images/locations/hyderabad.jpg",
    courseFees: [{ category: "MBA", fees: "₹6L - 18L" }, { category: "B.Tech", fees: "₹3L - 14L" }, { category: "Pharmacy", fees: "₹2L - 8L" }],
  },
  {
    slug: "pune", name: "Pune", state: "Maharashtra", collegeCount: 189,
    labels: ["Oxford of the East", "Student Capital"],
    description: "Academic heritage, premier automotive design, research & manufacturing hubs.",
    avgPackage: "₹7.0 - 18 LPA", image: "/images/locations/pune.jpg",
    courseFees: [{ category: "MBA", fees: "₹7L - 20L" }, { category: "Engineering", fees: "₹3L - 12L" }, { category: "Design", fees: "₹4L - 10L" }],
  },
  {
    slug: "mumbai", name: "Mumbai", state: "Maharashtra", collegeCount: 241,
    labels: ["Financial Capital", "Finance & Corporate HQ"],
    description: "Headquarters of India's major investment banks, consulting & media powerhouses.",
    avgPackage: "₹9.0 - 28 LPA", image: "/images/locations/mumbai.jpg",
    courseFees: [{ category: "MBA", fees: "₹10L - 26L" }, { category: "Commerce", fees: "₹1L - 6L" }, { category: "Law", fees: "₹3L - 12L" }],
  },
  {
    slug: "delhi-ncr", name: "Delhi NCR", state: "Delhi", collegeCount: 302,
    labels: ["National Corporate Hub", "Leadership & Policy Hub"],
    description: "Center of policy, diplomacy, FMCG giants & fast-growing tech conglomerates.",
    avgPackage: "₹8.0 - 25 LPA", image: "/images/locations/delhi-ncr.jpg",
    courseFees: [{ category: "MBA", fees: "₹9L - 24L" }, { category: "B.Tech", fees: "₹4L - 15L" }, { category: "Law", fees: "₹4L - 14L" }],
  },
  {
    slug: "chennai", name: "Chennai", state: "Tamil Nadu", collegeCount: 167,
    labels: ["Industrial & IT Powerhouse", "Core Tech & Research"],
    description: "Renowned research institutions, health-tech revolution & automotive manufacturing.",
    avgPackage: "₹6.8 - 18 LPA", image: "/images/locations/chennai.jpg",
    courseFees: [{ category: "MBA", fees: "₹5L - 16L" }, { category: "Engineering", fees: "₹3L - 13L" }, { category: "Medical", fees: "₹10L - 28L" }],
  },
];

/**
 * A location by slug: the directory's own when it has one, else the matching sample card.
 * The homepage shows the samples when the admin has no cards, or when the API cannot be
 * reached, so their links must open a page rather than a 404 or an error. The sample stands
 * in when the API says 404 or fails outright; a slug that is not a sample still throws.
 */
export async function getLocationOrSample(slug: string): Promise<Location> {
  try {
    return await getLocation(slug);
  } catch (err) {
    const sample = STATIC_LOCATIONS.find((l) => l.slug === slug);
    if (sample) return { slug: sample.slug, name: sample.name, state: sample.state, collegeCount: sample.collegeCount };
    throw err;
  }
}
