"use client";

import { useEffect, useState, useTransition } from "react";
import type { CollegeRankings, RankingListHead, RecordCourse, RecordCutoff, RecordPlacement } from "@/lib/api";
import { loadCollegeRankings, removeCollegeRanking, setCollegeRanking } from "@/lib/admin-actions";
import { AmountField } from "@/components/admin/range-field";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { AddButton, Card, ChipInput, EmptyNote, NumberInput, Row, SelectInput, TextInput, move } from "@/components/admin/college-editor/shared";

/*
  The tabs that are tables of figures: Courses & Fees, Placements, Cut-Offs and Rankings.
  Each row is chosen from the directory where there is a list to choose from (the courses and
  entrance exams already on the site) and checked as it is typed; the server checks again.
*/

const MODES = ["Full Time", "Part Time", "Weekend", "Online", "Distance"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "PwD", "Other"];
const THIS_YEAR = new Date().getFullYear();

// ── Courses & fees ───────────────────────────────────────────────────────────

const blankCourse = (): RecordCourse => ({ name: "", duration: "", mode: "Full Time", fees: "", exams: [], eligibility: "", seats: null });

export function CoursesTab({ record, update, pools }: EditorProps) {
  const rows = record.courses;
  const set = (list: RecordCourse[]) => update((r) => ({ ...r, courses: list }));
  const patch = (i: number, change: Partial<RecordCourse>) => set(rows.map((c, n) => (n === i ? { ...c, ...change } : c)));

  return (
    <Card
      title="Programmes and fees"
      description="Every programme the college offers. The Courses and Fees tabs of the college page are built from this list, and the number of programmes follows it."
      actions={<AddButton onClick={() => set([...rows, blankCourse()])} disabled={rows.length >= 60}>Add a programme</AddButton>}
    >
      <datalist id="courses-pool">
        {pools.courses.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {rows.length === 0 ? (
        <EmptyNote>No programmes yet. The Courses and Fees tabs show an empty message until one is added.</EmptyNote>
      ) : (
        <ul className="space-y-4">
          {rows.map((c, i) => (
            <Row key={i} title={c.name || `Programme ${i + 1}`} index={i} count={rows.length} onMove={(d) => set(move(rows, i, d))} onRemove={() => set(rows.filter((_, n) => n !== i))}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <TextInput id={`co-${i}-name`} label="Programme" required max={200} list="courses-pool" value={c.name} onChange={(v) => patch(i, { name: v })} hint="Choose a course from the directory or type one." />
                <TextInput id={`co-${i}-duration`} label="Duration" required max={100} value={c.duration} onChange={(v) => patch(i, { duration: v })} placeholder="e.g. 2 Years" />
                <SelectInput id={`co-${i}-mode`} label="Mode" value={c.mode} onChange={(v) => patch(i, { mode: v })} options={MODES} />
                <AmountField id={`co-${i}-fees`} label="Total fees" joined units={["L", "Cr"]} value={c.fees} onChange={(v) => patch(i, { fees: v })} hint="In lakh (L) or crore (Cr)." />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <ChipInput id={`co-${i}-exams`} label="Entrance exams" value={c.exams} onChange={(v) => patch(i, { exams: v })} suggestions={pools.exams} max={20} />
                <div className="space-y-4">
                  <TextInput id={`co-${i}-elig`} label="Eligibility" max={300} value={c.eligibility} onChange={(v) => patch(i, { eligibility: v })} placeholder="e.g. Graduation with 50%" />
                  <NumberInput id={`co-${i}-seats`} label="Seats" min={1} max={100000} value={c.seats} onChange={(v) => patch(i, { seats: v })} />
                </div>
              </div>
            </Row>
          ))}
        </ul>
      )}
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

const lakh = (text: string) => {
  const n = Number(/[\d.]+/.exec(text)?.[0]);
  return Number.isFinite(n) ? n : null;
};

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
            const avg = lakh(p.average);
            const med = lakh(p.median);
            const high = lakh(p.highest);
            const odd = high !== null && ((avg !== null && high < avg) || (med !== null && high < med));
            return (
              <Row key={i} title={`Batch ${p.year}`} index={i} count={rows.length} onRemove={() => set(rows.filter((_, n) => n !== i))}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <NumberInput id={`pl-${i}-year`} label="Batch year" required min={1990} max={THIS_YEAR + 1} value={p.year} onChange={(v) => patch(i, { year: v ?? THIS_YEAR })} />
                  <AmountField id={`pl-${i}-avg`} label="Average package" units={["LPA", "Cr"]} value={p.average} onChange={(v) => patch(i, { average: v })} />
                  <AmountField id={`pl-${i}-med`} label="Median package" units={["LPA", "Cr"]} value={p.median} onChange={(v) => patch(i, { median: v })} />
                  <AmountField id={`pl-${i}-high`} label="Highest package" units={["LPA", "Cr"]} value={p.highest} onChange={(v) => patch(i, { highest: v })} />
                  <NumberInput id={`pl-${i}-placed`} label="Batch placed (%)" min={0} max={100} value={p.placedPercent} onChange={(v) => patch(i, { placedPercent: v === null ? null : Math.max(0, Math.min(100, Math.round(v))) })} />
                </div>
                {odd && <p role="status" className="mt-2 text-xs text-amber-800">Check the packages: the highest should not be below the average or the median.</p>}
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
      actions={<AddButton onClick={() => set([...rows, { exam: pools.exams[0] ?? "", category: "General", score: "" }])} disabled={rows.length >= 200}>Add a cut-off</AddButton>}
    >
      <datalist id="cutoff-exams">
        {pools.exams.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>
      {rows.length === 0 ? (
        <EmptyNote>No cut-offs. The Cut-Offs tab shows an empty message.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {rows.map((c, i) => {
            const duplicate = (seen.get(`${c.exam.trim().toLowerCase()}|${c.category.trim().toLowerCase()}`) ?? 0) > 1;
            return (
              <Row key={i} title={`${c.exam || "Exam"} · ${c.category || "Category"}`} index={i} count={rows.length} onRemove={() => set(rows.filter((_, n) => n !== i))} error={duplicate ? "This exam and category is listed more than once." : undefined}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <TextInput id={`cu-${i}-exam`} label="Exam" required max={100} list="cutoff-exams" value={c.exam} onChange={(v) => patch(i, { exam: v })} />
                  <SelectInput id={`cu-${i}-cat`} label="Category" value={c.category} onChange={(v) => patch(i, { category: v })} options={CATEGORIES} />
                  <TextInput id={`cu-${i}-score`} label="Score" required max={100} value={c.score} onChange={(v) => patch(i, { score: v })} placeholder="e.g. 98 percentile" hint="A percentile, a rank or marks." />
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
                <NumberInput id="rk-rank" label="Rank" min={1} max={100000} value={rank} onChange={(v) => setRank(v === null ? null : Math.max(1, Math.round(v)))} />
                <TextInput id="rk-score" label="Score" max={50} value={score} onChange={setScore} placeholder="Optional" />
                <button
                  type="button"
                  onClick={add}
                  disabled={pending || !listSlug || rank === null}
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
