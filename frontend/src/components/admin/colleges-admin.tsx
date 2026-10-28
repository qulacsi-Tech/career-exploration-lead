"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { CollegePools, CollegeRecord } from "@/lib/api";
import { createCollege, deleteCollegeForever, setCollegeStatus } from "@/lib/admin-actions";
import type { College, CollegeStatus, IndiaGeo } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { AdminPageHeader, AdminSection, AdminSubsection } from "@/components/admin/admin-section";
import { AdminModal } from "@/components/admin/admin-modal";
import { ListingHeaderButton } from "@/components/admin/listing-header-modal";
import { ListingSlotsButton } from "@/components/admin/listing-slots-modal";
import { PriorityButton, type PriorityLink } from "@/components/admin/priority-modal";
import { SeoAvailability } from "@/components/admin/seo-availability";
import { StateCityFields } from "@/components/admin/state-city-fields";
import { CategoryTicks, CourseTicks, type CoursePick } from "@/components/admin/college-editor/course-picker";
import { CollegeRecordEditor } from "@/components/admin/college-editor/college-record-editor";
import { StatusMessage, useFlash } from "@/components/admin/status-message";
import { TextField, SelectField, Field, NameSlugFields } from "@/components/admin/admin-fields";
import { feeRangeProblem, nameProblem, yearProblem } from "@/lib/college-rules";
import { PlacementBreakdownTable } from "@/components/college/placement-breakdown";

/**
 * Colleges module: a scannable table, with everything bulky behind View.
 *
 * The table carries only what you sort and search on. Courses, fees, rankings,
 * placements, cutoffs and SEO all live in the View dialog — a college has
 * enough attached to it that showing any of it inline makes the list unusable
 * once there are more than a handful of records.
 */
export function CollegesAdmin({ colleges, geo = {}, streams = [], pools = null, priorityLinks = [] }: { colleges: College[]; geo?: IndiaGeo; streams?: string[]; pools?: CollegePools | null; priorityLinks?: PriorityLink[] }) {
  const [query, setQuery] = useState("");
  const [stream, setStream] = useState("");
  const [course, setCourse] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CollegeStatus>("");
  const [acting, setActing] = useState<{ college: College; action: StatusAction } | null>(null);
  const [viewing, setViewing] = useState<College | null>(null);
  const [editing, setEditing] = useState<College | null>(null);
  const [adding, setAdding] = useState(false);
  const [flash, showFlash] = useFlash();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  // What was just saved shows in its row at once. The page's own data catches up a moment later (it reads
  // every college again), and by then it says the same thing.
  const [patches, setPatches] = useState<Record<string, Partial<College>>>({});
  const [added, setAdded] = useState<College[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const rows = useMemo(() => {
    const known = new Set(colleges.map((c) => c.slug));
    return [...added.filter((c) => !known.has(c.slug)), ...colleges]
      .filter((c) => !removed.includes(c.slug))
      .map((c) => (patches[c.slug] ? { ...c, ...patches[c.slug] } : c));
  }, [colleges, added, removed, patches]);

  // Category, then course, then specialisation: each list only offers what sits under the one before,
  // and changing one clears the ones after it so a stale pick cannot keep filtering.
  const courseOptions = useMemo(() => {
    if (!stream) return [];
    const names = pools
      ? pools.courses.filter((name) => pools.courseStreams[name]?.includes(stream))
      : rows.filter((c) => c.stream === stream).flatMap((c) => c.courses.map((k) => k.name));
    return [...new Set(names)].sort((x, y) => x.localeCompare(y));
  }, [pools, rows, stream]);

  const specialisationOptions = useMemo(() => {
    if (!course) return [];
    const names = pools
      ? pools.specialisations.filter((name) => pools.specialisationCourses[name]?.includes(course))
      : rows.flatMap((c) => c.courses.filter((k) => k.name === course && k.specialisation).map((k) => k.specialisation as string));
    return [...new Set(names)].sort((x, y) => x.localeCompare(y));
  }, [pools, rows, course]);

  const selectStream = (value: string) => {
    setStream(value);
    setCourse("");
    setSpecialisation("");
  };
  const selectCourse = (value: string) => {
    setCourse(value);
    setSpecialisation("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byStatus = statusFilter ? rows.filter((c) => (c.status ?? "published") === statusFilter) : rows;
    // A college is in a category by its own stream or by offering a course that sits under it.
    const inStream = stream
      ? byStatus.filter((c) => c.stream === stream || c.courses.some((k) => pools?.courseStreams[k.name]?.includes(stream)))
      : byStatus;
    const inCourse = course ? inStream.filter((c) => c.courses.some((k) => k.name === course)) : inStream;
    const inSpecialisation = specialisation
      ? inCourse.filter((c) => c.courses.some((k) => k.name === course && k.specialisation === specialisation))
      : inCourse;
    const matching = q ? inSpecialisation.filter((c) => [c.name, c.city, c.state, c.stream].some((field) => field.toLowerCase().includes(q))) : inSpecialisation;
    if (!sort) return matching; // the order the server sent: newest first
    const value = (c: College) =>
      ({ name: c.name, location: `${c.city}, ${c.state}`, ownership: c.ownership, stream: c.stream, courses: c.coursesOffered, rating: nirfRank(c) ?? Number.MAX_SAFE_INTEGER, priority: c.priority ?? Number.MAX_SAFE_INTEGER })[sort.key];
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...matching].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sign || a.name.localeCompare(b.name);
    });
  }, [rows, pools, query, stream, course, specialisation, statusFilter, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Colleges"
        description="Every institute in the directory, with its courses, fees, placements and SEO fields."
        actions={
          <>
            <PriorityButton links={priorityLinks} />
            <ListingHeaderButton page="colleges" label="Header management" />
            <ListingSlotsButton page="colleges" label="Banners, filters & ads" />
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Add college
            </button>
          </>
        }
      />

      <StatusMessage flash={flash} floating />

      <AdminSection
        title="All colleges"
        description={`${filtered.length} of ${rows.length} shown`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, city, stream"
              aria-label="Search colleges"
              className="w-56 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            />

            <select value={stream} onChange={(e) => selectStream(e.target.value)} aria-label="Filter by category" className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">All categories</option>
              {streams.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select value={course} onChange={(e) => selectCourse(e.target.value)} disabled={!stream} aria-label="Filter by course" className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">{stream ? "All courses" : "Select a category first"}</option>
              {courseOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select value={specialisation} onChange={(e) => setSpecialisation(e.target.value)} disabled={!course} aria-label="Filter by specialisation" className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">{course ? "All specialisations" : "Select a course first"}</option>
              {specialisationOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | CollegeStatus)}
              aria-label="Filter by status"
              className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        }
      >
        {/* Wide table on a narrow screen: scroll it rather than wrap the cells. */}
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <SortHeader label="Name" k="name" sort={sort} onSort={toggleSort} />
                <SortHeader label="Location" k="location" sort={sort} onSort={toggleSort} />
                <SortHeader label="Ownership" k="ownership" sort={sort} onSort={toggleSort} />
                <SortHeader label="Stream" k="stream" sort={sort} onSort={toggleSort} />
                <SortHeader label="Courses" k="courses" sort={sort} onSort={toggleSort} />
                <SortHeader label="NIRF" k="rating" sort={sort} onSort={toggleSort} />
                <SortHeader label="Priority" k="priority" sort={sort} onSort={toggleSort} />
                <th scope="col" className="py-2 pr-3 font-semibold">SEO available</th>
                <th scope="col" className="sticky right-0 bg-surface py-2 pl-3 text-right font-semibold shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.15)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((college) => (
                <tr key={college.slug} className="border-b border-line-soft last:border-b-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-bg-alt">
                        {college.image && (
                          // Plain img: uploads come from the API's origin, not the optimizer's allow-list.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(college.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">
                          {college.name} <StatusBadge status={college.status} />
                        </span>
                        <span className="block text-xs text-ink-faint">{college.slug}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-ink-soft">
                    {college.city}, {college.state}
                  </td>
                  <td className="py-3 pr-3 text-ink-soft">{college.ownership}</td>
                  <td className="py-3 pr-3 text-ink-soft">{college.stream}</td>
                  <td className="py-3 pr-3 text-ink-soft">{Math.max(0, college.coursesOffered)}</td>
                  <td className="py-3 pr-3 text-ink-soft">
                    {nirfRank(college) !== null ? (
                      `NIRF (${nirfRank(college)})`
                    ) : (
                      <>
                        {college.rating}
                        <span className="text-ink-faint"> ({college.reviewCount})</span>
                      </>
                    )}
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-ink-soft">{college.priority ?? <span className="text-ink-faint">—</span>}</td>
                  <td className="py-3 pr-3 text-ink-soft"><SeoAvailability seo={(college as { seo?: unknown }).seo} /></td>
                  <td className="sticky right-0 bg-surface py-3 pl-3 shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.15)]">
                    <div className="flex justify-end gap-2">
                      {/* View is switched off for now; the dialog behind it is kept.
                      <button
                        type="button"
                        onClick={() => setViewing(college)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
                      >
                        View
                      </button>
                      */}
                      <button
                        type="button"
                        onClick={() => setEditing(college)}
                        className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand-soft"
                      >
                        Edit
                      </button>
                      <StatusMenu college={college} onPick={(action) => setActing({ college, action })} />
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-ink-soft">
                    {query
                      ? `No colleges match “${query}”.`
                      : "No colleges match the selected filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <ViewCollegeModal
        college={viewing}
        onClose={() => setViewing(null)}
        onEdit={(c) => {
          setViewing(null);
          setEditing(c);
        }}
      />
      {/* Mounted only while open, so every opening loads the saved record fresh. */}
      {editing && (
        <CollegeRecordEditor
          key={editing.slug}
          slug={editing.slug}
          onClose={() => setEditing(null)}
          onSaved={(name, record) => {
            setPatches((p) => ({ ...p, [editing.slug]: patchFrom(record) }));
            showFlash("ok", `${name} saved.`);
          }}
        />
      )}
      <StatusConfirm
        acting={acting}
        onClose={() => setActing(null)}
        onDone={(message) => {
          if (acting) {
            const { slug } = acting.college;
            if (acting.action === "delete") setRemoved((r) => [...r, slug]);
            else setPatches((p) => ({ ...p, [slug]: { status: acting.action === "publish" ? "published" : acting.action === "archive" ? "archived" : "draft" } }));
          }
          setActing(null);
          showFlash("ok", message);
        }}
        onError={(message) => {
          setActing(null);
          showFlash("error", message);
        }}
      />
      <AddCollegeModal
        geo={geo}
        streams={streams}
        pools={pools}
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(form) => {
          setAdded((list) => [stubFrom(form), ...list]);
          showFlash("ok", "College added as a draft. It is not on the site until you publish it from the list.");
        }}
      />
    </div>
  );
}

/** Everything attached to one college, so the listing stays short. */
function ViewCollegeModal({
  college,
  onClose,
  onEdit,
}: {
  college: College | null;
  onClose: () => void;
  onEdit: (college: College) => void;
}) {
  return (
    <AdminModal
      open={college !== null}
      onClose={onClose}
      size="lg"
      title={college?.name ?? ""}
      description={college ? `${college.city}, ${college.state} · ${college.slug}` : undefined}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => college && onEdit(college)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Edit record
          </button>
        </>
      }
    >
      {college && (
        <div className="space-y-6">
          <AdminSubsection title="Basic details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Ownership" value={college.ownership} />
              <Field label="Stream" value={college.stream} />
              <Field label="Established" value={String(college.established)} />
              <Field label="Fees range" value={college.feesRange} />
              <Field label="Ranking" value={`${college.ranking.authority} #${college.ranking.rank}`} />
              <Field label="Rating" value={`${college.rating} (${college.reviewCount} reviews)`} />
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{college.about}</p>
          </AdminSubsection>

          <AdminSubsection title="Courses & fees">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th scope="col" className="py-2 pr-3 font-semibold">Course</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Duration</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Mode</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Fees</th>
                    <th scope="col" className="py-2 font-semibold">Exams</th>
                  </tr>
                </thead>
                <tbody>
                  {college.courses.map((course) => (
                    <tr key={course.name} className="border-b border-line-soft last:border-b-0">
                      <td className="py-2 pr-3 font-medium text-ink">{course.name}</td>
                      <td className="py-2 pr-3 text-ink-soft">{course.duration}</td>
                      <td className="py-2 pr-3 text-ink-soft">{course.mode}</td>
                      <td className="py-2 pr-3 text-ink-soft">{course.fees}</td>
                      <td className="py-2 text-ink-soft">{course.exams.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSubsection>

          <AdminSubsection
            title="Placements"
            description={college.placement ? `Batch of ${college.placement.year}` : "No placement data"}
          >
            {college.placement && (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  <Field label="Average" value={college.placement.average} />
                  <Field label="Highest" value={college.placement.highest} />
                </dl>
                <p className="mt-2 text-xs text-ink-soft">
                  Top recruiters: {college.placement.topRecruiters.join(", ")}
                </p>
                {(college.placement.breakdown?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-semibold text-ink">By course and specialisation</p>
                    <PlacementBreakdownTable rows={college.placement.breakdown} />
                  </div>
                )}
              </>
            )}
          </AdminSubsection>

          <AdminSubsection title="Cutoffs">
            <ul className="space-y-1 text-sm text-ink-soft">
              {(college.cutoffs ?? []).map((cutoff) => (
                <li key={`${cutoff.exam}-${cutoff.category}-${cutoff.course}-${cutoff.specialisation}`}>
                  <span className="font-medium text-ink">{cutoff.exam}</span> · {[cutoff.course, cutoff.specialisation].filter(Boolean).join(" ") || "every programme"} · {cutoff.category} ·{" "}
                  {cutoff.score}
                </li>
              ))}
            </ul>
          </AdminSubsection>

          <AdminSubsection title="Approvals & tags">
            <div className="flex flex-wrap gap-2">
              {[...college.approvals, ...college.tags].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft"
                >
                  {tag}
                </span>
              ))}
            </div>
          </AdminSubsection>

          <AdminSubsection title="SEO" description="Title, meta description, canonical and schema.">
            <p className="rounded-lg border border-dashed border-line bg-bg-alt px-4 py-5 text-center text-xs text-ink-soft">
              No SEO fields on the record yet — they arrive with the colleges API.
            </p>
          </AdminSubsection>
        </div>
      )}
    </AdminModal>
  );
}

type SortKey = "name" | "location" | "ownership" | "stream" | "courses" | "rating" | "priority";

function SortHeader({ label, k, sort, onSort }: { label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" } | null; onSort: (k: SortKey) => void }) {
  const on = sort?.key === k;
  return (
    <th scope="col" aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="py-2 pr-3 font-semibold">
      <button type="button" onClick={() => onSort(k)} className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-brand ${on ? "text-brand" : ""}`}>
        {label}
        <span aria-hidden className="text-[10px]">{on ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

/** The NIRF rank, when the college's ranking is NIRF's; null otherwise, and the review rating is shown instead. */
function nirfRank(c: College): number | null {
  return /nirf/i.test(c.ranking?.authority ?? "") && c.ranking.rank > 0 ? c.ranking.rank : null;
}

/** What the table shows of a college, from the record that was just saved. */
function patchFrom(r: CollegeRecord): Partial<College> {
  return {
    name: r.name, city: r.city, state: r.state, ownership: r.ownership, stream: r.stream, feesRange: r.feesRange,
    established: r.established ?? undefined, about: r.about, examsAccepted: r.examsAccepted, tags: r.tags,
    approvals: r.approvals, image: r.image, coursesOffered: r.courses.length,
    ...({ seo: r.detail.seo } as object), // the SEO column reads it
  };
}

/** A row for a college that was just added, until the page's own list includes it. */
function stubFrom(form: FormData): College {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  return {
    slug: text("slug"), name: text("name"), city: text("city"), state: text("state"), status: "draft",
    ownership: (text("ownership") || "Private") as College["ownership"], stream: String(form.getAll("streams")[0] ?? ""),
    ranking: { authority: "", rank: 0 }, rating: 0, reviewCount: 0, coursesOffered: 0, feesRange: text("feesRange"),
    examsAccepted: [], tags: [], approvals: [], courses: [], cutoffs: [], about: text("about"),
    established: Number(text("established")) || undefined, image: "",
  };
}

type StatusAction = "publish" | "archive" | "restore" | "delete";

function StatusBadge({ status }: { status?: CollegeStatus }) {
  if (!status || status === "published") return null;
  const style = status === "draft" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-700";
  return <span className={`ml-1.5 rounded-full px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide ${style}`}>{status}</span>;
}

/**
 * The status actions for one row, in a small menu so the Actions column stays narrow. The menu is fixed to
 * the screen at the button, not placed inside the table: the table sits in a scrolling box that would cut
 * off anything drawn outside it (which is what hid it before).
 */
function StatusMenu({ college, onPick }: { college: College; onPick: (action: StatusAction) => void }) {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const status = college.status ?? "published";
  const items: { action: StatusAction; label: string; danger?: boolean }[] =
    status === "draft"
      ? [{ action: "publish", label: "Publish" }, { action: "archive", label: "Archive" }]
      : status === "published"
        ? [{ action: "archive", label: "Archive" }]
        : [{ action: "restore", label: "Restore" }, { action: "delete", label: "Delete permanently", danger: true }];

  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !button.current?.contains(target)) {
        close();
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);

    // Close when user scrolls, but attach with a small delay so that
    // click-to-focus scrolling on the table does not immediately dismiss the menu.
    const scrollTimer = setTimeout(() => {
      window.addEventListener("scroll", close, true);
    }, 120);
    window.addEventListener("resize", close);

    return () => {
      clearTimeout(scrollTimer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [at]);

  const toggle = () => {
    if (at) {
      setAt(null);
      return;
    }
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const showAbove = spaceBelow < 120 && r.top > 120;
    setAt({
      top: showAbove ? Math.max(8, r.top - (items.length * 40 + 16)) : r.bottom + 4,
      right: Math.max(8, window.innerWidth - r.right),
    });
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={at !== null}
        aria-label={`More actions for ${college.name}`}
        onClick={toggle}
        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
          at !== null
            ? "border-brand bg-brand-soft text-brand font-semibold"
            : "border-line text-ink-soft hover:border-brand hover:text-brand"
        }`}
      >
        More
      </button>
      {at &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={menuRef}
            data-status-menu
            role="menu"
            style={{ top: `${at.top}px`, right: `${at.right}px` }}
            className="fixed z-[100] min-w-44 rounded-lg border border-line bg-surface py-1 shadow-xl animate-in fade-in duration-100"
          >
            {items.map((item) => (
              <li key={item.action} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAt(null);
                    onPick(item.action);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-bg-alt ${
                    item.danger ? "text-red-700 hover:bg-red-50" : "text-ink"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}

const STATUS_COPY: Record<StatusAction, { title: string; body: (name: string) => string; confirm: string; done: (name: string) => string; danger?: boolean }> = {
  publish: { title: "Publish this college?", body: (n) => `${n} will appear on the public site, in search and in the sitemap.`, confirm: "Publish", done: (n) => `${n} is published.` },
  archive: { title: "Archive this college?", body: (n) => `${n} is hidden from the public site, search, Compare and the rankings. Nothing is deleted and you can restore it.`, confirm: "Archive", done: (n) => `${n} is archived. Restore it any time from the list.` },
  restore: { title: "Restore this college?", body: (n) => `${n} comes back as a draft, so you can check it before publishing.`, confirm: "Restore as draft", done: (n) => `${n} is back as a draft.` },
  delete: { title: "Delete this college for good?", body: (n) => `${n} and its programmes, placements, reviews and cut-offs are removed permanently. This cannot be undone.`, confirm: "Delete permanently", done: (n) => `${n} was deleted.`, danger: true },
};

function StatusConfirm({ acting, onClose, onDone, onError }: { acting: { college: College; action: StatusAction } | null; onClose: () => void; onDone: (message: string) => void; onError: (message: string) => void }) {
  const [pending, startTransition] = useTransition();
  if (!acting) return null;
  const { college, action } = acting;
  const copy = STATUS_COPY[action];
  const run = () =>
    startTransition(async () => {
      const result = action === "delete" ? await deleteCollegeForever(college.slug) : await setCollegeStatus(college.slug, action === "publish" ? "published" : action === "archive" ? "archived" : "draft");
      if ("error" in result) return onError(result.error);
      onDone(copy.done(college.name));
    });
  return (
    <AdminModal
      open
      onClose={onClose}
      title={copy.title}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={run} disabled={pending} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${copy.danger ? "bg-red-700 hover:bg-red-800" : "bg-brand hover:bg-brand-dark"}`}>
            {pending ? "Working…" : copy.confirm}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink">{copy.body(college.name)}</p>
    </AdminModal>
  );
}

const FALLBACK_STREAMS = ["Management", "Engineering", "Medical", "Science", "Arts", "Commerce", "Pharmacy", "Law"];

function AddCollegeModal({ open, onClose, onSaved, geo, streams, pools }: { open: boolean; onClose: () => void; onSaved: (form: FormData) => void; geo: IndiaGeo; streams: string[]; pools: CollegePools | null }) {
  // Anything typed is worth a question before it is thrown away, so the form tells the modal when it has some.
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    setDirty(false);
    setConfirming(false);
    onClose();
  };
  const requestClose = () => (dirty && !confirming ? setConfirming(true) : close());

  return (
    <AdminModal
      open={open}
      onClose={requestClose}
      size="seventy"
      title="Add college"
      description="Basic details now; courses, placements and SEO on the record afterwards. Fields marked * are required."
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          {confirming && (
            <p role="alert" className="mr-auto rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Discard what you have typed?{" "}
              <button type="button" onClick={close} className="font-semibold underline underline-offset-2">Yes, discard</button>{" "}
              <button type="button" onClick={() => setConfirming(false)} className="font-semibold underline underline-offset-2">Keep editing</button>
            </p>
          )}
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-college-form"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Save college
          </button>
        </div>
      }
    >
      {/* A child of the modal, so its state is discarded when the modal closes
          rather than persisting into the next opening. */}
      <AddCollegeForm
        geo={geo}
        streams={streams.length > 0 ? streams : FALLBACK_STREAMS}
        pools={pools}
        onDirty={() => setDirty(true)}
        onDone={(form) => {
          onSaved(form);
          close();
        }}
      />
    </AdminModal>
  );
}

/**
 * Submitted by hand rather than as a form action: React empties an action's form once it has run, which
 * threw away the state, city, year and fees whenever the server said no. Here nothing is cleared, so the
 * editor fixes the one thing that was wrong.
 */
function AddCollegeForm({ onDone, onDirty, geo, streams, pools }: { onDone: (form: FormData) => void; onDirty: () => void; geo: IndiaGeo; streams: string[]; pools: CollegePools | null }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [picked, setPicked] = useState<CoursePick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; established?: string; feesRange?: string }>({});
  const [pending, startTransition] = useTransition();
  const lastForm = useRef<FormData | null>(null);

  const send = (form: FormData, confirmDuplicate: boolean) => {
    if (confirmDuplicate) form.set("confirmDuplicate", "1");
    setError(null);
    setDuplicate(false);
    startTransition(async () => {
      const result = await createCollege(undefined, form);
      if ("ok" in result) return onDone(form);
      setError(result.error);
      setDuplicate("duplicate" in result);
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    if (categories.length === 0) return setError("Choose at least one category.");

    const established = text("established");
    const problems = {
      name: nameProblem(text("name"), "College name") ?? undefined,
      established: yearProblem(established === "" ? null : Number(established)) ?? (established !== "" && !Number.isInteger(Number(established)) ? "Enter a year, such as 1998." : undefined),
      feesRange: feeRangeProblem(text("feesRange"), "The fee range") ?? undefined,
    };
    setFieldErrors(problems);
    if (Object.values(problems).some(Boolean)) return setError("Fix the highlighted fields and try again.");

    lastForm.current = form;
    send(form, false);
  };

  return (
    <form
      id="add-college-form"
      onSubmit={submit}
      onInput={onDirty}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">
          {error}
          {duplicate && (
            <button
              type="button"
              disabled={pending}
              onClick={() => lastForm.current && send(lastForm.current, true)}
              className="ml-3 rounded-lg border border-red-700 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-700 hover:text-white disabled:opacity-50"
            >
              Add anyway
            </button>
          )}
        </div>
      )}
      {pending && <p className="text-xs text-ink-soft sm:col-span-2">Saving…</p>}
      <NameSlugFields
        nameLabel="College name"
        namePlaceholder="Bengaluru Institute of Management"
        slugPlaceholder="bengaluru-institute-of-management"
        nameError={fieldErrors.name}
      />
      <TextField label="Short name" name="shortName" placeholder="BIMS Bengaluru" maxLength={80} hint="Used where space is tight. Empty: the full name." />

      <StateCityFields geo={geo} />

      <SelectField label="Type" name="institutionType" options={["College", "University"]} />
      <SelectField label="Ownership" name="ownership" options={["Private", "Government", "Deemed"]} />

      <div className="sm:col-span-2">
        <CategoryTicks
          name="streams"
          value={categories}
          options={streams}
          onChange={(next) => {
            setCategories(next);
            onDirty();
          }}
        />
      </div>
      {pools && (
        <div className="sm:col-span-2">
          <CourseTicks
            categories={categories}
            pools={pools}
            value={picked}
            onChange={(next) => {
              setPicked(next);
              onDirty();
            }}
          />
          <input type="hidden" name="courses" value={JSON.stringify(picked)} />
        </div>
      )}

      <TextField label="Established" name="established" placeholder="1998" type="number" min={1800} max={new Date().getFullYear()} error={fieldErrors.established} />
      <TextField label="Fees range" name="feesRange" placeholder="₹9.5L - 21L" error={fieldErrors.feesRange} />

      <div className="sm:col-span-2">
        <label htmlFor="about" className="block text-xs font-semibold text-ink">
          About
        </label>
        <textarea
          id="about"
          name="about"
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          placeholder="Short description used on the college page and in search results."
        />
      </div>
    </form>
  );
}
