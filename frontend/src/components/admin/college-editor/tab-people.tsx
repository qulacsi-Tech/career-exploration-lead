"use client";

import { useState } from "react";
import type { FacultyMember, RecordReview } from "@/lib/api";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { AddButton, Card, EmptyNote, IsoDate, NumberInput, Row, SelectInput, TextArea, TextInput, move, today } from "@/components/admin/college-editor/shared";

/*
  The tabs about people and questions: Reviews, Faculty, Q&A and Compare.
*/

// ── Reviews ──────────────────────────────────────────────────────────────────

const blankReview = (course: string): RecordReview => ({
  author: "",
  course,
  batch: "",
  verified: false,
  date: today(),
  rating: 4,
  body: "",
  ratingPlacements: null,
  ratingFaculty: null,
  ratingInfrastructure: null,
  ratingCampusLife: null,
  approved: true,
});

export function ReviewsTab({ record, update }: EditorProps) {
  const rows = record.reviews;
  const set = (list: RecordReview[]) => update((r) => ({ ...r, reviews: list }));
  const patch = (i: number, change: Partial<RecordReview>) => set(rows.map((r, n) => (n === i ? { ...r, ...change } : r)));
  const courseNames = [...new Set(record.courses.map((c) => c.name).filter(Boolean))];
  const approved = rows.filter((r) => r.approved);
  const average = approved.length > 0 ? approved.reduce((t, r) => t + r.rating, 0) / approved.length : null;

  return (
    <Card
      title="Student reviews"
      description="Approved reviews appear on the Reviews tab (the ten newest) and set the college's rating and review count. A review that is not approved is kept here but hidden from the site."
      actions={<AddButton onClick={() => set([blankReview(courseNames[0] ?? ""), ...rows])} disabled={rows.length >= 100}>Add a review</AddButton>}
    >
      <p className="text-sm text-ink-soft">
        {rows.length} review{rows.length === 1 ? "" : "s"}, {approved.length} approved
        {average !== null && <> · the rating will be <strong className="text-ink">{average.toFixed(1)}</strong> out of 5</>}
      </p>
      {rows.length === 0 ? (
        <EmptyNote>No reviews. The Reviews tab invites the first one.</EmptyNote>
      ) : (
        <ul className="space-y-4">
          {rows.map((r, i) => (
            <Row key={r.id ?? `new-${i}`} title={`${r.author || "Reviewer"} · ${r.course || "course"}`} index={i} count={rows.length} onRemove={() => set(rows.filter((_, n) => n !== i))}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <TextInput id={`rv-${i}-author`} label="Reviewer" required max={200} value={r.author} onChange={(v) => patch(i, { author: v })} />
                <SelectInput id={`rv-${i}-course`} label="Programme" required value={r.course} onChange={(v) => patch(i, { course: v })} options={courseNames} placeholder="Select a programme" hint={courseNames.length === 0 ? "Add programmes on the Courses tab first." : undefined} />
                <TextInput id={`rv-${i}-batch`} label="Batch" required max={50} value={r.batch} onChange={(v) => patch(i, { batch: v })} placeholder="e.g. 2023-25" />
                <IsoDate id={`rv-${i}-date`} label="Review date" value={r.date} onChange={(v) => patch(i, { date: v || r.date })} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
                <NumberInput id={`rv-${i}-rating`} label="Overall (0-5)" required min={0} max={5} step={0.1} value={r.rating} onChange={(v) => patch(i, { rating: v === null ? 0 : Math.max(0, Math.min(5, v)) })} />
                <NumberInput id={`rv-${i}-rp`} label="Placements" min={0} max={5} step={0.1} value={r.ratingPlacements} onChange={(v) => patch(i, { ratingPlacements: v === null ? null : Math.max(0, Math.min(5, v)) })} />
                <NumberInput id={`rv-${i}-rf`} label="Faculty" min={0} max={5} step={0.1} value={r.ratingFaculty} onChange={(v) => patch(i, { ratingFaculty: v === null ? null : Math.max(0, Math.min(5, v)) })} />
                <NumberInput id={`rv-${i}-ri`} label="Infrastructure" min={0} max={5} step={0.1} value={r.ratingInfrastructure} onChange={(v) => patch(i, { ratingInfrastructure: v === null ? null : Math.max(0, Math.min(5, v)) })} />
                <NumberInput id={`rv-${i}-rc`} label="Campus life" min={0} max={5} step={0.1} value={r.ratingCampusLife} onChange={(v) => patch(i, { ratingCampusLife: v === null ? null : Math.max(0, Math.min(5, v)) })} />
              </div>
              <div className="mt-4">
                <TextArea id={`rv-${i}-body`} label="Review" required rows={3} max={2000} value={r.body} onChange={(v) => patch(i, { body: v })} />
              </div>
              <div className="mt-3 flex flex-wrap gap-5">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={r.verified} onChange={(e) => patch(i, { verified: e.target.checked })} className="h-4 w-4 accent-[var(--color-brand)]" />
                  Verified student
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={r.approved} onChange={(e) => patch(i, { approved: e.target.checked })} className="h-4 w-4 accent-[var(--color-brand)]" />
                  Approved: show on the site
                </label>
              </div>
            </Row>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Faculty ──────────────────────────────────────────────────────────────────

export function FacultyTab({ record, update }: EditorProps) {
  const faculty = record.detail.faculty;
  const setFaculty = (patch: Partial<typeof faculty>) => update((r) => ({ ...r, detail: { ...r.detail, faculty: { ...r.detail.faculty, ...patch } } }));
  const members = faculty.members;
  const setMembers = (list: FacultyMember[]) => setFaculty({ members: list });
  const patch = (i: number, change: Partial<FacultyMember>) => setMembers(members.map((m, n) => (n === i ? { ...m, ...change } : m)));

  return (
    <div className="space-y-5">
      <Card title="Faculty at a glance" description="Three figures at the top of the Faculty tab. Leave a box empty to leave that figure out.">
        <div className="grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-3">
          <NumberInput id="fa-count" label="Faculty members" min={0} max={100000} value={faculty.count} onChange={(v) => setFaculty({ count: v === null ? null : Math.max(0, Math.round(v)) })} />
          <TextInput id="fa-ratio" label="Student to faculty ratio" max={20} value={faculty.studentRatio} onChange={(v) => setFaculty({ studentRatio: v })} placeholder="15:1" hint="Written as 15:1." />
          <NumberInput id="fa-phd" label="Hold a PhD (%)" min={0} max={100} value={faculty.phdPercent} onChange={(v) => setFaculty({ phdPercent: v === null ? null : Math.max(0, Math.min(100, Math.round(v))) })} />
        </div>
      </Card>

      <Card
        title="Faculty members"
        description="The roster table on the Faculty tab."
        actions={<AddButton onClick={() => setMembers([...members, { name: "", designation: "", department: "", qualification: "" }])} disabled={members.length >= 60}>Add a member</AddButton>}
      >
        {members.length === 0 ? (
          <EmptyNote>No faculty listed.</EmptyNote>
        ) : (
          <ul className="space-y-3">
            {members.map((m, i) => (
              <Row key={i} title={m.name || `Member ${i + 1}`} index={i} count={members.length} onMove={(d) => setMembers(move(members, i, d))} onRemove={() => setMembers(members.filter((_, n) => n !== i))}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <TextInput id={`fm-${i}-name`} label="Name" required max={120} value={m.name} onChange={(v) => patch(i, { name: v })} />
                  <TextInput id={`fm-${i}-desig`} label="Designation" max={120} value={m.designation} onChange={(v) => patch(i, { designation: v })} placeholder="e.g. Professor" />
                  <TextInput id={`fm-${i}-dept`} label="Department" max={120} value={m.department} onChange={(v) => patch(i, { department: v })} />
                  <TextInput id={`fm-${i}-qual`} label="Qualification" max={160} value={m.qualification} onChange={(v) => patch(i, { qualification: v })} placeholder="e.g. PhD, IIM Bangalore" />
                </div>
              </Row>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ── Q&A ──────────────────────────────────────────────────────────────────────

export function FaqTab({ record, update }: EditorProps) {
  const rows = record.detail.faqs;
  const set = (list: typeof rows) => update((r) => ({ ...r, detail: { ...r.detail, faqs: list } }));
  const patch = (i: number, change: Partial<(typeof rows)[number]>) => set(rows.map((f, n) => (n === i ? { ...f, ...change } : f)));

  return (
    <Card
      title="Questions and answers"
      description="Written by you, and shown first on the Q&A tab. The site also adds answers it works out from the college's record (courses, placements, cut-offs, ranking), leaving out any question you have already written."
      actions={<AddButton onClick={() => set([...rows, { question: "", answer: "" }])} disabled={rows.length >= 30}>Add a question</AddButton>}
    >
      {rows.length === 0 ? (
        <EmptyNote>None written. The Q&A tab shows the answers the site works out.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {rows.map((f, i) => (
            <Row key={i} title={f.question || `Question ${i + 1}`} index={i} count={rows.length} onMove={(d) => set(move(rows, i, d))} onRemove={() => set(rows.filter((_, n) => n !== i))}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TextInput id={`fq-${i}-q`} label="Question" required max={300} value={f.question} onChange={(v) => patch(i, { question: v })} />
                <TextArea id={`fq-${i}-a`} label="Answer" required rows={3} max={2000} value={f.answer} onChange={(v) => patch(i, { answer: v })} />
              </div>
            </Row>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Compare ──────────────────────────────────────────────────────────────────

export function CompareTab({ record, update, pools, slug }: EditorProps) {
  const pinned = record.detail.similarSlugs;
  const [pick, setPick] = useState("");
  const set = (list: string[]) => update((r) => ({ ...r, detail: { ...r.detail, similarSlugs: list } }));
  const options = pools.colleges.filter((c) => c.slug !== slug && !pinned.includes(c.slug));
  const nameOf = (s: string) => pools.colleges.find((c) => c.slug === s)?.name ?? s;

  return (
    <Card
      title="Similar colleges"
      description="The colleges the Compare tab sets this one against (the first two are used). Leave it empty and the site picks the nearest by category and rank."
    >
      {pinned.length > 0 && (
        <ol className="space-y-2">
          {pinned.map((s, i) => (
            <li key={s} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg-alt/50 px-4 py-2.5">
              <span className="w-6 text-sm font-semibold text-ink-soft">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{nameOf(s)}</span>
              <button type="button" aria-label={`Move ${nameOf(s)} up`} disabled={i === 0} onClick={() => set(move(pinned, i, -1))} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
              <button type="button" aria-label={`Move ${nameOf(s)} down`} disabled={i === pinned.length - 1} onClick={() => set(move(pinned, i, 1))} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
              <button type="button" onClick={() => set(pinned.filter((x) => x !== s))} className="rounded-lg border border-line px-3 py-1 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">Remove</button>
            </li>
          ))}
        </ol>
      )}
      {pinned.length < 8 && (
        <div className="flex max-w-xl items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="cmp-pick" className="block text-xs font-semibold text-ink">Add a college</label>
            <select id="cmp-pick" value={pick} onChange={(e) => setPick(e.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none">
              <option value="">Choose a college</option>
              {options.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <AddButton onClick={() => { if (pick) { set([...pinned, pick]); setPick(""); } }} disabled={!pick}>Add</AddButton>
        </div>
      )}
      {pinned.length === 0 && <p className="text-xs text-ink-faint">None pinned: the nearest colleges by category and rank are used.</p>}
    </Card>
  );
}
