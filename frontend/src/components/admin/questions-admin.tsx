"use client";

import { Fragment, useState, useTransition } from "react";
import { CheckCircle2, Clock, Eye, EyeOff, Loader2, ThumbsUp } from "lucide-react";
import { answerQuestion, setQuestionPublished } from "@/lib/admin-actions";
import { formatFull } from "@/lib/lead-labels";
import type { AdminQuestion, AnswerRole } from "@/lib/api";
import { optionsOf, useTableTools } from "@/components/admin/table-tools";

type Filter = "all" | "waiting" | "answered" | "shown";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "waiting", label: "Waiting for an answer" },
  { key: "answered", label: "Answered" },
  { key: "shown", label: "On the Q&A page" },
];

/**
 * The question inbox. Each card shows the student's question, a box for the answer, and who the answer is
 * credited to: Career Experts for the platform team, the college for a college admin. Saving replaces any
 * earlier answer. The platform team also has the button that puts a question and its answer on the college's
 * Q&A page; a college admin's answer has to be approved there again.
 */
export function QuestionsAdmin({ role, items: initial, initialCollege }: { role: AnswerRole; items: AdminQuestion[]; initialCollege?: string }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = items.filter((q) => (filter === "waiting" ? !q.answer : filter === "answered" ? !!q.answer : filter === "shown" ? q.published : true));
  const counts: Record<Filter, number> = {
    all: items.length,
    waiting: items.filter((q) => !q.answer).length,
    answered: items.filter((q) => q.answer).length,
    shown: items.filter((q) => q.published).length,
  };

  const t = useTableTools<AdminQuestion>({
    rows: shown,
    search: (q) => [q.collegeName, q.askedBy, q.askedByEmail, q.question, q.answer ?? ""].join(" "),
    placeholder: "Search college, student, question",
    initialFilters: initialCollege && role === "experts" ? { college: initialCollege } : undefined,
    sorts: {
      college: (q) => q.collegeName,
      type: (q) => q.kind,
      askedBy: (q) => q.askedBy,
      question: (q) => q.question,
      date: (q) => (q.createdAt ? Date.parse(q.createdAt) : null),
      status: (q) => (q.answer ? 1 : 0),
      published: (q) => (q.published ? 1 : 0),
    },
    filters: [
      ...(role === "experts" ? [{ key: "college", label: "College", options: optionsOf(items, (q) => q.collegeName), match: (q: AdminQuestion, v: string) => q.collegeName === v }] : []),
      { key: "type", label: "Type", options: [{ value: "question", label: "Question" }, { value: "concern", label: "Concern" }], match: (q, v) => q.kind === v },
    ],
  });

  const patch = (id: string, change: Partial<AdminQuestion>) => setItems((current) => current.map((q) => (q.id === id ? { ...q, ...change } : q)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter questions">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${filter === f.key ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-brand hover:text-brand"}`}
          >
            {f.label} <span className={filter === f.key ? "text-white/80" : "text-ink-faint"}>({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-soft">
          {items.length === 0 ? "No questions yet. They appear here when students ask." : "Nothing in this view."}
        </p>
      ) : (
        <>
        {t.toolbar}
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead className="bg-bg-alt text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                {t.th("college", "College")}
                {t.th("type", "Type")}
                {t.th("askedBy", "Asked by")}
                {t.th("question", "Question")}
                {t.th("date", "Asked on")}
                {t.th("status", "Status")}
                {t.th("published", "On Q&A page")}
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {t.rows.map((q) => (
                <Fragment key={q.id}>
                  <tr className={openId === q.id ? "bg-brand-soft/30" : "hover:bg-bg-alt/50"}>
                    <td className="px-3 py-2.5 font-semibold text-ink">{q.collegeName}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{q.kind === "concern" ? "Concern" : "Question"}</td>
                    <td className="px-3 py-2.5 text-ink-soft">
                      {q.askedBy}
                      {role === "experts" && q.askedByEmail && <span className="block text-xs text-ink-faint">{q.askedByEmail}</span>}
                    </td>
                    <td className="max-w-[18rem] px-3 py-2.5 text-ink"><span className="line-clamp-2">{q.question}</span></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{formatFull(q.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      {q.answer ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> {q.answeredBy}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900"><Clock className="h-3.5 w-3.5" /> Waiting</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {q.published ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink"><Eye className="h-3.5 w-3.5" /> Shown{q.helpful > 0 ? ` · ${q.helpful} helpful` : ""}</span> : <span className="text-ink-faint">–</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <button type="button" onClick={() => setOpenId(openId === q.id ? null : q.id)} className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand">
                        {openId === q.id ? "Close" : q.answer ? "View" : "Reply"}
                      </button>
                    </td>
                  </tr>
                  {openId === q.id && (
                    <tr className="bg-bg-alt/40">
                      <td colSpan={8} className="px-4 py-4">
                        <QuestionCard q={q} role={role} onChange={(change) => patch(q.id, change)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function QuestionCard({ q, role, onChange }: { q: AdminQuestion; role: AnswerRole; onChange: (change: Partial<AdminQuestion>) => void }) {
  const [draft, setDraft] = useState(q.answer ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const changed = draft.trim() !== (q.answer ?? "").trim();
  const asExperts = role === "experts";

  const save = () =>
    start(async () => {
      setMessage(null);
      const result = await answerQuestion(q.id, draft);
      if ("error" in result) return setMessage({ ok: false, text: result.error });
      onChange({
        answer: draft.trim(),
        answeredBy: asExperts ? "Career Experts" : "College",
        answeredByRole: role,
        answeredAt: new Date().toISOString(),
        // A college's own answer has to be approved again before it is shown.
        published: asExperts ? q.published : false,
      });
      setMessage({ ok: true, text: "Answer saved. The student has been told." });
    });

  const publish = (next: boolean) =>
    start(async () => {
      setMessage(null);
      const result = await setQuestionPublished(q.id, next);
      if ("error" in result) return setMessage({ ok: false, text: result.error });
      onChange({ published: next });
      setMessage({ ok: true, text: next ? "Now shown on the college's Q&A page." : "Hidden from the Q&A page." });
    });

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-base font-bold text-ink">{q.collegeName}</p>
          <p className="text-xs text-ink-faint">
            {q.kind === "concern" ? "Concern" : "Question"} from {q.askedBy}
            {asExperts && q.askedByEmail ? ` (${q.askedByEmail})` : ""} · {formatFull(q.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {q.helpful > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-bg-alt px-2.5 py-0.5 text-xs font-semibold text-ink-soft"><ThumbsUp className="h-3.5 w-3.5" /> {q.helpful} helpful</span>}
          {q.published && <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-ink"><Eye className="h-3.5 w-3.5" /> On Q&amp;A page</span>}
          {q.answer ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> Answered by {q.answeredBy}</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900"><Clock className="h-3.5 w-3.5" /> Waiting</span>
          )}
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-bg-alt px-4 py-3 text-sm text-ink">{q.question}</p>

      <label htmlFor={`answer-${q.id}`} className="mt-4 block text-xs font-semibold text-ink">
        {q.answer ? "Answer" : "Your answer"} <span className="font-normal text-ink-faint">(replied as {asExperts ? "Career Experts" : "the college"}{q.answer && q.answeredByRole !== role ? `; saving replaces ${q.answeredBy}'s answer` : ""})</span>
      </label>
      <textarea
        id={`answer-${q.id}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Write the answer the student will see."
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={pending || !changed || draft.trim().length < 2} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {q.answer ? "Save changes" : "Send answer"}
        </button>
        {asExperts && q.answer && (
          <button type="button" onClick={() => publish(!q.published)} disabled={pending} className="inline-flex items-center gap-2 rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-50">
            {q.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {q.published ? "Hide from the Q&A page" : "Show on the Q&A page"}
          </button>
        )}
        {!asExperts && q.answer && !q.published && <span className="text-xs text-ink-faint">Waiting for the platform team to approve it for the Q&amp;A page.</span>}
      </div>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-2 text-sm ${message.ok ? "font-medium text-emerald-700" : "text-red-700"}`}>{message.text}</p>
      )}
    </div>
  );
}
