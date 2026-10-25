"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ProgramSourceCourse } from "@/lib/api";
import type { UniversityOption } from "@/components/admin/university-picker";

export type CatalogueChoice = {
  courses: { name: string; slug: string }[];
  specialisations: { name: string; courseSlugs: string[] }[];
};

type Figures = { onlineDuration: string; onlineFees: string; onCampusDuration: string; onCampusFees: string; fromRecord: boolean };

const BLANK: Figures = { onlineDuration: "", onlineFees: "", onCampusDuration: "", onCampusFees: "", fromRecord: false };
const field = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

/**
 * The add form for programmes. A programme is not typed in: it is a course (and, optionally, a
 * specialisation) from the Catalogue, offered by one or several institutions from the directory.
 * One programme is made for each institution ticked. Where an institution already lists that course
 * with a duration and fees, they are filled in from its record and marked as such; where it does not,
 * they are entered here. Online and distance study go to the online figures, everything else to
 * on-campus.
 */
export function ProgramAddFields({
  colleges,
  catalogue,
  sourceCourses,
}: {
  colleges: UniversityOption[];
  catalogue: CatalogueChoice;
  sourceCourses: ProgramSourceCourse[];
}) {
  const [course, setCourse] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [picked, setPicked] = useState<Record<string, Figures>>({});
  const [query, setQuery] = useState("");

  const courseSlug = catalogue.courses.find((c) => c.name === course)?.slug;
  const specialisationOptions = catalogue.specialisations.filter((s) => courseSlug && s.courseSlugs.includes(courseSlug));

  /** What a college already records for the chosen course and specialisation. */
  const recordFor = (collegeSlug: string, forCourse = course, forSpec = specialisation): Figures => {
    const found = sourceCourses.find(
      (s) => s.collegeSlug === collegeSlug && s.name === forCourse && (s.specialisation ?? "") === forSpec && (s.duration || s.fees),
    );
    if (!found) return BLANK;
    const online = /online|distance/i.test(found.mode);
    return {
      onlineDuration: online ? found.duration : "",
      onlineFees: online ? found.fees : "",
      onCampusDuration: online ? "" : found.duration,
      onCampusFees: online ? "" : found.fees,
      fromRecord: true,
    };
  };

  const offering = useMemo(
    () => new Set(sourceCourses.filter((s) => s.name === course && (s.specialisation ?? "") === specialisation).map((s) => s.collegeSlug)),
    [sourceCourses, course, specialisation],
  );

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q ? colleges.filter((c) => `${c.name} ${c.city}`.toLowerCase().includes(q)) : colleges;
    // Those that already offer the chosen course come first.
    return [...matching].sort((a, b) => Number(offering.has(b.slug)) - Number(offering.has(a.slug)));
  }, [colleges, query, offering]);

  const choose = (nextCourse: string, nextSpec: string) => {
    setCourse(nextCourse);
    setSpecialisation(nextSpec);
    // Figures follow the course: refilled from each ticked institution's own record.
    setPicked((p) => Object.fromEntries(Object.keys(p).map((slug) => [slug, recordFor(slug, nextCourse, nextSpec)])));
  };

  const toggle = (c: UniversityOption) =>
    setPicked((p) => {
      if (c.slug in p) {
        const { [c.slug]: _gone, ...rest } = p;
        void _gone;
        return rest;
      }
      return { ...p, [c.slug]: recordFor(c.slug) };
    });

  const edit = (slug: string, change: Partial<Figures>) => setPicked((p) => ({ ...p, [slug]: { ...p[slug], ...change, fromRecord: false } }));

  const payload = JSON.stringify({
    course,
    specialisation,
    items: Object.entries(picked).map(([slug, f]) => ({ slug, name: colleges.find((c) => c.slug === slug)?.name ?? slug, ...f })),
  });

  return (
    <div className="space-y-6 sm:col-span-2">
      <input type="hidden" name="payload" value={payload} />

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-ink">1. Choose the programme</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pg-course" className="block text-xs font-semibold text-ink">Course <span className="text-brand">*</span></label>
            <select id="pg-course" value={course} onChange={(e) => choose(e.target.value, "")} className={`mt-1.5 ${field}`}>
              <option value="">Select a course</option>
              {catalogue.courses.map((c) => (
                <option key={c.slug} value={c.name}>{c.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">From Content, Catalogue.</p>
          </div>
          <div>
            <label htmlFor="pg-spec" className="block text-xs font-semibold text-ink">Specialisation</label>
            <select id="pg-spec" value={specialisation} onChange={(e) => choose(course, e.target.value)} disabled={specialisationOptions.length === 0} className={`mt-1.5 ${field} disabled:opacity-60`}>
              <option value="">{course ? (specialisationOptions.length ? "None" : "None under this course") : "Pick a course first"}</option>
              {specialisationOptions.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-ink">
          2. Choose the institutions <span className="font-normal text-ink-soft">({Object.keys(picked).length} ticked)</span>
        </h4>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            placeholder="Search colleges"
            aria-label="Search colleges"
            className={`${field} pl-9`}
          />
        </div>
        <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
          {listed.map((c) => (
            <li key={c.slug}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-bg-alt">
                <input type="checkbox" checked={c.slug in picked} onChange={() => toggle(c)} className="h-4 w-4 accent-[var(--color-brand)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{c.name}</span>
                  <span className="block text-xs text-ink-faint">{c.city}</span>
                </span>
                {course && offering.has(c.slug) && <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">Offers this</span>}
              </label>
            </li>
          ))}
          {listed.length === 0 && <li className="px-3 py-3 text-sm text-ink-soft">No college matches.</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-ink">3. Check the duration and fees</h4>
        {Object.keys(picked).length === 0 ? (
          <p className="text-sm text-ink-soft">Tick an institution in step 2.</p>
        ) : (
          <ul className="space-y-3">
            {Object.entries(picked).map(([slug, f]) => (
              <li key={slug} className="rounded-xl border border-line bg-bg-alt/50 p-4">
                <p className="mb-3 text-sm font-semibold text-ink">
                  {colleges.find((c) => c.slug === slug)?.name}
                  <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide ${f.fromRecord ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
                    {f.fromRecord ? "From the college record" : "Enter here"}
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <label className="block text-xs font-semibold text-ink">Online duration
                    <input value={f.onlineDuration} onChange={(e) => edit(slug, { onlineDuration: e.target.value })} placeholder="8 months" maxLength={100} className={`mt-1.5 ${field}`} />
                  </label>
                  <label className="block text-xs font-semibold text-ink">Online fees
                    <input value={f.onlineFees} onChange={(e) => edit(slug, { onlineFees: e.target.value })} placeholder="₹4L" maxLength={200} className={`mt-1.5 ${field}`} />
                  </label>
                  <label className="block text-xs font-semibold text-ink">On-campus duration
                    <input value={f.onCampusDuration} onChange={(e) => edit(slug, { onCampusDuration: e.target.value })} placeholder="1 year" maxLength={100} className={`mt-1.5 ${field}`} />
                  </label>
                  <label className="block text-xs font-semibold text-ink">On-campus fees
                    <input value={f.onCampusFees} onChange={(e) => edit(slug, { onCampusFees: e.target.value })} placeholder="₹17L" maxLength={200} className={`mt-1.5 ${field}`} />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-ink-faint">Fill in online, on-campus, or both. These are saved on the programme card; the college&rsquo;s own record is not changed.</p>
      </section>
    </div>
  );
}
