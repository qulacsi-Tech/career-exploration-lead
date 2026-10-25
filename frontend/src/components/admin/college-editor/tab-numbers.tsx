"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import type { CollegeRankings, RankingListHead, RecordCourse, RecordCutoff, RecordPlacement } from "@/lib/api";
import { loadCollegeRankings, removeCollegeRanking, setCollegeRanking } from "@/lib/admin-actions";
import { AmountField } from "@/components/admin/range-field";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { packageProblem } from "@/lib/college-rules";
import { CategoryTicks, CourseTicks, type CoursePick } from "@/components/admin/college-editor/course-picker";
import { AddButton, Card, ChipInput, DurationField, EmptyNote, NumberInput, Row, SelectInput, TextInput, move } from "@/components/admin/college-editor/shared";

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
});

export function PlacementsTab({ record, update }: EditorProps) {
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
              </Row>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Cut-offs ─────────────────────────────────────────────────────────────────

export function CutoffsTab({ record, update, pools }: EditorProps) {
  const rows = record.cutoffs;
  const set = (list: RecordCutoff[]) => update((r) => ({ ...r, cutoffs: list }));
  const patch = (i: number, change: Partial<RecordCutoff>) => set(rows.map((c, n) => (n === i ? { ...c, ...change } : c)));
  const seen = new Map<string, number>();
  rows.forEach((c) => seen.set(`${c.exam.trim().toLowerCase()}|${c.category.trim().toLowerCase()}`, (seen.get(`${c.exam.trim().toLowerCase()}|${c.category.trim().toLowerCase()}`) ?? 0) + 1));

  return (
    <Card
      title="Cut-offs"
      description="The score needed for each entrance exam and category. The Cut-Offs tab draws a bar for a percentile and shows other scores as they are."
      actions={<AddButton onClick={() => set([...rows, { exam: "", category: "General", score: "" }])} disabled={rows.length >= 200}>Add a cut-off</AddButton>}
    >
      {rows.length === 0 ? (
        <EmptyNote>No cut-offs. The Cut-Offs tab shows an empty message.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {rows.map((c, i) => {
            const duplicate = (seen.get(`${c.exam.trim().toLowerCase()}|${c.category.trim().toLowerCase()}`) ?? 0) > 1;
            return (
              <Row key={i} title={`${c.exam || "Exam"} · ${c.category || "Category"}`} index={i} count={rows.length} onRemove={() => set(rows.filter((_, n) => n !== i))} error={duplicate ? "This exam and category is listed more than once." : undefined}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SelectInput id={`cu-${i}-exam`} label="Exam" required value={c.exam} onChange={(v) => patch(i, { exam: v })} options={pools.exams} placeholder="Choose an exam" />
                  <SelectInput id={`cu-${i}-cat`} label="Category" value={c.category} onChange={(v) => patch(i, { category: v })} options={CATEGORIES} />
                  <TextInput id={`cu-${i}-score`} label="Score" required max={100} value={c.score} onChange={(v) => patch(i, { score: v })} placeholder="e.g. 98 percentile" hint="A percentile (0-100), a rank or marks." />
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
                  disabled={pending || !listSlug || rank === null || rank < 1 || !Number.isInteger(rank)}
                  className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
                >
                  {pending ? "Adding…" : "Add ranking"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <p className="text-xs text-ink-faint">Approvals (AICTE, NAAC and so on) are edited on the College Info tab.</p>
    </Card>
  );
}
