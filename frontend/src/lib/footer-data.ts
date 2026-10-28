import { getExams, getFooterColumns } from "@/lib/api";
import type { FooterColumn } from "@/lib/chrome-order";

export { arrangeFooter, type FooterColumn } from "@/lib/chrome-order";

/**
 * The company column, which is not a collection: it links to static pages. The college columns come from
 * the collections placed in a footer column (Content > Collections); the Exams column is built from the
 * exams in the directory.
 */
const COMPANY_COLUMN: FooterColumn = {
  title: "Company",
  links: [
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/enquiry" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Use", href: "/terms" },
  ],
};

/** Every column the footer can show, before the admin's order is applied. */
export async function getFooterSource(): Promise<FooterColumn[]> {
  const dynamicColumns = await getFooterColumns().catch(() => []);
  // Featured exams first, then the rest. An unreachable API just leaves the column out.
  const exams = await getExams({ limit: 50 })
    .then((r) => [...r.data].sort((a, b) => Number(!!b.image) - Number(!!a.image)).slice(0, 4))
    .catch(() => []);
  const examColumn: FooterColumn = {
    title: "Exams",
    links: exams.map((exam) => ({
      // The short form: "Common Admission Test (CAT)" does not fit a footer column.
      label: exam.name.replace(/^.*\(([^)]+)\)$/, "$1"),
      href: `/exams/${exam.slug}`,
    })),
  };
  return [...dynamicColumns.map((c) => ({ title: c.title, links: c.links.map((l) => ({ label: l.label, href: l.href })) })), ...(examColumn.links.length > 0 ? [examColumn] : []), COMPANY_COLUMN];
}
