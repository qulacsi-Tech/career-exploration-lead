"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { PaginationMeta, SavedCollegeRow, SavedStudent } from "@/lib/api";

const pageButton = "inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 font-medium";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function hrefFor(base: string, query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** The search box. The search and the page live in the URL; the server does the searching. */
function SearchBox({ base, query, placeholder }: { base: string; query: string; placeholder: string }) {
  const router = useRouter();
  const [text, setText] = useState(query);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(hrefFor(base, text.trim(), 1));
      }}
      className="relative w-full max-w-xs"
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-9 text-sm text-ink focus:border-brand focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setText("");
            router.push(hrefFor(base, "", 1));
          }}
          aria-label="Clear the search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}

function Footer({ base, query, meta, count }: { base: string; query: string; meta: PaginationMeta; count: number }) {
  const first = (meta.page - 1) * meta.limit;
  const link = (page: number, label: React.ReactNode, enabled: boolean) =>
    enabled ? (
      <Link href={hrefFor(base, query, page)} className={`${pageButton} text-ink-soft hover:border-brand hover:text-brand`}>{label}</Link>
    ) : (
      <span className={`${pageButton} opacity-40`}>{label}</span>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-soft">
      <span>
        Showing {(first + 1).toLocaleString("en-IN")}–{(first + count).toLocaleString("en-IN")} of {meta.total.toLocaleString("en-IN")}
      </span>
      {meta.pages > 1 && (
        <nav className="flex items-center gap-2" aria-label="Pages">
          {link(meta.page - 1, <><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</>, meta.page > 1)}
          <span>Page {meta.page} of {meta.pages}</span>
          {link(meta.page + 1, <>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></>, meta.page < meta.pages)}
        </nav>
      )}
    </div>
  );
}

function Header({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>
      </div>
      {children}
    </header>
  );
}

/** Platform team: every college that has been saved, with how many students saved it. A row opens the list of students. */
export function SavedCollegesTable({ colleges, meta, query }: { colleges: SavedCollegeRow[]; meta: PaginationMeta; query: string }) {
  const base = "/admin/leads/saved";
  const first = (meta.page - 1) * meta.limit;
  return (
    <div className="space-y-6">
      <Header title="Saved institutes" description="Colleges students have saved to their profile, most saved first. Open one to see who saved it.">
        <SearchBox base={base} query={query} placeholder="Search name, city or state" />
      </Header>
      {meta.total === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-soft">
          {query ? `No saved college matches “${query}”.` : "No student has saved a college yet. They appear here when a signed-in student presses Save on a college page."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-alt/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-14 px-4 py-3">#</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Students saved</th>
                  <th className="px-4 py-3">Last saved</th>
                  <th className="px-4 py-3 text-right">Students</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((c, i) => (
                  <tr key={c.slug} className="border-b border-line last:border-0 hover:bg-bg-alt/40">
                    <td className="px-4 py-3 text-ink-faint">{first + i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{c.saveCount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatDate(c.lastSavedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/leads/saved/${encodeURIComponent(c.slug)}`} className="inline-flex rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark">
                        View students
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Footer base={base} query={query} meta={meta} count={colleges.length} />
        </div>
      )}
    </div>
  );
}

/**
 * The students who saved one college. The platform team sees everyone who saved a college (with a link back); a
 * college admin sees their own college's students who agreed to be contacted, with a count of the rest.
 */
export function SavedStudentsTable({
  students,
  meta,
  query,
  base,
  title,
  description,
  back,
  notShared,
  showConsent,
}: {
  students: SavedStudent[];
  meta: PaginationMeta;
  query: string;
  base: string;
  title: string;
  description: string;
  back?: { href: string; label: string };
  /** Students who saved but did not agree to share their details, for a college admin. */
  notShared?: number | null;
  /** Show whether each student agreed to be contacted (the platform team sees everyone). */
  showConsent?: boolean;
}) {
  const first = (meta.page - 1) * meta.limit;
  return (
    <div className="space-y-6">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-brand">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {back.label}
        </Link>
      )}
      <Header title={title} description={description}>
        <SearchBox base={base} query={query} placeholder="Search name, email, phone or city" />
      </Header>
      {notShared != null && notShared > 0 && (
        <p className="rounded-lg border border-line bg-bg-alt/60 px-4 py-2.5 text-sm text-ink-soft">
          {notShared.toLocaleString("en-IN")} more {notShared === 1 ? "student" : "students"} saved your college but did not agree to share contact details, so they are not listed.
        </p>
      )}
      {meta.total === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-soft">
          {query ? "No student matches this search." : "No students to show yet."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-alt/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-14 px-4 py-3">#</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">City</th>
                  {showConsent && <th className="px-4 py-3">May be contacted</th>}
                  <th className="px-4 py-3">Saved on</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className="border-b border-line last:border-0 hover:bg-bg-alt/40">
                    <td className="px-4 py-3 text-ink-faint">{first + i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.email}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.city || "—"}</td>
                    {showConsent && (
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.contactOk ? "bg-emerald-50 text-emerald-700" : "bg-bg-alt text-ink-soft"}`}>{s.contactOk ? "Yes" : "No"}</span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-ink-soft">{formatDate(s.savedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Footer base={base} query={query} meta={meta} count={students.length} />
        </div>
      )}
    </div>
  );
}
