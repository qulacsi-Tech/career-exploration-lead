"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Award, ChevronDown, Clock, IndianRupee, Layers, Loader2 } from "lucide-react";
import { ApplyRowTrigger } from "@/components/college/course-apply";
import { Chip } from "@/components/ui/chip";
import { shortFee } from "@/lib/college-insights";
import { loadMoreProgrammes, loadMoreSpecialisations } from "@/lib/college-engage-actions";
import type { Course, ProgrammeGroup, ProgrammePage } from "@/lib/api";

/** How many to fetch each time the visitor asks for more, or scrolls to the end of what is shown. */
const COURSE_BATCH = 6;
const SPEC_BATCH = 8;

const label = (course: string, specialisation?: string) => (specialisation ? `${course} · ${specialisation}` : course);

function ProgrammeDetails({ course }: { course: Course }) {
  return (
    <>
      {course.certificateOffered && (
        <p className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-gold-soft px-3 py-1 text-xs font-bold text-amber-900 shadow-sm">
          <Award className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          <span className="truncate">
            Certificate available{course.certificateName ? `: ${course.certificateName}` : ""}
          </span>
        </p>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-brand" />
          {course.duration}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-brand" />
          {course.mode}
        </span>
      </p>
      {(course.eligibility || course.seats) && (
        <p className="mt-2 text-sm text-ink-soft">
          {course.eligibility && <span>Eligibility: {course.eligibility}</span>}
          {course.eligibility && course.seats ? <span aria-hidden> &middot; </span> : null}
          {course.seats ? <span>{course.seats.toLocaleString("en-IN")} seats</span> : null}
        </p>
      )}
      {course.exams.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {course.exams.map((exam) => (
            <li key={exam}>
              <Chip>{exam}</Chip>
            </li>
          ))}
        </ul>
      )}
      {course.onlineOffered && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white">Also online</span>
          {course.onlineDuration && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {course.onlineDuration}
            </span>
          )}
          {course.onlineFees && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <IndianRupee className="h-4 w-4" />
              {shortFee(course.onlineFees).replace("₹", "")} total fees
            </span>
          )}
        </p>
      )}
    </>
  );
}

/** The fee at the right of a programme. Applying is done from the card's one Apply button, or by clicking the programme. */
function ProgrammeFee({ fees }: { fees: string }) {
  return (
    <p className="inline-flex items-center font-display text-2xl font-extrabold text-ink sm:justify-end">
      <IndianRupee className="h-5 w-5" />
      {shortFee(fees).replace("₹", "")}
    </p>
  );
}

/**
 * Calls `onVisible` whenever its marker scrolls into view, so a list keeps loading as the visitor reads down it.
 * It stops when `active` goes false (everything is loaded, or a request is in flight).
 */
function ScrollMore({ active, onVisible }: { active: boolean; onVisible: () => void }) {
  const marker = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = marker.current;
    if (!active || !el) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onVisible(), { rootMargin: "240px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, onVisible]);
  return <div ref={marker} aria-hidden className="h-px" />;
}

const MoreButton = ({ onClick, loading, children }: { onClick: () => void; loading: boolean; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft/50 px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-soft disabled:opacity-60"
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
    {children}
  </button>
);

/**
 * The Courses tab's list: three courses to begin with, each showing two specialisations. "N more courses available"
 * (and "N more specialisations available" inside a course) fetches the next batch from the server; after that first
 * click, the rest keep loading as the visitor scrolls, until everything is shown. Clicking a course or
 * specialisation starts an application for it.
 */
export function CourseList({ slug, initial }: { slug: string; initial: ProgrammePage }) {
  const [groups, setGroups] = useState<ProgrammeGroup[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const more = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await loadMoreProgrammes(slug, groups.length, COURSE_BATCH);
    setLoading(false);
    if ("error" in result) return setError(result.error);
    setTotal(result.total);
    setGroups((current) => [...current, ...result.items.filter((g) => !current.some((c) => c.name === g.name))]);
  }, [slug, groups.length, loading]);

  const remaining = Math.max(0, total - groups.length);

  return (
    <div>
      <ul className="divide-y divide-line border-y border-line">
        {groups.map((group) => (
          <CourseRow key={group.name} slug={slug} group={group} />
        ))}
      </ul>

      {remaining > 0 && (
        <div className="pt-5 text-center">
          {!expanded ? (
            <MoreButton
              loading={loading}
              onClick={() => {
                setExpanded(true);
                void more();
              }}
            >
              {remaining} more {remaining === 1 ? "course" : "courses"} available
            </MoreButton>
          ) : (
            <>
              <p className="inline-flex items-center gap-2 text-sm text-ink-soft">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {remaining} more {remaining === 1 ? "course" : "courses"} loading as you scroll…
              </p>
              <ScrollMore active={!loading && !error} onVisible={() => void more()} />
            </>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}{" "}
              <button type="button" onClick={() => void more()} className="font-semibold underline underline-offset-2">
                Try again
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CourseRow({ slug, group }: { slug: string; group: ProgrammeGroup }) {
  const [specs, setSpecs] = useState<Course[]>(group.specialisations);
  const [total, setTotal] = useState(group.specialisationTotal);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const more = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await loadMoreSpecialisations(slug, group.name, specs.length, SPEC_BATCH);
    setLoading(false);
    if ("error" in result) return setError(result.error);
    setTotal(result.total);
    setSpecs((current) => [...current, ...result.items.filter((s) => !current.some((c) => c.specialisation === s.specialisation))]);
  }, [slug, group.name, specs.length, loading]);

  // A course with no specialisation is one entry, with its own figures.
  if (total === 0 && specs.length === 0 && group.whole) {
    const course = group.whole;
    return (
      <li>
        <ApplyRowTrigger label={label(group.name)} className="grid gap-4 py-6 transition hover:bg-brand-soft/30 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-ink">{group.name}</h3>
            <ProgrammeDetails course={course} />
          </div>
          <ProgrammeFee fees={course.fees} />
        </ApplyRowTrigger>
      </li>
    );
  }

  const remaining = Math.max(0, total - specs.length);

  return (
    <li className="py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-lg font-bold text-ink">{group.name}</h3>
        <span className="text-sm text-ink-soft">
          {total} {total === 1 ? "specialisation" : "specialisations"}
        </span>
      </div>
      {group.whole && (
        <div className="mt-1">
          <ProgrammeDetails course={group.whole} />
        </div>
      )}
      <ul className="relative mt-4 ml-2 space-y-4 border-l-2 border-brand/20 pl-0">
        {specs.map((course) => (
          <li key={course.specialisation} className="relative grid gap-4 pl-7">
            {/* The branch joining this specialisation to the course's line. */}
            <span aria-hidden className="absolute left-0 top-5 h-0.5 w-5 bg-brand/20" />
            <span aria-hidden className="absolute left-[18px] top-[14px] h-2.5 w-2.5 rounded-full bg-brand" />
            <ApplyRowTrigger
              label={label(group.name, course.specialisation)}
              className="min-w-0 rounded-xl border border-line-soft bg-bg-alt/50 p-4 transition hover:border-brand/40 hover:bg-brand-soft/40 sm:col-span-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
            >
              <div className="min-w-0">
                <h4 className="font-display text-base font-bold text-ink">{course.specialisation}</h4>
                <ProgrammeDetails course={course} />
              </div>
              <ProgrammeFee fees={course.fees} />
            </ApplyRowTrigger>
          </li>
        ))}

        {remaining > 0 && (
          <li className="relative pl-7">
            <span aria-hidden className="absolute left-0 top-4 h-0.5 w-5 bg-brand/20" />
            {!expanded ? (
              <MoreButton
                loading={loading}
                onClick={() => {
                  setExpanded(true);
                  void more();
                }}
              >
                {remaining} more {remaining === 1 ? "specialisation" : "specialisations"} available
              </MoreButton>
            ) : (
              <>
                <p className="inline-flex items-center gap-2 text-sm text-ink-soft">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {remaining} more loading as you scroll…
                </p>
                <ScrollMore active={!loading && !error} onVisible={() => void more()} />
              </>
            )}
            {error && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {error}{" "}
                <button type="button" onClick={() => void more()} className="font-semibold underline underline-offset-2">
                  Try again
                </button>
              </p>
            )}
          </li>
        )}
      </ul>
    </li>
  );
}
