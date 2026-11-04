import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-section";
import { RatingsTable } from "@/components/admin/ratings-table";
import { adminListRatings } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const TABS = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Shown on the site" },
  { value: "all", label: "All" },
] as const;

/*
  Every rating a student has written, across all colleges, as a table. The four ratings sit side by side, a comment on
  any of them shows as a bubble, and the platform team approves a review to show it on the college's page. Reviews
  never go to a college's own admin.
*/
export default async function AdminRatingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = first(params.status);
  const status = raw === "approved" || raw === "all" ? raw : "pending";
  // A notification links here with the college it is about already chosen.
  const college = first(params.college) || undefined;
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const { data, meta } = await withAdminToken((token) => adminListRatings(token, { status, page, limit: 100 }));
  const href = (p: number) => `/admin/ratings?status=${status}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Ratings" description="What students rated each college, with their comments. Approve a review to show it on the college's Reviews page." />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/ratings?status=${tab.value}`}
            aria-current={tab.value === status ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${tab.value === status ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand hover:text-brand"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-ink-soft">{meta.total.toLocaleString("en-IN")} {meta.total === 1 ? "review" : "reviews"}</p>
      <RatingsTable key={`${status}-${page}-${college}`} items={data} paged={meta.pages > 1} initialCollege={college} />

      {meta.pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm text-ink-soft">
          {meta.page > 1 ? <Link href={href(meta.page - 1)} className="font-medium text-brand hover:underline">← Previous</Link> : <span />}
          <span>Page {meta.page} of {meta.pages}</span>
          {meta.page < meta.pages ? <Link href={href(meta.page + 1)} className="font-medium text-brand hover:underline">Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
