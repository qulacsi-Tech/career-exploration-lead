"use client";

import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import type { MockTest } from "@/lib/practice-data";
import { formatClock } from "@/lib/practice-attempt";

/**
 * The player's chrome: candidate block and clock on top, section tabs below.
 *
 * Laid out the way the exam software does — identity and remaining time in the
 * top right, the paper's sections as tabs across a band under it. Candidates
 * check the clock by glancing at a known position, so moving it somewhere more
 * elegant costs them time they are being measured on.
 */

export function PlayerHeader({
  test,
  candidateName,
  secondsRemaining,
  /** Set when a locked paper is counting down the section rather than the paper. */
  sectionLabel,
  currentSectionId,
  lockedSectionIds,
  onSelectSection,
}: {
  test: MockTest;
  candidateName: string;
  secondsRemaining: number;
  sectionLabel?: string;
  currentSectionId: string;
  lockedSectionIds: string[];
  onSelectSection: (sectionId: string) => void;
}) {
  // No sticky positioning: the player is a fixed-height shell and this is
  // simply its first row, so it cannot scroll away on its own.
  return (
    <header className="shrink-0 border-b border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-ink">TopCollegePath</p>
          <p className="truncate text-xs text-ink-faint">Practice Test</p>
        </div>

        <CandidateBlock
          name={candidateName}
          testTitle={test.title}
          secondsRemaining={secondsRemaining}
          sectionLabel={sectionLabel}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-bg-alt px-4 py-2 sm:px-6">
        <span className="font-display text-sm font-bold uppercase tracking-wide text-brand">
          {test.examSlug.replace(/-/g, " ")}
        </span>

        <SectionTabs
          test={test}
          currentSectionId={currentSectionId}
          lockedSectionIds={lockedSectionIds}
          onSelect={onSelectSection}
        />

        <LanguageSelector languages={test.languages} />
      </div>
    </header>
  );
}

function CandidateBlock({
  name,
  testTitle,
  secondsRemaining,
  sectionLabel,
}: {
  name: string;
  testTitle: string;
  secondsRemaining: number;
  sectionLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="hidden h-12 w-12 shrink-0 items-center justify-center rounded border border-line bg-bg-alt text-ink-faint sm:flex"
      >
        <User className="h-6 w-6" />
      </span>

      <dl className="text-xs leading-tight">
        <div className="flex gap-1.5">
          <dt className="text-ink-soft">Candidate</dt>
          <dd className="font-semibold text-ink">: {name}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-soft">Test</dt>
          <dd className="font-semibold text-ink">: {testTitle}</dd>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <dt className="text-ink-soft">{sectionLabel ? `${sectionLabel} time` : "Time left"}</dt>
          <dd>
            <Clock seconds={secondsRemaining} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * The countdown.
 *
 * Announced at milestones through a live region rather than on every tick — a
 * screen reader reading out each of 1,800 seconds is unusable, and the pressure
 * a candidate needs is "ten minutes left", not a metronome.
 */
function Clock({ seconds }: { seconds: number }) {
  const [announcement, setAnnouncement] = useState("");
  const announced = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!Number.isFinite(seconds)) return;
    const milestones = [600, 300, 120, 60, 30];
    for (const milestone of milestones) {
      if (seconds <= milestone && !announced.current.has(milestone)) {
        announced.current.add(milestone);
        setAnnouncement(
          milestone >= 60 ? `${milestone / 60} minutes remaining` : `${milestone} seconds remaining`,
        );
        break;
      }
    }
  }, [seconds]);

  const urgent = Number.isFinite(seconds) && seconds <= 300;

  /*
    An untimed paper says so in words. A dark pill containing an em dash reads
    as a control that failed to load, which is the opposite of reassuring on a
    screen whose whole job is telling you how long you have.
  */
  if (!Number.isFinite(seconds)) {
    return <span className="text-xs font-semibold text-ink-soft">Untimed</span>;
  }

  return (
    <>
      <span
        className={`rounded px-2 py-0.5 font-display text-sm font-bold tabular-nums ${
          urgent ? "bg-brand text-white" : "bg-ink text-white"
        }`}
      >
        {formatClock(seconds)}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}

function SectionTabs({
  test,
  currentSectionId,
  lockedSectionIds,
  onSelect,
}: {
  test: MockTest;
  currentSectionId: string;
  lockedSectionIds: string[];
  onSelect: (sectionId: string) => void;
}) {
  // A single-section paper has nothing to switch between.
  if (test.sections.length < 2) return null;

  return (
    <nav aria-label="Sections" className="flex flex-wrap gap-1.5">
      {test.sections.map((section) => {
        const locked = lockedSectionIds.includes(section.id);
        const active = section.id === currentSectionId;

        return (
          <button
            key={section.id}
            type="button"
            disabled={locked || (test.sectionLock && !active)}
            onClick={() => onSelect(section.id)}
            aria-current={active ? "page" : undefined}
            title={
              locked
                ? "This section is closed"
                : test.sectionLock && !active
                  ? "This paper locks each section until its time is up"
                  : undefined
            }
            className={`rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              active
                ? "bg-brand text-white"
                : "border border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"
            } disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line disabled:hover:text-ink-soft`}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Paper language.
 *
 * A real control over a real field, not a decorative dropdown: it reads
 * `test.languages`, and because no paper is authored in more than one language
 * yet it renders disabled with the reason attached rather than offering a
 * choice that does nothing. When a translated paper exists it starts working
 * with no change here.
 */
function LanguageSelector({ languages }: { languages: string[] }) {
  const single = languages.length < 2;

  return (
    <div className="ml-auto flex items-center gap-2">
      <label htmlFor="paper-language" className="text-xs font-medium text-ink-soft">
        Language
      </label>
      <select
        id="paper-language"
        disabled={single}
        defaultValue={languages[0]}
        title={single ? `This paper is available in ${languages[0]} only` : undefined}
        className="rounded border border-line bg-surface px-2 py-1 text-xs text-ink disabled:cursor-not-allowed disabled:text-ink-faint"
      >
        {languages.map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </select>
    </div>
  );
}
