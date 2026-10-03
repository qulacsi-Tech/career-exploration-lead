import type { MetadataRoute } from "next";
import { getSitemapSlugs } from "@/lib/api";
import { curatedComparisons } from "@/lib/comparison-data";

/** Absolute origin for sitemap URLs. Set NEXT_PUBLIC_SITE_URL in each environment. */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Rebuilt hourly, so new colleges and exams reach search without a deploy. */
export const revalidate = 3600;

/*
  Route shapes follow the (site) folders: a college lives at /college/[slug]
  (singular) while the listing is /colleges. Exams and articles have no index
  page here, so only their detail URLs are listed.
*/
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [colleges, exams, articles, courses] = await Promise.all([
    getSitemapSlugs("colleges"),
    getSitemapSlugs("exams"),
    getSitemapSlugs("articles"),
    getSitemapSlugs("courses"),
  ]);

  const staticPaths = ["/", "/colleges", "/courses", "/compare"];

  const paths = [
    ...staticPaths,
    ...colleges.map((slug) => `/college/${slug}`),
    ...exams.map((slug) => `/exams/${slug}`),
    ...articles.map((slug) => `/articles/${slug}`),
    ...courses.map((slug) => `/courses/${slug}`),
    ...curatedComparisons.map((c) => `/compare/${c.slug}`),
  ];

  return paths.map((path) => ({ url: `${SITE_URL}${path}` }));
}
