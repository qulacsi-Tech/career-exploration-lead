"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTopExams } from "@/lib/admin-actions";
import { AdminSection } from "@/components/admin/admin-section";

const MAX = 6;

type ExamChoice = { slug: string; name: string };

/** The exams the homepage's Top Exams row shows, in order. Six at most. */
export function TopExamsEditor({ exams, options }: { exams: ExamChoice[]; options: ExamChoice[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<ExamChoice[]>(exams);
  const [picking, setPicking] = useState("");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const available = options.filter((o) => !chosen.some((c) => c.slug === o.slug));

  const edit = (next: ExamChoice[]) => {
    setChosen(next);
    setDirty(true);
    setMessage(null);
  };

  const move = (i: number, direction: -1 | 1) => {
    const j = i + direction;
    if (j < 0 || j >= chosen.length) return;
    const next = [...chosen];
    [next[i], next[j]] = [next[j], next[i]];
    edit(next);
  };

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveTopExams(chosen.map((c) => c.slug));
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setDirty(false);
        setMessage({ kind: "ok", text: "Saved. The homepage now shows these exams in this order." });
        router.refresh();
      }
    });
  };

  return (
    <AdminSection title="Top exams" description={`The exams in the homepage row, left to right. Up to ${MAX}.`}>
      <div className="space-y-4">
        <ol className="space-y-2">
          {chosen.map((exam, i) => (
            <li key={exam.slug} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {i + 1}. {exam.name}
              </span>
              <button type="button" aria-label={`Move ${exam.name} up`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
              <button type="button" aria-label={`Move ${exam.name} down`} disabled={i === chosen.length - 1} onClick={() => move(i, 1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
              <button type="button" aria-label={`Remove ${exam.name}`} onClick={() => edit(chosen.filter((c) => c.slug !== exam.slug))} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">Remove</button>
            </li>
          ))}
        </ol>
        {chosen.length === 0 && <p className="text-sm text-ink-soft">No exams chosen. The row will not show on the homepage.</p>}

        {chosen.length < MAX && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-60 flex-1">
              <label className="block text-xs font-semibold text-ink" htmlFor="top-exam-add">Add an exam</label>
              <select id="top-exam-add" value={picking} onChange={(e) => setPicking(e.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none">
                <option value="">Choose an exam</option>
                {available.map((o) => (
                  <option key={o.slug} value={o.slug}>{o.name}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!picking}
              onClick={() => {
                const found = options.find((o) => o.slug === picking);
                if (found) edit([...chosen, found]);
                setPicking("");
              }}
              className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-40"
            >
              Add to row
            </button>
          </div>
        )}

        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${message.kind === "error" ? "border border-red-200 bg-red-50 text-red-700" : "border border-line bg-bg-alt text-ink-soft"}`}>
            {message.text}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={!dirty || pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {pending ? "Saving…" : "Save top exams"}
          </button>
          {dirty && !pending && <span className="text-xs text-ink-soft">Unsaved changes</span>}
        </div>
      </div>
    </AdminSection>
  );
}
