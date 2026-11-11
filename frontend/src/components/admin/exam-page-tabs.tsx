"use client";

import { useEffect, useState } from "react";
import type { Exam } from "@/lib/api";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { loadExamColleges } from "@/lib/admin-actions";
import { PAGE_TEXT_GROUPS } from "@/lib/exam-page-text";

/*
  More tabs of an exam's Edit form, so everything on the exam's page is set from there: the card photo, badge and
  category; eligibility and FAQs; every heading and short line; and the order of the colleges listed under the exam.
  Each tab keeps its values in a hidden field that the form's Save button sends with the rest.
*/

const field = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

/** These tabs sit inside the Edit form: Enter in a text box must not save and close it. */
const noEnterSubmit = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
};

/** A saved value the edit form may hold as an object or, after a save, as the JSON text it posted. */
function jsonOf<T>(value: unknown, fallback: T): T {
  // A list field comes back from a save as a one-item list holding the posted JSON text.
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === "string") return jsonOf(value[0], fallback);
  if (value && typeof value === "object") return value as T;
  if (typeof value === "string" && value) {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** "CAT" from the short name, the code in brackets, or the name itself. */
function codeOf(exam: Exam): string {
  return exam.shortName?.trim() || exam.name.match(/\(([^)]+)\)/)?.[1]?.trim() || exam.name.replace(/\s*\(.*\)\s*/, "").trim() || exam.name;
}

const STATUS_OPTIONS = ["", "Upcoming", "Live", "Expired"];

/** The exam's photo, its badge and the category it is listed under. */
export function ExamCardTab({ exam, streams }: { exam: Exam; streams: string[] }) {
  const [image, setImage] = useState(exam.image ?? "");
  const [status, setStatus] = useState(exam.statusLabel ?? "");
  const custom = status !== "" && !STATUS_OPTIONS.includes(status);
  return (
    <div className="grid gap-6 lg:grid-cols-2" onKeyDown={noEnterSubmit}>
      <div>
        <p className="text-xs font-semibold text-ink">Photo or logo</p>
        <p className="mt-0.5 text-xs text-ink-faint">On the listing card and at the top of the exam&apos;s page.</p>
        <input type="hidden" name="image" value={image} />
        <div className="mt-2">
          <ImageUploadField kind="exam" value={image} onChange={setImage} fallbackNote="No photo. The card shows the exam's short name." />
        </div>
      </div>
      <div className="space-y-5">
        <div>
          <label htmlFor="exam-stream" className="block text-xs font-semibold text-ink">Category</label>
          <input id="exam-stream" name="stream" list="exam-stream-options" maxLength={100} defaultValue={exam.stream ?? ""} placeholder="e.g. Management" className={field} />
          <datalist id="exam-stream-options">
            {streams.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-ink-faint">Shown as a chip, and used by the Stream filter on the listing.</p>
        </div>
        <div>
          <label htmlFor="exam-status" className="block text-xs font-semibold text-ink">Badge</label>
          <select
            id="exam-status"
            value={custom ? "__custom" : status}
            onChange={(e) => setStatus(e.target.value === "__custom" ? "Coming soon" : e.target.value)}
            className={field}
          >
            <option value="">No badge</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Live">Live</option>
            <option value="Expired">Expired</option>
            <option value="__custom">Other words…</option>
          </select>
          {custom && <input aria-label="Badge words" maxLength={40} value={status} onChange={(e) => setStatus(e.target.value)} className={field} />}
          <input type="hidden" name="statusLabel" value={status} />
          <p className="mt-1 text-xs text-ink-faint">The coloured badge beside the name: green for Live, amber for Upcoming, grey for Expired.</p>
        </div>
      </div>
    </div>
  );
}

type Faq = { question: string; answer: string };

/** Who can sit the exam, and the questions and answers at the end of its page. */
export function ExamEligibilityTab({ exam }: { exam: Exam }) {
  const [faqs, setFaqs] = useState<Faq[]>(() => jsonOf<Faq[]>(exam.faqs, []));
  const set = (i: number, change: Partial<Faq>) => setFaqs((all) => all.map((f, j) => (j === i ? { ...f, ...change } : f)));
  const move = (i: number, by: -1 | 1) =>
    setFaqs((all) => {
      const j = i + by;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  // Only complete questions are stored; a half-filled one would be refused.
  const complete = faqs.filter((f) => f.question.trim().length >= 3 && f.answer.trim());
  const incomplete = faqs.length - complete.length;

  return (
    <div className="space-y-6" onKeyDown={noEnterSubmit}>
      <div>
        <label htmlFor="exam-eligibility" className="block text-xs font-semibold text-ink">Eligibility</label>
        <textarea id="exam-eligibility" name="eligibility" rows={6} maxLength={5000} defaultValue={exam.eligibility ?? ""} className={field} />
        <p className="mt-1 text-xs text-ink-faint">Who can sit the exam: qualification, marks, age. A blank line starts a new paragraph. Empty: the Eligibility tab is hidden.</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-ink">
          FAQs <span className="font-normal text-ink-faint">({faqs.length}/20)</span>
        </p>
        <input type="hidden" name="faqs" value={JSON.stringify(complete.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })))} />
        <ol className="mt-2 space-y-3">
          {faqs.map((f, i) => (
            <li key={i} className="rounded-xl border border-line bg-bg-alt/50 p-3">
              <input aria-label={`Question ${i + 1}`} maxLength={300} value={f.question} placeholder="The question" onChange={(e) => set(i, { question: e.target.value })} className={field} />
              <textarea aria-label={`Answer ${i + 1}`} rows={2} maxLength={2000} value={f.answer} placeholder="The answer" onChange={(e) => set(i, { answer: e.target.value })} className={field} />
              <div className="mt-2 flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md border border-line px-2.5 py-1 font-medium text-ink-soft hover:border-brand hover:text-brand disabled:opacity-40">
                  Up
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === faqs.length - 1} className="rounded-md border border-line px-2.5 py-1 font-medium text-ink-soft hover:border-brand hover:text-brand disabled:opacity-40">
                  Down
                </button>
                <button type="button" onClick={() => setFaqs((all) => all.filter((_, j) => j !== i))} className="rounded-md border border-line px-2.5 py-1 font-medium text-ink-soft hover:border-red-600 hover:text-red-700">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setFaqs((all) => [...all, { question: "", answer: "" }])}
          disabled={faqs.length >= 20}
          className="mt-3 rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-soft disabled:opacity-50"
        >
          Add a question
        </button>
        {incomplete > 0 && (
          <p className="mt-2 text-xs text-amber-800">
            {incomplete} {incomplete === 1 ? "question is" : "questions are"} missing a question or an answer and will not be saved.
          </p>
        )}
      </div>
    </div>
  );
}

/** Every heading and short line on the exam's page. An empty box keeps the usual wording, shown as its placeholder. */
export function ExamPageTextTab({ exam }: { exam: Exam }) {
  const [text, setText] = useState<Record<string, string>>(() => jsonOf<Record<string, string>>(exam.pageText, {}));
  return (
    <div className="space-y-6" onKeyDown={noEnterSubmit}>
      <p className="text-sm text-ink-soft">
        Change any heading or line on this exam&apos;s page. Leave a box empty to keep the usual wording shown in it.{" "}
        <code className="rounded bg-bg-alt px-1">{"{exam}"}</code> is replaced by {codeOf(exam)}.
      </p>
      <input type="hidden" name="pageText" value={JSON.stringify(text)} />
      {PAGE_TEXT_GROUPS.map((group) => (
        <fieldset key={group.title} className="rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">{group.title}</legend>
          <div className="grid gap-4 md:grid-cols-2">
            {group.fields.map((f) => (
              <div key={f.key} className={f.long ? "md:col-span-2" : ""}>
                <label htmlFor={`exam-text-${f.key}`} className="block text-xs font-semibold text-ink">{f.label}</label>
                {f.long ? (
                  <textarea id={`exam-text-${f.key}`} rows={2} maxLength={300} value={text[f.key] ?? ""} placeholder={f.usual} onChange={(e) => setText((t) => ({ ...t, [f.key]: e.target.value }))} className={field} />
                ) : (
                  <input id={`exam-text-${f.key}`} maxLength={300} value={text[f.key] ?? ""} placeholder={f.usual} onChange={(e) => setText((t) => ({ ...t, [f.key]: e.target.value }))} className={field} />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

type CollegeRow = { slug: string; name: string; city: string; rank: number | null };

/**
 * The order of the colleges listed under the exam (its Colleges tab). Give a college a place to put it there;
 * colleges with no place follow in the usual order. Lists the published colleges that accept the exam.
 */
export function ExamCollegePriorityTab({ exam }: { exam: Exam }) {
  const code = codeOf(exam);
  const [places, setPlaces] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(jsonOf<Record<string, number>>(exam.collegePriority, {})).map(([k, v]) => [k, String(v)])),
  );
  const [colleges, setColleges] = useState<CollegeRow[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let current = true;
    loadExamColleges(code).then((r) => {
      if (!current) return;
      if ("error" in r) setError(r.error);
      else setColleges(r);
    });
    return () => {
      current = false;
    };
  }, [code]);

  const stored: Record<string, number> = {};
  for (const [slug, v] of Object.entries(places)) {
    const n = Number.parseInt(v, 10);
    if (Number.isInteger(n) && n >= 1 && n <= 999) stored[slug] = n;
  }
  const needle = query.trim().toLowerCase();
  const rows = (colleges ?? [])
    .filter((c) => !needle || `${c.name} ${c.city}`.toLowerCase().includes(needle))
    .sort((a, b) => (stored[a.slug] ?? 1e6) - (stored[b.slug] ?? 1e6) || a.name.localeCompare(b.name));
  const placed = Object.keys(stored).length;

  return (
    <div className="space-y-4" onKeyDown={noEnterSubmit}>
      <p className="text-sm text-ink-soft">
        Set where each college appears on {code}&apos;s Colleges tab: 1 is first. Colleges with no number follow in the usual order. The list is the published colleges that accept {code}.
      </p>
      <input type="hidden" name="collegePriority" value={JSON.stringify(stored)} />
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a college or city"
          aria-label="Search colleges"
          className="w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        {placed > 0 && (
          <button type="button" onClick={() => setPlaces({})} className="text-sm font-medium text-ink-faint hover:text-red-700">
            Clear all places
          </button>
        )}
        <span className="ml-auto text-xs text-ink-faint">{placed} with a place</span>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {!colleges && !error ? (
        <p className="text-sm text-ink-soft">Loading the colleges…</p>
      ) : colleges && colleges.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No published college lists {code} among the exams it accepts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-bg-alt/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="w-28 px-3 py-2.5">Place</th>
                <th className="px-3 py-2.5">College</th>
                <th className="px-3 py-2.5">City</th>
                <th className="px-3 py-2.5 text-right">Rank</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.slug} className={`border-t border-line ${stored[c.slug] ? "bg-brand-soft/30" : ""}`}>
                  <td className="px-3 py-2">
                    <input
                      inputMode="numeric"
                      aria-label={`Place of ${c.name}`}
                      value={places[c.slug] ?? ""}
                      placeholder="—"
                      onChange={(e) => setPlaces((p) => ({ ...p, [c.slug]: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                      className="w-20 rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-ink">{c.name}</td>
                  <td className="px-3 py-2 text-ink-soft">{c.city || "—"}</td>
                  <td className="px-3 py-2 text-right text-ink-soft">{c.rank ? `#${c.rank}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
