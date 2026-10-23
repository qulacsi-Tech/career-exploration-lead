"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { createCollege } from "@/lib/admin-actions";
import type { College, IndiaGeo } from "@/lib/api";
import {
  programs,
  rankingListsForProgram,
  rankedColleges,
  collegesInProgram,
} from "@/lib/rankings-data";
import { mediaUrl } from "@/lib/media";
import { AdminPageHeader, AdminSection, AdminSubsection } from "@/components/admin/admin-section";
import { AdminModal } from "@/components/admin/admin-modal";
import { ListingHeaderButton } from "@/components/admin/listing-header-modal";
import { ListingSlotsButton } from "@/components/admin/listing-slots-modal";
import { StateCityFields } from "@/components/admin/state-city-fields";
import { CollegeRecordEditor } from "@/components/admin/college-editor/college-record-editor";
import { StatusMessage, useFlash } from "@/components/admin/status-message";
import { TextField, SelectField, Field, NameSlugFields } from "@/components/admin/admin-fields";
import { feeRangeProblem, nameProblem, yearProblem } from "@/lib/college-rules";

/**
 * Colleges module: a scannable table, with everything bulky behind View.
 *
 * The table carries only what you sort and search on. Courses, fees, rankings,
 * placements, cutoffs and SEO all live in the View dialog — a college has
 * enough attached to it that showing any of it inline makes the list unusable
 * once there are more than a handful of records.
 */
export function CollegesAdmin({ colleges, geo = {}, streams = [] }: { colleges: College[]; geo?: IndiaGeo; streams?: string[] }) {
  const [query, setQuery] = useState("");
  const [programSlug, setProgramSlug] = useState("");
  const [rankingSlug, setRankingSlug] = useState("");
  const [stream, setStream] = useState("");
  const [viewing, setViewing] = useState<College | null>(null);
  const [editing, setEditing] = useState<College | null>(null);
  const [adding, setAdding] = useState(false);
  const [flash, showFlash] = useFlash();

  // Ranking lists belong to a program, so the second selector only has options
  // once the first is set — and a stale ranking from a previous program must
  // not keep filtering. Cleared in the program handler rather than an effect.
  const rankingOptions = programSlug ? rankingListsForProgram(programSlug) : [];

  const selectProgram = (slug: string) => {
    setProgramSlug(slug);
    setRankingSlug("");
  };

  /**
   * Program, then ranking list, then free text — narrowing in that order.
   *
   * Both selectors read lib/rankings-data rather than filtering on `stream`
   * here: the program-to-college join lives in one place so this screen, the
   * homepage bands and the rankings module cannot drift apart.
   *
   * A ranking list also sets the ORDER, not just the membership — that is the
   * point of picking one. Sorting by the list means an editor sees the colleges
   * in the sequence the site will show them, pins included.
   */
  const scoped = useMemo(() => {
    if (rankingSlug) {
      const order = new Map(
        rankedColleges(rankingSlug).map((row, index) => [row.college.slug, index]),
      );
      return colleges
        .filter((c) => order.has(c.slug))
        .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
    }
    if (programSlug) {
      const inProgram = new Set(collegesInProgram(programSlug).map((c) => c.slug));
      return colleges.filter((c) => inProgram.has(c.slug));
    }
    return colleges;
  }, [colleges, programSlug, rankingSlug]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inStream = stream ? scoped.filter((c) => c.stream === stream) : scoped;
    if (!q) return inStream;
    return inStream.filter((c) =>
      [c.name, c.city, c.state, c.stream].some((field) => field.toLowerCase().includes(q)),
    );
  }, [scoped, query, stream]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Colleges"
        description="Every institute in the directory, with its courses, fees, placements and SEO fields."
        actions={
          <>
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

      <StatusMessage flash={flash} />

      <AdminSection
        title="All colleges"
        description={`${filtered.length} of ${colleges.length} shown`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={programSlug}
              onChange={(e) => selectProgram(e.target.value)}
              aria-label="Filter by program"
              className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="">All programs</option>
              {programs.map((program) => (
                <option key={program.slug} value={program.slug}>
                  {program.name}
                </option>
              ))}
            </select>

            <select
              value={rankingSlug}
              onChange={(e) => setRankingSlug(e.target.value)}
              disabled={rankingOptions.length === 0}
              aria-label="Filter by ranking list"
              className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {programSlug ? "Any ranking" : "Select a program first"}
              </option>
              {rankingOptions.map((list) => (
                <option key={list.slug} value={list.slug}>
                  {list.name}
                </option>
              ))}
            </select>

            <select
              value={stream}
              onChange={(e) => setStream(e.target.value)}
              aria-label="Filter by category"
              className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="">All categories</option>
              {streams.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, city, stream"
              aria-label="Search colleges"
              className="w-56 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            />
          </div>
        }
      >
        {/* Wide table on a narrow screen: scroll it rather than wrap the cells. */}
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th scope="col" className="py-2 pr-3 font-semibold">Name</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Location</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Ownership</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Stream</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Courses</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Rating</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Actions</th>
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
                        <span className="block font-medium text-ink">{college.name}</span>
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
                    {college.rating}
                    <span className="text-ink-faint"> ({college.reviewCount})</span>
                  </td>
                  <td className="py-3 pl-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(college)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(college)}
                        className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand-soft"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-ink-soft">
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
          onSaved={(name) => showFlash("ok", `${name} saved.`)}
        />
      )}
      <AddCollegeModal
        geo={geo}
        streams={streams}
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={() => showFlash("ok", "College added.")}
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
                  <Field label="Median" value={college.placement.median} />
                  <Field label="Highest" value={college.placement.highest} />
                </dl>
                <p className="mt-2 text-xs text-ink-soft">
                  Top recruiters: {college.placement.topRecruiters.join(", ")}
                </p>
              </>
            )}
          </AdminSubsection>

          <AdminSubsection title="Cutoffs">
            <ul className="space-y-1 text-sm text-ink-soft">
              {(college.cutoffs ?? []).map((cutoff) => (
                <li key={`${cutoff.exam}-${cutoff.category}`}>
                  <span className="font-medium text-ink">{cutoff.exam}</span> · {cutoff.category} ·{" "}
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

const FALLBACK_STREAMS = ["Management", "Engineering", "Medical", "Science", "Arts", "Commerce", "Pharmacy", "Law"];

function AddCollegeModal({ open, onClose, onSaved, geo, streams }: { open: boolean; onClose: () => void; onSaved: () => void; geo: IndiaGeo; streams: string[] }) {
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
        onDirty={() => setDirty(true)}
        onDone={() => {
          onSaved();
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
function AddCollegeForm({ onDone, onDirty, geo, streams }: { onDone: () => void; onDirty: () => void; geo: IndiaGeo; streams: string[] }) {
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
      if ("ok" in result) return onDone();
      setError(result.error);
      setDuplicate("duplicate" in result);
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();

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

      <StateCityFields geo={geo} />

      <SelectField label="Type" name="institutionType" options={["College", "University"]} />
      <SelectField label="Ownership" name="ownership" options={["Private", "Government", "Deemed"]} />
      <SelectField label="Category" name="stream" options={streams} required placeholder="Select a category" />

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
