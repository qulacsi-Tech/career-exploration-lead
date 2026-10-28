"use client";

import type { CollegePools } from "@/lib/api";

/*
  The two pickers a college is described with, shared by the Add form and the record editor so the
  two cannot drift: tick the categories, then tick the courses under them, then tick the
  specialisations under each ticked course. What is offered comes from Content > Catalogue.
*/

export type CoursePick = { name: string; specialisation: string };

type CatalogueLists = Pick<CollegePools, "courses" | "specialisations" | "courseStreams" | "specialisationCourses"> & Partial<Pick<CollegePools, "onlineCourses" | "onlineSpecialisations">>;

/** The small mark on a course or specialisation that can be taught online. */
function OnlineTag() {
  return <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">Online</span>;
}

const chip = "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition";
const on = "border-brand bg-brand-soft text-brand";
const off = "border-line text-ink hover:border-brand";

/** The categories a college is listed under. At least one; the first ticked is its main one. */
export function CategoryTicks({
  value,
  options,
  onChange,
  name,
}: {
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
  /** Posts one value per ticked box when the picker sits in a plain form. */
  name?: string;
}) {
  const shown = [...options, ...value.filter((v) => !options.includes(v))];
  return (
    <fieldset className="min-w-0">
      <legend className="block text-xs font-semibold text-ink">
        Categories<span className="text-brand"> *</span>
      </legend>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {shown.map((category) => {
          const checked = value.includes(category);
          return (
            <li key={category}>
              <label className={`${chip} ${checked ? on : off}`}>
                <input
                  type="checkbox"
                  name={name}
                  value={category}
                  checked={checked}
                  onChange={() => onChange(checked ? value.filter((v) => v !== category) : [...value, category])}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                {category}
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-xs text-ink-faint">Tick every category the college is listed under. The courses below follow them.</p>
    </fieldset>
  );
}

/**
 * Courses under the ticked categories, and under each ticked course its specialisations. `value` is
 * one entry per course-and-specialisation pair, which is how a college stores them: a course with
 * none ticked is a single entry with no specialisation.
 */
export function CourseTicks({
  categories,
  pools,
  value,
  onChange,
}: {
  categories: string[];
  pools: CatalogueLists;
  value: CoursePick[];
  onChange: (next: CoursePick[]) => void;
}) {
  const tickedNames = [...new Set(value.map((v) => v.name))];
  // A course already ticked stays listed even if its category was unticked since, so it can still be unticked.
  const available = pools.courses.filter(
    (course) => tickedNames.includes(course) || (pools.courseStreams[course] ?? []).some((s) => categories.includes(s)),
  );
  const specsFor = (course: string) =>
    pools.specialisations.filter((spec) => (pools.specialisationCourses[spec] ?? []).includes(course));

  const toggleCourse = (course: string) =>
    onChange(tickedNames.includes(course) ? value.filter((v) => v.name !== course) : [...value, { name: course, specialisation: "" }]);

  const toggleSpec = (course: string, spec: string) => {
    const has = value.some((v) => v.name === course && v.specialisation === spec);
    let next = has
      ? value.filter((v) => !(v.name === course && v.specialisation === spec))
      : [...value.filter((v) => !(v.name === course && v.specialisation === "")), { name: course, specialisation: spec }];
    // The course stays ticked when its last specialisation is unticked.
    if (!next.some((v) => v.name === course)) next = [...next, { name: course, specialisation: "" }];
    onChange(next);
  };

  if (categories.length === 0) return <p className="text-sm text-ink-soft">Tick a category to choose its courses.</p>;
  if (available.length === 0) return <p className="text-sm text-ink-soft">No courses are listed under these categories yet. Add them in Content, Catalogue.</p>;

  return (
    <fieldset className="min-w-0">
      <legend className="block text-xs font-semibold text-ink">Courses</legend>
      <ul className="mt-1.5 space-y-3">
        {available.map((course) => {
          const checked = tickedNames.includes(course);
          const specs = specsFor(course);
          return (
            <li key={course}>
              <label className={`${chip} w-fit ${checked ? on : off}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleCourse(course)} className="h-4 w-4 accent-[var(--color-brand)]" />
                {course}
                {pools.onlineCourses?.includes(course) && <OnlineTag />}
              </label>
              {checked && specs.length > 0 && (
                <div className="ml-6 mt-2 border-l-2 border-line pl-4">
                  <p className="text-xs text-ink-faint">Specialisations under {course}</p>
                  <ul className="mt-1.5 flex flex-wrap gap-2">
                    {specs.map((spec) => {
                      const specChecked = value.some((v) => v.name === course && v.specialisation === spec);
                      return (
                        <li key={spec}>
                          <label className={`${chip} ${specChecked ? on : off}`}>
                            <input type="checkbox" checked={specChecked} onChange={() => toggleSpec(course, spec)} className="h-4 w-4 accent-[var(--color-brand)]" />
                            {spec}
                            {pools.onlineSpecialisations?.includes(spec) && <OnlineTag />}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
