"use client";

import type { RecordCourse, RecordCutoff, RecordPlacement } from "@/lib/api";
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
const RANKINGS = ["NIRF", "QS", "Times Higher Education", "India Today", "Outlook", "The Week", "Business Today", "Careers360"];
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

export function RankingsTab({ record, update }: EditorProps) {
  const set = (patch: Partial<typeof record>) => update((r) => ({ ...r, ...patch }));
  const half = (record.rankingAuthority.trim() === "") !== (record.rankingRank === null);

  return (
    <Card title="Ranking" description="The college's rank with one ranking body. The Rankings tab sets it among the other colleges of the same category, using the ranks those colleges carry.">
      <div className="grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
        <TextInput id="rk-authority" label="Ranking" max={100} list="rankings-pool" value={record.rankingAuthority} onChange={(v) => set({ rankingAuthority: v })} placeholder="e.g. NIRF" hint="Choose a ranking body or type one." />
        <NumberInput id="rk-rank" label="Rank" min={1} max={10000} value={record.rankingRank} onChange={(v) => set({ rankingRank: v === null ? null : Math.max(1, Math.round(v)) })} />
      </div>
      <datalist id="rankings-pool">
        {RANKINGS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      {half && <p role="alert" className="text-xs text-red-700">Give both the ranking and its rank, or neither.</p>}
      <p className="text-xs text-ink-faint">Approvals (AICTE, NAAC and so on) are edited on the College Info tab.</p>
    </Card>
  );
}
