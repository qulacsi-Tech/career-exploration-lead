"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { scoreProblem } from "@/lib/college-rules";
import type { CollegeRankings, PlacementBreakdown, RankingListHead, RecordCourse, RecordCutoff, RecordPlacement } from "@/lib/api";
import { checkRankHolder, loadCollegeRankings, removeCollegeRanking, setCollegeRanking } from "@/lib/admin-actions";
import { AmountField } from "@/components/admin/range-field";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { packageProblem } from "@/lib/college-rules";
import { CategoryTicks, CourseTicks, type CoursePick } from "@/components/admin/college-editor/course-picker";
import { AddButton, Card, ChipInput, DurationField, EmptyNote, Labelled, NumberInput, Row, SelectInput, TextInput, inputCls, move } from "@/components/admin/college-editor/shared";

/*
  The tabs that are tables of figures: Courses & Fees, Placements, Cut-Offs and Rankings.
  Each row is chosen from the directory where there is a list to choose from (the courses and
  entrance exams already on the site) and checked as it is typed; the server checks again.
*/

const MODES = ["Full Time", "Part Time", "Weekend", "Online", "Distance"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "PwD", "Other"];
const THIS_YEAR = new Date().getFullYear();

// ── Courses & fees ───────────────────────────────────────────────────────────

const blankCourse = (): RecordCourse => ({ name: "", specialisation: "", duration: "", mode: "Full Time", fees: "", exams: [], eligibility: "", seats: null });

/** A numbered heading, so the tab reads as steps to be done in order. */
function Step({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{n}</span>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        {children && <p className="mt-0.5 text-xs text-ink-faint">{children}</p>}
      </div>
    </div>
  );
}

export function CoursesTab({ record, update, pools }: EditorProps) {
  const rows = record.courses;
  const set = (list: RecordCourse[]) => update((r) => ({ ...r, courses: list }));
  const patch = (i: number, change: Partial<RecordCourse>) => set(rows.map((c, n) => (n === i ? { ...c, ...change } : c)));
  const same = (a: CoursePick, b: CoursePick) => a.name === b.name && a.specialisation === b.specialisation;
  // Ticking adds a row of figures for the course; unticking removes it. Rows the catalogue does not know are kept as they are.
  // A newly ticked one goes to the top of step 3, where its blank figures are the thing to do next. The rest keep their place.
  const pick = (next: CoursePick[]) => {
    const kept = rows.filter((r) => next.some((p) => same(r, p)));
    const added = next.filter((p) => !rows.some((r) => same(r, p))).map((p) => ({ ...blankCourse(), name: p.name, specialisation: p.specialisation }));
    set([...added, ...kept]);
  };
  const missing = rows.filter((c) => !c.duration.trim() || !c.fees.trim()).length;

  return (
    <Card title="Courses and fees" description="Work down the three steps. The Courses and Fees tabs of the college page are built from this.">
      <section className="space-y-3">
        <Step n={1} title="Choose the categories">The college can sit under more than one. The courses in step 2 follow what is ticked here.</Step>
        <div className="pl-9">
          <CategoryTicks value={record.streams} options={pools.streams} onChange={(next) => update((r) => ({ ...r, streams: next, stream: next[0] ?? "" }))} />
        </div>
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <Step n={2} title="Tick the courses it offers">Tick a course to add it, then tick the specialisations it offers under it. Each one gets a card in step 3.</Step>
        <div className="pl-9">
          <CourseTicks categories={record.streams} pools={pools} value={rows.map((r) => ({ name: r.name, specialisation: r.specialisation }))} onChange={pick} />
        </div>
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <Step n={3} title="Fill in the duration and fees">
          {rows.length === 0
            ? "Nothing to fill in until a course is ticked in step 2."
            : missing > 0
              ? `${missing} of ${rows.length} still need a duration and fees. Save is available once every card is complete.`
              : `All ${rows.length} are complete.`}
        </Step>
        {rows.length > 0 && (
          <ul className="space-y-3 pl-9">
            {rows.map((c, i) => {
              const done = !!c.duration.trim() && !!c.fees.trim();
              const extras = c.exams.length > 0 || !!c.eligibility.trim() || c.seats !== null;
              return (
                <li key={`${c.name}|${c.specialisation}|${c.name ? "" : i}`} className={`rounded-xl border bg-bg-alt/50 p-4 ${done ? "border-line" : "border-amber-300"}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {c.name || `Programme ${i + 1}`}
                      {c.specialisation && <span className="font-normal text-ink-soft"> · {c.specialisation}</span>}
                      <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide ${done ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
                        {done ? "Complete" : "Needs details"}
                      </span>
                    </p>
                    <button type="button" onClick={() => set(rows.filter((_, n) => n !== i))} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-red-400 hover:text-red-700">
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <DurationField id={`co-${i}-duration`} label="Duration" required value={c.duration} onChange={(v) => patch(i, { duration: v })} />
                    <SelectInput id={`co-${i}-mode`} label="Mode" value={c.mode} onChange={(v) => patch(i, { mode: v })} options={MODES} />
                    <AmountField id={`co-${i}-fees`} label="Total fees" joined units={["K", "L", "Cr"]} value={c.fees} onChange={(v) => patch(i, { fees: v })} hint="Required. In thousand (K), lakh (L) or crore (Cr)." />
                  </div>
                  <details className="mt-4 rounded-lg border border-line bg-surface" open={extras}>
                    <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink">
                      Optional: entrance exams, eligibility, seats
                    </summary>
                    <div className="grid grid-cols-1 gap-4 border-t border-line p-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                      <ChipInput id={`co-${i}-exams`} label="Entrance exams" value={c.exams} onChange={(v) => patch(i, { exams: v })} suggestions={pools.exams} max={20} strict />
                      <div className="space-y-4">
                        <TextInput id={`co-${i}-elig`} label="Eligibility" max={300} value={c.eligibility} onChange={(v) => patch(i, { eligibility: v })} placeholder="e.g. Graduation with 50%" />
                        <NumberInput id={`co-${i}-seats`} label="Seats" min={1} max={100000} value={c.seats} onChange={(v) => patch(i, { seats: v })} />
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Card>
  );
}

// ── Placements ───────────────────────────────────────────────────────────────

const blankPlacement = (existing: RecordPlacement[]): RecordPlacement => ({
  year: Math.max(THIS_YEAR - 1, ...existing.map((p) => p.year + 1).filter((y) => y <= THIS_YEAR + 1)) || THIS_YEAR - 1,
  average: "",
  median: "",
  highest: "",
  placedPercent: null,
  topRecruiters: [],
  breakdown: [],
});

const blankBreakdown = (): PlacementBreakdown => ({ category: "", course: "", specialisation: "", average: "", highest: "", placed: null, students: null });

/**
 * A year's figures by category, course and specialisation, picked the way the Courses & Fees tab
 * picks them: the category from the ones the college is listed under, the course from the ones it
 * offers in that category, the specialisation from those it offers under the course.
 */
function BreakdownEditor({ rows, onChange, record, pools, id }: { rows: PlacementBreakdown[]; onChange: (next: PlacementBreakdown[]) => void; id: string } & Pick<EditorProps, "record" | "pools">) {
  const patch = (i: number, change: Partial<PlacementBreakdown>) => onChange(rows.map((b, n) => (n === i ? { ...b, ...change } : b)));
  const categories = [...new Set([...record.streams, ...rows.map((b) => b.category).filter(Boolean)])];
  const coursesIn = (category: string) =>
    [...new Set(record.courses.map((c) => c.name).filter((name) => !category || (pools.courseStreams[name] ?? []).includes(category)))];
  const specsOf = (course: string) => [...new Set(record.courses.filter((c) => c.name === course && c.specialisation).map((c) => c.specialisation))];

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-ink">Breakdown by category, course and specialisation</h4>
          <p className="mt-0.5 text-xs text-ink-faint">Optional. The figures above are the overall ones; add a row for each programme that has its own. Courses and specialisations are the ones ticked on the Courses &amp; Fees tab.</p>
        </div>
        <AddButton onClick={() => onChange([...rows, { ...blankBreakdown(), category: record.streams[0] ?? "" }])} disabled={rows.length >= 100}>Add a row</AddButton>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-ink-faint">No breakdown for this year. Only the overall figures are shown.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((b, i) => {
            const specs = specsOf(b.course);
            const odd = packageProblem(b.average, "", b.highest) || (b.placed !== null && b.students !== null && b.placed > b.students ? "More students placed than sat for placement." : "");
            const courses = coursesIn(b.category);
            const keep = courses.includes(b.course);
            return (
              <Row key={i} title={[b.category, b.course, b.specialisation].filter(Boolean).join(" · ") || `Row ${i + 1}`} index={i} count={rows.length} onRemove={() => onChange(rows.filter((_, n) => n !== i))}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectInput id={`${id}-${i}-cat`} label="Category" value={b.category} onChange={(v) => patch(i, { category: v, ...(coursesIn(v).includes(b.course) ? {} : { course: "", specialisation: "" }) })} options={categories} placeholder="Any category" />
                  <SelectInput id={`${id}-${i}-course`} label="Course" required value={b.course} onChange={(v) => patch(i, { course: v, specialisation: "" })} options={courses} placeholder={courses.length || keep ? "Choose a course" : "Tick courses on Courses & Fees first"} />
                  <SelectInput id={`${id}-${i}-spec`} label="Specialisation" value={b.specialisation} onChange={(v) => patch(i, { specialisation: v })} options={specs} placeholder="The course as a whole" />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <AmountField id={`${id}-${i}-avg`} label="Average package" units={["LPA", "Cr"]} value={b.average} onChange={(v) => patch(i, { average: v })} />
                  <AmountField id={`${id}-${i}-high`} label="Highest package" units={["LPA", "Cr"]} value={b.highest} onChange={(v) => patch(i, { highest: v })} />
                  <NumberInput id={`${id}-${i}-placed`} label="Students placed" min={0} max={100000} value={b.placed} onChange={(v) => patch(i, { placed: v })} />
                  <NumberInput id={`${id}-${i}-students`} label="Students in the batch" min={1} max={100000} value={b.students} onChange={(v) => patch(i, { students: v })} hint={b.placed !== null && b.students !== null && b.students > 0 ? `${Math.round((b.placed / b.students) * 100)}% placed.` : undefined} />
                </div>
                {odd && <p role="alert" className="mt-2 text-xs text-red-700">{odd}</p>}
              </Row>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PlacementsTab({ record, update, pools }: EditorProps) {
  const rows = record.placements;
  const set = (list: RecordPlacement[]) => update((r) => ({ ...r, placements: list }));
  const patch = (i: number, change: Partial<RecordPlacement>) => set(rows.map((p, n) => (n === i ? { ...p, ...change } : p)));

  return (
    <Card
      title="Placement records"
      description="One record for each batch year. The newest is the one the Placements tab leads with and the masthead's average package comes from; earlier years are listed under it."
      actions={<AddButton onClick={() => set([...rows, blankPlacement(rows)])} disabled={rows.length >= 15}>Add a year</AddButton>}
    >
      {rows.length === 0 ? (
        <EmptyNote>No placement data. The Placements tab shows an empty message.</EmptyNote>
      ) : (
        <ul className="space-y-4">
          {rows.map((p, i) => {
            const odd = packageProblem(p.average, "", p.highest);
            return (
              <Row key={i} title={`Batch ${p.year}`} index={i} count={rows.length} onRemove={() => set(rows.filter((_, n) => n !== i))}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <NumberInput id={`pl-${i}-year`} label="Batch year" required min={1990} max={THIS_YEAR + 1} value={p.year} onChange={(v) => patch(i, { year: v ?? THIS_YEAR })} />
                  <AmountField id={`pl-${i}-avg`} label="Average package" units={["LPA", "Cr"]} value={p.average} onChange={(v) => patch(i, { average: v })} />
                  <AmountField id={`pl-${i}-high`} label="Highest package" units={["LPA", "Cr"]} value={p.highest} onChange={(v) => patch(i, { highest: v })} />
                  <NumberInput id={`pl-${i}-placed`} label="Batch placed (%)" min={0} max={100} value={p.placedPercent} onChange={(v) => patch(i, { placedPercent: v })} hint={p.placedPercent !== null && (p.placedPercent < 0 || p.placedPercent > 100) ? "Batch placed must be between 0 and 100." : undefined} />
                </div>
                {odd && <p role="alert" className="mt-2 text-xs text-red-700">{odd}</p>}
                <div className="mt-4">
                  <ChipInput id={`pl-${i}-rec`} label="Top recruiters" value={p.topRecruiters} onChange={(v) => patch(i, { topRecruiters: v })} max={30} hint="Company names, shown as a scrolling strip." />
                </div>
                <BreakdownEditor id={`pl-${i}-bd`} rows={p.breakdown} onChange={(next) => patch(i, { breakdown: next })} record={record} pools={pools} />
              </Row>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Cut-offs ─────────────────────────────────────────────────────────────────

/** What a cut-off score is measured in. The score is saved as one piece of text ("98 percentile", "Rank 1200"), so it reads the same everywhere. */
const SCORE_TYPES = [
  { id: "percentile", label: "Percentile", hint: "e.g. 98.5 (0 to 100)" },
  { id: "percentage", label: "Percentage", hint: "e.g. 72 (0 to 100)" },
  { id: "rank", label: "Rank", hint: "e.g. 1200, or 1200 - 1500" },
  { id: "marks", label: "Marks", hint: "e.g. 172, or 172/300" },
  { id: "number", label: "Number", hint: "A plain figure" },
  { id: "text", label: "Text", hint: "Anything, e.g. Closed or To be announced" },
] as const;
type ScoreType = (typeof SCORE_TYPES)[number]["id"];

/** The type and value a saved score stands for. Anything that is not one of the shapes below is text. */
function parseScore(text: string): { type: ScoreType | null; value: string } {
  const t = text.trim();
  if (!t) return { type: null, value: "" };
  let m: RegExpExecArray | null;
  if ((m = /^(.*?)\s*percentile$/i.exec(t))) return { type: "percentile", value: m[1] };
  if ((m = /^(.*?)\s*%$/.exec(t))) return { type: "percentage", value: m[1] };
  if ((m = /^rank\s+(.+)$/i.exec(t))) return { type: "rank", value: m[1] };
  if ((m = /^([\d.,/\s-]+?)\s*marks?$/i.exec(t))) return { type: "marks", value: m[1] };
  if (/^[\d.,]+$/.test(t)) return { type: "number", value: t };
  return { type: "text", value: t };
}

function composeScore(type: ScoreType, value: string): string {
  const v = value.trim();
  if (!v) return "";
  return { percentile: `${v} percentile`, percentage: `${v}%`, rank: `Rank ${v}`, marks: `${v} marks`, number: v, text: v }[type];
}

/** A cut-off score: pick what it is measured in, then type the value (any characters). */
function ScoreInput({ id, value, onChange }: { id: string; value: string; onChange: (next: string) => void }) {
  const parsed = parseScore(value);
  // With nothing typed yet the chosen type is remembered here; once there is a value it is the value's own.
  const [chosen, setChosen] = useState<ScoreType>(parsed.type ?? "percentile");
  const type = parsed.type ?? chosen;
  const info = SCORE_TYPES.find((t) => t.id === type)!;
  const problem = scoreProblem(value);

  return (
    <Labelled id={id} label="Score" required hint={problem ? undefined : info.hint}>
      <div className="mt-1.5 flex gap-2">
        <select
          aria-label="Score type"
          value={type}
          onChange={(e) => {
            const next = e.target.value as ScoreType;
            setChosen(next);
            onChange(composeScore(next, parsed.value));
          }}
          className="shrink-0 rounded-lg border border-line bg-bg px-2 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          {SCORE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <input id={id} value={parsed.value} maxLength={80} aria-required="true" onChange={(e) => onChange(composeScore(type, e.target.value))} placeholder={type === "text" ? "e.g. Closed" : "e.g. 98"} className={inputCls} />
      </div>
      {problem && <p role="alert" className="mt-1 text-xs text-red-700">{problem}</p>}
    </Labelled>
  );
}

const blankCutoff = (): RecordCutoff => ({ exam: "", category: "General", course: "", specialisation: "", score: "" });
const cutoffKey = (c: RecordCutoff) => [c.exam, c.category, c.course, c.specialisation].map((x) => x.trim().toLowerCase()).join("|");

/**
 * The score needed for each entrance exam and caste, by course, and by specialisation under it (CSE, EEE...).
 * A card is one exam, caste and course; under it, a line for each specialisation with its own score, so "B.Tech: CSE 98,
 * EEE 92" is one card. A line with no specialisation is the course as a whole, and a card with no course applies to every
 * programme. Underneath each line is still a cut-off of its own, which is how it is saved and shown on the college page.
 * The courses and specialisations offered are the ones ticked on the Courses & Fees tab.
 */
export function CutoffsTab({ record, update, pools }: EditorProps) {
  const rows = record.cutoffs;
  const set = (list: RecordCutoff[]) => update((r) => ({ ...r, cutoffs: list }));
  const patch = (i: number, change: Partial<RecordCutoff>) => set(rows.map((c, n) => (n === i ? { ...c, ...change } : c)));
  const courseNames = [...new Set(record.courses.map((c) => c.name).filter(Boolean))];
  const specsOf = (course: string) => [...new Set(record.courses.filter((c) => (!course || c.name === course) && c.specialisation).map((c) => c.specialisation))];

  const seen = new Map<string, number>();
  rows.forEach((c) => seen.set(cutoffKey(c), (seen.get(cutoffKey(c)) ?? 0) + 1));

  // A card per exam + caste + course, in the order each first appears. A card with no exam yet stands alone.
  const groups: { key: string; at: number[] }[] = [];
  rows.forEach((c, i) => {
    const key = c.exam.trim() ? [c.exam, c.category, c.course].map((x) => x.trim().toLowerCase()).join("|") : `new-${i}`;
    const found = groups.find((g) => g.key === key);
    if (found) found.at.push(i);
    else groups.push({ key, at: [i] });
  });

  /** Changes the exam, caste or course of every line in a card. */
  const patchGroup = (at: number[], change: Partial<RecordCutoff>) =>
    set(rows.map((r, n) => {
      if (!at.includes(n)) return r;
      const next = { ...r, ...change };
      // A specialisation belongs to a course: one the new course does not offer is dropped.
      return "course" in change && next.specialisation && !specsOf(next.course).includes(next.specialisation) ? { ...next, specialisation: "" } : next;
    }));
  const addLine = (at: number[]) => {
    const last = at[at.length - 1];
    const head = rows[at[0]];
    const used = new Set(at.map((n) => rows[n].specialisation));
    const next = specsOf(head.course).find((sp) => !used.has(sp)) ?? "";
    const line: RecordCutoff = { exam: head.exam, category: head.category, course: head.course, specialisation: next, score: "" };
    set([...rows.slice(0, last + 1), line, ...rows.slice(last + 1)]);
  };

  return (
    <Card
      title="Cut-offs"
      description="The score needed for each entrance exam and caste. Pick a course to give it its own, and add a line for each specialisation (CSE, EEE...) with its own score. The Cut-Offs tab draws a bar for a percentile and shows other scores as they are."
      actions={<AddButton onClick={() => set([...rows, blankCutoff()])} disabled={rows.length >= 200}>Add a cut-off</AddButton>}
    >
      {rows.length === 0 ? (
        <EmptyNote>No cut-offs. The Cut-Offs tab shows an empty message.</EmptyNote>
      ) : (
        <ul className="space-y-4">
          {groups.map((g) => {
            const head = rows[g.at[0]];
            const specs = specsOf(head.course);
            const full = specs.length > 0 && g.at.length >= specs.length + 1;
            return (
              <Row
                key={g.key}
                title={[head.exam || "Exam", head.category || "Caste", head.course || "every programme"].join(" · ")}
                index={0}
                count={1}
                onRemove={() => set(rows.filter((_, n) => !g.at.includes(n)))}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectInput id={`cu-${g.at[0]}-exam`} label="Exam" required value={head.exam} onChange={(v) => patchGroup(g.at, { exam: v })} options={pools.exams} placeholder="Choose an exam" />
                  <SelectInput id={`cu-${g.at[0]}-cat`} label="Caste" value={head.category} onChange={(v) => patchGroup(g.at, { category: v })} options={CATEGORIES} />
                  <SelectInput
                    id={`cu-${g.at[0]}-course`}
                    label="Course"
                    value={head.course}
                    onChange={(v) => patchGroup(g.at, { course: v })}
                    options={courseNames}
                    placeholder="All courses"
                    hint={courseNames.length === 0 ? "Tick the courses on the Courses & Fees tab first." : "Leave as All courses for a cut-off that applies to every programme."}
                  />
                </div>

                <div className="mt-4 rounded-lg border border-line bg-surface p-3">
                  <p className="text-xs font-semibold text-ink">Cut-off{head.course ? ` for ${head.course}` : ""} <span className="font-normal text-ink-faint">— one line for each specialisation</span></p>
                  <ul className="mt-2 space-y-3">
                    {g.at.map((i) => {
                      const c = rows[i];
                      const duplicate = (seen.get(cutoffKey(c)) ?? 0) > 1;
                      const taken = new Set(g.at.filter((n) => n !== i).map((n) => rows[n].specialisation));
                      return (
                        <li key={i} className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                          <SelectInput id={`cu-${i}-spec`} label="Specialisation" value={c.specialisation} onChange={(v) => patch(i, { specialisation: v })} options={specs.filter((sp) => !taken.has(sp))} placeholder={head.course ? `${head.course} as a whole` : "All specialisations"} />
                          <ScoreInput id={`cu-${i}-score`} value={c.score} onChange={(v) => patch(i, { score: v })} />
                          {g.at.length > 1 ? (
                            <button type="button" aria-label="Remove this line" onClick={() => set(rows.filter((_, n) => n !== i))} className="mb-1 rounded-lg border border-line px-3 py-2 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">Remove line</button>
                          ) : (
                            <span />
                          )}
                          {duplicate && <p role="alert" className="text-xs text-red-700 md:col-span-3">This specialisation is listed more than once for this exam, caste and course.</p>}
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={() => addLine(g.at)}
                    disabled={!head.exam || full || rows.length >= 200}
                    className="mt-3 rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand"
                  >
                    + Add a specialisation
                  </button>
                  {head.course && specs.length === 0 && <p className="mt-2 text-xs text-ink-faint">{head.course} has no specialisations ticked on the Courses &amp; Fees tab.</p>}
                </div>
              </Row>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Rankings ─────────────────────────────────────────────────────────────────

/**
 * The college's place in the ranking lists, as the Rankings page shows it. Nothing is typed in by
 * hand: the rank on the college's cards is worked out from these. Adding or removing a ranking here
 * is saved at once (it edits the ranking list), not with the Save button.
 */
export function RankingsTab({ slug }: EditorProps) {
  const [data, setData] = useState<CollegeRankings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listSlug, setListSlug] = useState("");
  const [rank, setRank] = useState<number | null>(null);
  /** Who already has the rank typed in the chosen list. A rank belongs to one college in a list. */
  const [taken, setTaken] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [pending, startTransition] = useTransition();

  const load = () =>
    loadCollegeRankings(slug).then((result) => {
      if ("error" in result) return setError(result.error);
      setError(null);
      setData(result);
    });
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!listSlug || rank === null || rank < 1 || !Number.isInteger(rank)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTaken(null);
      return;
    }
    let current = true;
    const timer = setTimeout(async () => {
      const result = await checkRankHolder(listSlug, rank, slug);
      if (current) setTaken("error" in result || !result.holder ? null : `Rank ${rank} in ${result.list} is already held by ${result.holder.name}. Choose another rank, or change theirs first.`);
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [listSlug, rank, slug]);

  const run = (job: () => Promise<{ ok: true } | { error: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await job();
      if ("error" in result) return setError(result.error);
      after?.();
      await load();
    });

  const add = () => {
    if (!listSlug || rank === null) return;
    run(
      () => setCollegeRanking(listSlug, slug, rank, score),
      () => {
        setListSlug("");
        setRank(null);
        setScore("");
      },
    );
  };

  const label = (l: RankingListHead) => `${l.name}${l.name.includes(String(l.year)) ? "" : ` (${l.year})`}`;

  return (
    <Card title="Rankings" description="Where this college stands in each ranking list on the Rankings page. The rank on its cards is taken from these, with NIRF first. Add it to another list below; changes here are saved straight away.">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="text-sm text-ink-soft">Loading the rankings…</p>}

      {data && (
        <>
          {data.entries.length === 0 ? (
            <EmptyNote>This college is not in any ranking list yet.</EmptyNote>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {data.entries.map((e) => (
                <li key={e.slug} className="flex flex-wrap items-center gap-3 bg-bg-alt/40 px-4 py-3">
                  <span className="grid h-10 min-w-10 place-items-center rounded-lg bg-brand-soft px-2 text-base font-bold text-brand-ink">#{e.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{label(e)}</p>
                    <p className="text-xs text-ink-soft">
                      {e.authority}
                      {e.stream ? ` · ${e.stream}` : ""}
                      {e.score ? ` · Score ${e.score}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeCollegeRanking(e.slug, slug))}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-lg border border-dashed border-line p-4">
            <p className="text-sm font-semibold text-ink">Add to another ranking</p>
            {data.available.length === 0 ? (
              <p className="mt-1 text-xs text-ink-faint">It is already in every ranking list. Create a new list on the Rankings page in the admin to add more.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_120px_140px_auto] md:items-end">
                <SelectInput
                  id="rk-list"
                  label="Ranking list"
                  value={listSlug}
                  onChange={setListSlug}
                  placeholder="Choose a list"
                  options={data.available.map((l) => l.slug)}
                  labels={Object.fromEntries(data.available.map((l) => [l.slug, label(l)]))}
                />
                <NumberInput id="rk-rank" label="Rank" min={1} max={100000} value={rank} onChange={(v) => setRank(v)} hint={rank !== null && (rank < 1 || !Number.isInteger(rank)) ? "Rank must be a whole number, 1 or more." : undefined} />
                <TextInput id="rk-score" label="Score" max={50} value={score} onChange={setScore} placeholder="Optional" />
                <button
                  type="button"
                  onClick={add}
                  disabled={pending || !listSlug || rank === null || rank < 1 || !Number.isInteger(rank) || taken !== null}
                  className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
                >
                  {pending ? "Adding…" : "Add ranking"}
                </button>
              </div>
            )}
            {taken && <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{taken}</p>}
          </div>
        </>
      )}
      <p className="text-xs text-ink-faint">Approvals (AICTE, NAAC and so on) are edited on the College Info tab.</p>
    </Card>
  );
}
