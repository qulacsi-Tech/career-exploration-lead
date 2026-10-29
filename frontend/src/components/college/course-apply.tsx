"use client";

import { createContext, useCallback, useContext, useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry-form";

/**
 * Applying from a college's Courses tab: one Apply button at the top of the card, and the courses themselves
 * clickable, both opening the same dialog. The dialog says which programme the enquiry is for, with a
 * dropdown of everything the college offers right now, then shows the counselling form, so the lead
 * carries the college and the programme.
 *
 * The provider wraps the card, so the course rows (drawn on the server) can open the dialog by being
 * wrapped in `ApplyRowTrigger` without becoming client components themselves.
 */

export type ApplyProgramme = {
  key: string;
  /** The course ("MBA"). */
  course: string;
  /** Its specialisation, or empty for the course as a whole. */
  specialisation: string;
  duration: string;
  mode: string;
  fees: string;
};

const ApplyContext = createContext<(key?: string) => void>(() => {});

export function CourseApplyProvider({
  collegeSlug,
  collegeName,
  stream,
  programmes,
  streams,
  cities,
  children,
}: {
  collegeSlug: string;
  collegeName: string;
  /** The college's own category, chosen in the form to begin with. */
  stream: string;
  programmes: ApplyProgramme[];
  streams: { slug: string; name: string }[];
  cities: { slug: string; name: string }[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(programmes[0]?.key ?? "");
  const titleId = useId();

  const show = useCallback(
    (key?: string) => {
      setSelected(key && programmes.some((p) => p.key === key) ? key : (programmes[0]?.key ?? ""));
      setOpen(true);
    },
    [programmes],
  );
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  const chosen = programmes.find((p) => p.key === selected);
  const label = (p: ApplyProgramme) => (p.specialisation ? `${p.course} · ${p.specialisation}` : p.course);
  const match = streams.find((s) => s.name.toLowerCase() === stream.toLowerCase() || s.slug === stream.toLowerCase());

  // The dropdown groups a course's specialisations under the course.
  const courses = [...new Set(programmes.map((p) => p.course))];
  const optionText = (p: ApplyProgramme) => [p.specialisation || p.course, p.duration, p.fees].filter(Boolean).join(" · ");

  return (
    <ApplyContext.Provider value={show}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-start sm:px-4 sm:pt-[5vh]">
          <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[min(88vh,48rem)] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:max-w-xl sm:rounded-3xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
                  Apply to {collegeName}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">Choose the course you are interested in, then tell us how to reach you.</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-brand hover:text-brand"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="overflow-y-auto px-6 py-5">
              {programmes.length > 0 && (
                <div className="mb-5 rounded-2xl border border-line bg-bg-alt/60 p-4">
                  <label htmlFor={`${titleId}-course`} className="block text-xs font-semibold text-ink">
                    Course
                  </label>
                  <select
                    id={`${titleId}-course`}
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
                  >
                    {courses.map((course) => {
                      const rows = programmes.filter((p) => p.course === course);
                      return rows.length === 1 && !rows[0].specialisation ? (
                        <option key={rows[0].key} value={rows[0].key}>
                          {optionText(rows[0])}
                        </option>
                      ) : (
                        <optgroup key={course} label={course}>
                          {rows.map((p) => (
                            <option key={p.key} value={p.key}>
                              {optionText(p)}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  {chosen && (
                    <p className="mt-2 text-xs text-ink-soft">
                      {[chosen.duration, chosen.mode, chosen.fees && `${chosen.fees} total fees`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              )}

              {/* Re-created when the course changes, so the message starts with the right one. */}
              <EnquiryForm
                key={selected}
                bare
                streams={streams}
                cities={cities}
                collegeSlug={collegeSlug}
                defaultStream={match?.slug ?? ""}
                defaultMessage={
                  chosen
                    ? `I would like to apply for ${label(chosen)} at ${collegeName}. Please share the fees, eligibility and admission dates.`
                    : `I would like to know more about admission at ${collegeName}.`
                }
                source="college-programme"
                programName={chosen ? label(chosen) : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </ApplyContext.Provider>
  );
}

/** The single Apply button for the card, at its top right. */
export function ApplyButton({ children = "Apply now" }: { children?: ReactNode }) {
  const show = useContext(ApplyContext);
  return (
    <button
      type="button"
      onClick={() => show()}
      data-track="cta_apply"
      className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
    >
      {children}
    </button>
  );
}

/** Wraps a course (or a specialisation) so that clicking it opens the dialog on that one. */
export function ApplyRowTrigger({ programmeKey, className = "", children }: { programmeKey: string; className?: string; children: ReactNode }) {
  const show = useContext(ApplyContext);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      show(programmeKey);
    }
  };
  return (
    <div role="button" tabIndex={0} onClick={() => show(programmeKey)} onKeyDown={onKeyDown} title="Apply for this course" className={`cursor-pointer ${className}`}>
      {children}
    </div>
  );
}
