"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Search, X } from "lucide-react";
import { loadCourseColleges, saveCourseColleges } from "@/lib/admin-actions";
import type { CollegeCourseRow, CourseCollegesData } from "@/lib/api";
import { AmountField } from "@/components/admin/range-field";
import { ChipInput, DurationField, SelectInput, TextInput } from "@/components/admin/college-editor/shared";

type Offer = Record<string, CollegeCourseRow[]>;

const blankRow = (specialisation = ""): CollegeCourseRow => ({ specialisation, duration: "", mode: "Full Time", fees: "", exams: [], eligibility: "", seats: null });
const missing = (rows: CollegeCourseRow[]) => rows.some((r) => !r.duration.trim() || !r.fees.trim());

/**
 * The Colleges tab of a course: which colleges teach it, and what each says about it (duration, mode, total fees,
 * exams, eligibility), one row for the course as a whole or for each specialisation. These are the college's own
 * programme rows, the same ones its Courses & Fees tab shows, so a change here shows there. Saved with its own
 * button, apart from the course's details.
 */
export function CourseCollegesEditor({ slug, name }: { slug: string; name: string }) {
  const [data, setData] = useState<CourseCollegesData | null>(null);
  const [error, setError] = useState("");
  const [offer, setOffer] = useState<Offer>({});
  const [saved, setSaved] = useState<Offer>({});
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"all" | "offering" | "not">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let current = true;
    loadCourseColleges(slug).then((result) => {
      if (!current) return;
      if ("error" in result) return setError(result.error);
      const start: Offer = Object.fromEntries(result.colleges.filter((c) => c.rows.length > 0).map((c) => [c.slug, c.rows]));
      setData(result);
      setOffer(start);
      setSaved(start);
    });
    return () => {
      current = false;
    };
  }, [slug]);

  const dirty = useMemo(() => JSON.stringify(offer) !== JSON.stringify(saved), [offer, saved]);
  const q = query.trim().toLowerCase();
  const shown = (data?.colleges ?? []).filter(
    (c) => (!q || `${c.name} ${c.city}`.toLowerCase().includes(q)) && (show === "all" || (show === "offering") === Boolean(offer[c.slug])),
  );
  const offering = Object.keys(offer).length;
  const incomplete = Object.values(offer).filter(missing).length;

  const setRows = (collegeSlug: string, rows: CollegeCourseRow[]) => setOffer((prev) => ({ ...prev, [collegeSlug]: rows }));
  const patchRow = (collegeSlug: string, i: number, patch: Partial<CollegeCourseRow>) =>
    setRows(collegeSlug, offer[collegeSlug].map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const toggle = (collegeSlug: string) => {
    setMessage(null);
    if (offer[collegeSlug]) {
      const { [collegeSlug]: _removed, ...rest } = offer;
      void _removed;
      setOffer(rest);
      if (open === collegeSlug) setOpen(null);
    } else {
      setOffer({ ...offer, [collegeSlug]: [blankRow()] });
      setOpen(collegeSlug);
    }
  };

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveCourseColleges(slug, Object.entries(offer).map(([s, rows]) => ({ slug: s, rows })));
      if ("error" in result) return setMessage({ kind: "error", text: result.error });
      setSaved(offer);
      setMessage({ kind: "ok", text: "Saved. The course's card and each college's own page are updated." });
    });
  };

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-ink-soft">Loading the colleges…</p>;

  return (
    // Enter in a box here must not save the course's details form around this tab.
    <div className="space-y-4" onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && e.preventDefault()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Colleges teaching {name}</h3>
          <p className="mt-0.5 max-w-2xl text-xs text-ink-soft">
            Tick the colleges that offer it, then fill in what is missing for each: duration, mode, total fees and exams, for the course or for each specialisation. They are saved on the college, on its Courses &amp; Fees tab. The course&apos;s own card is set separately, in Navigation → Top Courses → Manage course info.
          </p>
        </div>
        <button type="button" onClick={save} disabled={pending || !dirty} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Saving…" : "Save colleges"}
        </button>
      </div>

      {message && <p role="status" className={`rounded-lg px-4 py-2.5 text-sm ${message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
      {dirty && !message && <p className="text-xs text-amber-800">You have unsaved changes to the colleges. Use “Save colleges”; the Save changes button below saves only the course&apos;s name and categories.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search colleges" aria-label="Search colleges" className="w-60 rounded-lg border border-line bg-bg py-1.5 pl-8 pr-3 text-sm focus:border-brand focus:outline-none" />
        </div>
        <select value={show} onChange={(e) => setShow(e.target.value as typeof show)} aria-label="Show" className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none">
          <option value="all">All colleges</option>
          <option value="offering">Teaching it</option>
          <option value="not">Not teaching it</option>
        </select>
        <p className="text-xs text-ink-soft">
          {offering} of {data.colleges.length} teach it{incomplete > 0 ? ` · ${incomplete} still need a duration or fees` : ""}
        </p>
      </div>

      <ul className="divide-y divide-line-soft rounded-xl border border-line">
        {shown.map((c) => {
          const rows = offer[c.slug];
          const isOpen = open === c.slug && Boolean(rows);
          return (
            <li key={c.slug} className={rows ? "" : "bg-bg/50"}>
              <div className="flex items-center gap-3 px-4 py-2.5">
                <input type="checkbox" checked={Boolean(rows)} onChange={() => toggle(c.slug)} aria-label={`${c.name} teaches ${name}`} className="h-4 w-4 accent-brand" />
                <button type="button" onClick={() => rows && setOpen(isOpen ? null : c.slug)} className="min-w-0 flex-1 text-left" disabled={!rows}>
                  <span className="block truncate text-sm font-medium text-ink">{c.name}{c.status !== "published" && <span className="ml-2 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-bold uppercase text-gold">{c.status}</span>}</span>
                  <span className="block truncate text-xs text-ink-faint">{[c.city, c.stream].filter(Boolean).join(" · ")}</span>
                </button>
                {rows && (
                  <>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${missing(rows) ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-800"}`}>
                      {missing(rows) ? "Needs details" : `${rows.length} ${rows.length === 1 ? "row" : "rows"}`}
                    </span>
                    <button type="button" onClick={() => setOpen(isOpen ? null : c.slug)} className="rounded-lg border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-brand hover:text-brand">{isOpen ? "Close" : "Edit details"}</button>
                  </>
                )}
              </div>

              {isOpen && rows && (
                <div className="space-y-3 border-t border-line-soft bg-bg-alt/40 px-4 py-4">
                  {rows.map((r, i) => {
                    const id = `cc-${c.slug}-${i}`;
                    const taken = new Set(rows.filter((_, n) => n !== i).map((x) => x.specialisation));
                    const options = data.specialisations.filter((s) => !taken.has(s));
                    return (
                      <div key={i} className={`rounded-lg border bg-surface p-3 ${!r.duration.trim() || !r.fees.trim() ? "border-amber-300" : "border-line"}`}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">{r.specialisation ? `${name} · ${r.specialisation}` : `${name} (the course as a whole)`}</p>
                          {rows.length > 1 && (
                            <button type="button" aria-label="Remove this row" onClick={() => setRows(c.slug, rows.filter((_, n) => n !== i))} className="rounded-lg border border-line p-1.5 text-ink-soft hover:border-red-700 hover:text-red-700"><X className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <SelectInput id={`${id}-spec`} label="Specialisation" value={r.specialisation} onChange={(v) => patchRow(c.slug, i, { specialisation: v })} options={options} placeholder="None: the course as a whole" />
                          <DurationField id={`${id}-dur`} label="Duration" required value={r.duration} onChange={(v) => patchRow(c.slug, i, { duration: v })} />
                          <SelectInput id={`${id}-mode`} label="Mode" value={r.mode} onChange={(v) => patchRow(c.slug, i, { mode: v })} options={data.modes} />
                          <AmountField id={`${id}-fees`} label="Total fees" joined units={["K", "L", "Cr"]} value={r.fees} onChange={(v) => patchRow(c.slug, i, { fees: v })} hint="Required. In thousand (K), lakh (L) or crore (Cr)." />
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                          <ChipInput id={`${id}-exams`} label="Entrance exams" value={r.exams} onChange={(v) => patchRow(c.slug, i, { exams: v })} suggestions={data.exams} max={20} strict />
                          <TextInput id={`${id}-elig`} label="Eligibility" max={300} value={r.eligibility} onChange={(v) => patchRow(c.slug, i, { eligibility: v })} placeholder="e.g. Graduation with 50%" />
                        </div>
                      </div>
                    );
                  })}
                  {data.specialisations.some((s) => !rows.some((r) => r.specialisation === s)) && (
                    <button
                      type="button"
                      onClick={() => setRows(c.slug, [...rows, blankRow(data.specialisations.find((s) => !rows.some((r) => r.specialisation === s)) ?? "")])}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add a specialisation
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-soft">No college matches.</li>}
      </ul>
    </div>
  );
}
