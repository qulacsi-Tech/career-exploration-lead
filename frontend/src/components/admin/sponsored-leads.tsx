"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Send, X } from "lucide-react";
import type { PaginationMeta, SponsoredCollege } from "@/lib/api";
import { ShareLeadsModal } from "@/components/admin/share-leads-modal";

function href(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/leads/sponsored?${qs}` : "/admin/leads/sponsored";
}

const pageButton = "inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 font-medium";

/**
 * The sponsored colleges as a table, a page at a time. Search and paging are done by the server (the URL holds
 * them), so it stays quick with many colleges. "Manage leads" opens the share dialog for that college: pick leads,
 * share the newest few or all that match, and see or take back what it already has.
 */
export function SponsoredLeads({ colleges, meta, query }: { colleges: SponsoredCollege[]; meta: PaginationMeta; query: string }) {
  const router = useRouter();
  const [text, setText] = useState(query);
  const [open, setOpen] = useState<SponsoredCollege | null>(null);
  const first = (meta.page - 1) * meta.limit;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Sponsored leads</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Colleges that receive leads from the platform team. Open one to choose which leads it gets: pick them one by one, share the newest few, or share all that match a stream, city or type. Its admin sees them in their Leads inbox.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(href(text.trim(), 1));
          }}
          className="relative w-full max-w-xs"
          role="search"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search name, city, state or category"
            aria-label="Search sponsored colleges"
            className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-9 text-sm text-ink focus:border-brand focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setText("");
                router.push(href("", 1));
              }}
              aria-label="Clear the search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </form>
      </header>

      {meta.total === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-soft">
          {query ? (
            <>No sponsored college matches “{query}”.</>
          ) : (
            <>
              No college is sponsored yet. Open a college, tick <strong>Sponsored college</strong> on its Info tab and save. It will appear here.{" "}
              <Link href="/admin/colleges" className="font-semibold text-brand hover:underline">Go to Colleges</Link>
            </>
          )}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-alt/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-14 px-4 py-3">#</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Leads shared</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((c, i) => (
                  <tr key={c.slug} className="border-b border-line last:border-0 hover:bg-bg-alt/40">
                    <td className="px-4 py-3 text-ink-faint">{first + i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{c.stream || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{c.institutionType}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{c.sharedCount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setOpen(c)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark">
                        <Send className="h-3.5 w-3.5" aria-hidden="true" /> Manage leads
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-soft">
            <span>
              Showing {(first + 1).toLocaleString("en-IN")}–{(first + colleges.length).toLocaleString("en-IN")} of {meta.total.toLocaleString("en-IN")}
            </span>
            {meta.pages > 1 && (
              <nav className="flex items-center gap-2" aria-label="Pages">
                {meta.page > 1 ? (
                  <Link href={href(query, meta.page - 1)} className={`${pageButton} text-ink-soft hover:border-brand hover:text-brand`}>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </Link>
                ) : (
                  <span className={`${pageButton} opacity-40`}>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </span>
                )}
                <span>Page {meta.page} of {meta.pages}</span>
                {meta.page < meta.pages ? (
                  <Link href={href(query, meta.page + 1)} className={`${pageButton} text-ink-soft hover:border-brand hover:text-brand`}>
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className={`${pageButton} opacity-40`}>
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </nav>
            )}
          </div>
        </div>
      )}

      {open && (
        <ShareLeadsModal
          slug={open.slug}
          name={open.name}
          onClose={() => {
            setOpen(null);
            router.refresh(); // the shared counts in the table
          }}
        />
      )}
    </div>
  );
}
