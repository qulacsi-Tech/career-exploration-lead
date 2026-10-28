"use client";

import { SeoAvailability } from "@/components/admin/seo-availability";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ExternalLink, LayoutGrid, Megaphone, Plus, Search, Settings2, X } from "lucide-react";
import { createCollection, deleteCollection, previewCollection, saveCollection } from "@/lib/admin-actions";
import type { AdminCollectionOptions, Collection, CollectionFilters, CollectionPreview } from "@/lib/api";
import type { RichTextDoc } from "@/lib/rich-text";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin } from "@/components/admin/resource-admin";
import { slugify } from "@/components/admin/admin-fields";
import { ImageUploadField } from "@/components/admin/image-upload-field";

/** The intro is edited as plain paragraphs. Blank lines separate them. */
function introText(doc: RichTextDoc | undefined): string {
  if (!doc || !Array.isArray(doc.content)) return "";
  return doc.content
    .map((node) => {
      const block = node as { content?: { text?: string }[] };
      return (block.content ?? []).map((t) => t.text ?? "").join("");
    })
    .filter((p) => p.trim() !== "")
    .join("\n\n");
}

const input = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const small = "rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40";

function Labelled({ label, hint, className = "", children }: { label: string; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

function Text({ label, value, onChange, hint, max, placeholder, className, multiline, rows = 3, required }: {
  label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; max?: number; placeholder?: string; className?: string; multiline?: boolean; rows?: number; required?: boolean;
}) {
  return (
    <Labelled label={`${label}${required ? " *" : ""}`} hint={hint ?? (max ? `${value.length}/${max}` : undefined)} className={className}>
      {multiline ? (
        <textarea rows={rows} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={input} />
      ) : (
        <input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={input} />
      )}
    </Labelled>
  );
}

function Pick({ label, value, onChange, options, any = "Any", hint }: { label: string; value: string; onChange: (v: string) => void; options: string[]; any?: string; hint?: string }) {
  // A saved value that has since left the list stays selectable, so opening and saving does not drop it.
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Labelled label={label} hint={hint}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
        <option value="">{any}</option>
        {all.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Labelled>
  );
}

type Faq = { question: string; answer: string };

/** Everything the form edits. The API's own shape differs a little (see `toPayload`). */
type Draft = {
  title: string;
  slug: string;
  membership: "filters" | "picked";
  filters: CollectionFilters;
  rankingListSlug: string;
  collegeSlugs: string[];
  heading: string;
  subheading: string;
  authorName: string;
  authorRole: string;
  authorPhoto: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  faqs: Faq[];
  homepageOn: boolean; homepageOrder: string; homepageLimit: string; homepageVisible: boolean;
  footerOn: boolean; footerColumn: string; footerOrder: string;
  /** The header menu: whether, which category (an id, or "new"), and the new category's name. */
  navOn: boolean; navGroup: string; navName: string;
  isPublished: boolean;
};

const blankDraft = (): Draft => ({
  title: "", slug: "", membership: "filters", filters: {}, rankingListSlug: "", collegeSlugs: [],
  heading: "", subheading: "", authorName: "", authorRole: "", authorPhoto: "", intro: "", metaTitle: "", metaDescription: "", canonical: "", faqs: [],
  homepageOn: false, homepageOrder: "0", homepageLimit: "6", homepageVisible: true,
  footerOn: false, footerColumn: "", footerOrder: "0",
  navOn: false, navGroup: "", navName: "",
  isPublished: false,
});

function draftOf(c: Collection): Draft {
  const { homepage, footer } = c.placements ?? {};
  return {
    title: c.title, slug: c.slug, membership: c.membership, filters: c.filters ?? {}, rankingListSlug: c.rankingListSlug ?? "", collegeSlugs: c.collegeSlugs ?? [],
    heading: c.heading ?? "", subheading: c.subheading ?? "", authorName: c.author?.name ?? "", authorRole: c.author?.role ?? "", authorPhoto: c.author?.photo ?? "", intro: introText(c.seo?.intro),
    metaTitle: c.seo?.metaTitle ?? "", metaDescription: c.seo?.metaDescription ?? "", canonical: c.seo?.canonical ?? "", faqs: c.seo?.faqs ?? [],
    homepageOn: !!homepage, homepageOrder: String(homepage?.order ?? 0), homepageLimit: String(homepage?.limit ?? 6), homepageVisible: homepage?.isVisible ?? true,
    footerOn: !!footer, footerColumn: footer?.column ?? "", footerOrder: String(footer?.order ?? 0),
    navOn: !!c.menuGroup, navGroup: c.menuGroup ?? "", navName: "",
    isPublished: c.isPublished,
  };
}

const FILTER_FIELDS: (keyof CollectionFilters)[] = ["stream", "course", "specialisation", "city", "ownership", "level", "credential", "mode", "exam", "approval"];
const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

/** What the collection API takes. Empty filters are left out; a switched-off placement is null. */
function toPayload(d: Draft, isNew: boolean): Record<string, unknown> {
  const filters = Object.fromEntries(FILTER_FIELDS.map((k) => [k, (d.filters[k] ?? "").trim()]).filter(([, v]) => v));
  return {
    ...(isNew ? { slug: d.slug.trim() } : {}),
    title: d.title.trim(),
    heading: d.heading.trim(),
    subheading: d.subheading.trim(),
    author: { name: d.authorName.trim(), role: d.authorRole.trim(), photo: d.authorPhoto },
    membership: d.membership,
    filters,
    rankingListSlug: d.rankingListSlug || null,
    collegeSlugs: d.membership === "picked" ? d.collegeSlugs : [],
    homepage: d.homepageOn ? { order: num(d.homepageOrder), limit: num(d.homepageLimit), isVisible: d.homepageVisible } : null,
    footer: d.footerOn ? { column: d.footerColumn.trim(), order: num(d.footerOrder) } : null,
    menu: d.navOn ? { group: d.navGroup, name: d.navName.trim() } : null,
    seo: {
      metaTitle: d.metaTitle.trim(),
      metaDescription: d.metaDescription.trim(),
      canonical: d.canonical.trim() || null,
      intro: d.intro.trim(),
      faqs: d.faqs.filter((f) => f.question.trim() || f.answer.trim()),
    },
    isPublished: d.isPublished,
  };
}

/** The listing address the collection opens, written the way the server writes it. */
function hrefOf(d: Draft): string {
  const q = new URLSearchParams();
  if (d.membership === "filters") {
    for (const k of FILTER_FIELDS) if (d.filters[k]) q.set(k, d.filters[k]!);
    if (d.rankingListSlug) q.set("ranking_list", d.rankingListSlug);
  }
  q.set("collection", d.slug || "slug");
  return `/colleges?${q.toString()}`;
}

const STEPS = [
  { id: "basics", label: "Basics", note: "Name and status", icon: Settings2 },
  { id: "institutes", label: "Institutes", note: "Filters or hand-picked", icon: LayoutGrid },
  { id: "header", label: "Header & SEO", note: "What the page says", icon: Search },
  { id: "where", label: "Where it shows", note: "Homepage, footer, menu", icon: Megaphone },
] as const;
type StepId = (typeof STEPS)[number]["id"];

/** How many institutes the membership holds right now, counted by the API a moment after the last change. */
function useMatchCount(d: Draft) {
  const [state, setState] = useState<{ loading: boolean; result: CollectionPreview | { error: string } | null }>({ loading: false, result: null });
  const request = useRef(0);
  const key = JSON.stringify([d.membership, d.filters, d.rankingListSlug, d.collegeSlugs]);
  useEffect(() => {
    const id = ++request.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(async () => {
      const result = await previewCollection({ membership: d.membership, filters: Object.fromEntries(Object.entries(d.filters).filter(([, v]) => v)), rankingListSlug: d.rankingListSlug || null, collegeSlugs: d.membership === "picked" ? d.collegeSlugs : [] });
      if (id === request.current) setState({ loading: false, result });
    }, 400);
    return () => clearTimeout(timer);
    // `key` stands for the fields read above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

function MatchCount({ d }: { d: Draft }) {
  const { loading, result } = useMatchCount(d);
  const empty = d.membership === "filters" && !Object.values(d.filters).some(Boolean) && !d.rankingListSlug;
  return (
    <div className="rounded-xl border border-line bg-bg-alt/60 p-4" aria-live="polite">
      {empty ? (
        <p className="text-sm text-ink-soft">Choose at least one filter to see which institutes it holds.</p>
      ) : !result ? (
        <p className="text-sm text-ink-soft">Counting…</p>
      ) : "error" in result ? (
        <p role="alert" className="text-sm text-red-700">{result.error}</p>
      ) : (
        <>
          <p className={`text-sm font-semibold ${loading ? "text-ink-faint" : "text-ink"}`}>
            {result.count === 0 ? "No published institute matches yet" : `${result.count.toLocaleString("en-IN")} institute${result.count === 1 ? "" : "s"} ${d.membership === "picked" ? "in this collection" : "match"}`}
          </p>
          {result.sample.length > 0 && (
            <p className="mt-1 text-xs text-ink-soft">
              {result.sample.map((c) => c.name).join(" · ")}
              {result.count > result.sample.length && ` · and ${result.count - result.sample.length} more`}
            </p>
          )}
          {result.count === 0 && <p className="mt-1 text-xs text-ink-faint">A collection with no institutes cannot be published.</p>}
        </>
      )}
    </div>
  );
}

function FiltersPanel({ d, set, options }: { d: Draft; set: (patch: Partial<Draft>) => void; options: AdminCollectionOptions }) {
  const f = d.filters;
  const change = (patch: Partial<CollectionFilters>) => {
    const next = { ...f, ...patch };
    // Narrowing: a course belongs to a category, a specialisation to a course. Drop a choice the new one rules out.
    if (next.course && next.stream && !(options.courseStreams[next.course] ?? []).includes(next.stream)) next.course = "";
    if (next.specialisation && next.course && !(options.specialisationCourses[next.specialisation] ?? []).includes(next.course)) next.specialisation = "";
    set({ filters: next });
  };
  const courses = options.courses.filter((c) => !f.stream || (options.courseStreams[c] ?? []).includes(f.stream));
  const specs = options.specialisations.filter((s) => !f.course || (options.specialisationCourses[s] ?? []).includes(f.course));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Pick label="Category" value={f.stream ?? ""} onChange={(v) => change({ stream: v })} options={options.streams} />
        <Pick label="Course" value={f.course ?? ""} onChange={(v) => change({ course: v })} options={courses} hint={f.stream ? `Courses under ${f.stream}` : undefined} />
        <Pick label="Specialisation" value={f.specialisation ?? ""} onChange={(v) => change({ specialisation: v })} options={specs} hint={f.course ? `Specialisations of ${f.course}` : undefined} />
        <Pick label="Location (city)" value={f.city ?? ""} onChange={(v) => change({ city: v })} options={options.cities} />
        <Pick label="Type" value={f.ownership ?? ""} onChange={(v) => change({ ownership: v })} options={options.ownerships} />
        <Pick label="Course level" value={f.level ?? ""} onChange={(v) => change({ level: v })} options={options.levels} />
        <Pick label="Credential" value={f.credential ?? ""} onChange={(v) => change({ credential: v })} options={options.credentials} />
        <Pick label="Mode of study" value={f.mode ?? ""} onChange={(v) => change({ mode: v })} options={options.modes} />
        <Pick label="Entrance exam accepted" value={f.exam ?? ""} onChange={(v) => change({ exam: v })} options={options.exams} />
        <Pick label="Approval" value={f.approval ?? ""} onChange={(v) => change({ approval: v })} options={options.approvals} />
        <Labelled label="Ranking list" hint="Only institutes in the list, best rank first.">
          <select value={d.rankingListSlug} onChange={(e) => set({ rankingListSlug: e.target.value })} className={input}>
            <option value="">Any</option>
            {options.rankings.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select>
        </Labelled>
      </div>
      {Object.values(f).some(Boolean) || d.rankingListSlug ? (
        <button type="button" onClick={() => set({ filters: {}, rankingListSlug: "" })} className="text-xs font-semibold text-brand hover:underline">Clear all filters</button>
      ) : null}
    </div>
  );
}

function PickedPanel({ d, set, options }: { d: Draft; set: (patch: Partial<Draft>) => void; options: AdminCollectionOptions }) {
  const [query, setQuery] = useState("");
  const [stream, setStream] = useState("");
  const byslug = useMemo(() => new Map(options.colleges.map((c) => [c.slug, c])), [options.colleges]);
  const chosen = d.collegeSlugs;
  const q = query.trim().toLowerCase();
  const shown = options.colleges.filter((c) => !chosen.includes(c.slug) && (!stream || c.stream === stream) && (!q || `${c.name} ${c.city}`.toLowerCase().includes(q)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...chosen];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set({ collegeSlugs: next });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0 rounded-xl border border-line">
        <div className="space-y-2 border-b border-line p-3">
          <p className="text-xs font-semibold text-ink">Add institutes <span className="font-normal text-ink-faint">({shown.length} to choose from)</span></p>
          <div className="flex gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or city" aria-label="Search institutes" className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm focus:border-brand focus:outline-none" />
            <select value={stream} onChange={(e) => setStream(e.target.value)} aria-label="Category" className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm focus:border-brand focus:outline-none">
              <option value="">All categories</option>
              {options.streams.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {shown.length > 0 && shown.length <= 100 && (q || stream) && (
            <button type="button" onClick={() => set({ collegeSlugs: [...chosen, ...shown.map((c) => c.slug)] })} className="text-xs font-semibold text-brand hover:underline">Add all {shown.length} shown</button>
          )}
        </div>
        <ul className="max-h-80 divide-y divide-line-soft overflow-y-auto">
          {shown.slice(0, 200).map((c) => (
            <li key={c.slug} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.name}<span className="ml-2 text-xs text-ink-faint">{[c.city, c.stream].filter(Boolean).join(" · ")}</span></span>
              <button type="button" onClick={() => set({ collegeSlugs: [...chosen, c.slug] })} aria-label={`Add ${c.name}`} className="inline-flex items-center gap-1 rounded-lg border border-brand px-2 py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-white"><Plus className="h-3.5 w-3.5" />Add</button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-soft">No more institutes match.</li>}
        </ul>
      </div>

      <div className="min-w-0 rounded-xl border border-line">
        <p className="border-b border-line p-3 text-xs font-semibold text-ink">In this collection <span className="font-normal text-ink-faint">({chosen.length}) — shown in this order{d.rankingListSlug ? ", best rank first" : ""}</span></p>
        <ol className="max-h-80 divide-y divide-line-soft overflow-y-auto">
          {chosen.map((slug, i) => {
            const c = byslug.get(slug);
            return (
              <li key={slug} className="flex items-center gap-2 px-3 py-2">
                <span className="w-6 shrink-0 text-xs text-ink-faint">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{c?.name ?? slug}</span>
                <button type="button" aria-label={`Move ${c?.name ?? slug} up`} disabled={i === 0} onClick={() => move(i, -1)} className={small}><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label={`Move ${c?.name ?? slug} down`} disabled={i === chosen.length - 1} onClick={() => move(i, 1)} className={small}><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label={`Remove ${c?.name ?? slug}`} onClick={() => set({ collegeSlugs: chosen.filter((s) => s !== slug) })} className={`${small} hover:border-red-700 hover:text-red-700`}><X className="h-3.5 w-3.5" /></button>
              </li>
            );
          })}
          {chosen.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-soft">Nothing picked yet. Add institutes from the list.</li>}
        </ol>
        <div className="border-t border-line p-3">
          <Labelled label="Order by ranking list" hint="Optional. Ranked institutes come first; the rest keep the order above.">
            <select value={d.rankingListSlug} onChange={(e) => set({ rankingListSlug: e.target.value })} className={input}>
              <option value="">Use the order above</option>
              {options.rankings.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </select>
          </Labelled>
        </div>
      </div>
    </div>
  );
}

function SnippetPreview({ d }: { d: Draft }) {
  const title = d.metaTitle.trim() || d.heading.trim() || d.title.trim() || "Page title";
  const description = d.metaDescription.trim() || d.subheading.trim() || `Browse ${d.title.trim() || "this collection"} on fees, placements, rankings and admissions.`;
  return (
    <div className="rounded-xl border border-line bg-bg-alt/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">How it can look in search</p>
      <p className="mt-1.5 truncate text-base font-medium text-blue-800">{title}</p>
      <p className="truncate text-xs text-green-800">{hrefOf(d)}</p>
      <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{description}</p>
    </div>
  );
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-line accent-[var(--color-brand)]" />
      {children}
    </label>
  );
}

/** The whole collection form: the steps down the left, the step's fields on the right. All state lives here and goes out as one field. */
function CollectionForm({ options, collection }: { options: AdminCollectionOptions; collection: Collection | null }) {
  const isNew = collection === null;
  const [d, setD] = useState<Draft>(() => (collection ? draftOf(collection) : blankDraft()));
  const [step, setStep] = useState<StepId>("basics");
  const [slugTouched, setSlugTouched] = useState(false);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const payload = JSON.stringify(toPayload(d, isNew));

  const titleChanged = (title: string) => set({ title, ...(isNew && !slugTouched ? { slug: slugify(title) } : {}) });
  const faqSet = (i: number, patch: Partial<Faq>) => set({ faqs: d.faqs.map((f, n) => (n === i ? { ...f, ...patch } : f)) });

  const panel = (id: StepId) => (step === id ? "" : "hidden");

  return (
    <div className="flex min-h-[28rem] flex-col gap-6 lg:flex-row">
      <input type="hidden" name="payload" value={payload} />

      <nav aria-label="Collection steps" className="flex shrink-0 gap-2 overflow-x-auto lg:w-56 lg:flex-col lg:overflow-visible">
        {STEPS.map((s, i) => {
          const on = s.id === step;
          const Icon = s.icon;
          return (
            <button key={s.id} type="button" onClick={() => setStep(s.id)} aria-current={on ? "step" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${on ? "border-brand bg-brand-soft" : "border-line hover:border-brand"}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${on ? "bg-brand text-white" : "bg-bg-alt text-ink-soft"}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${on ? "text-brand-ink" : "text-ink"}`}>{i + 1}. {s.label}</span>
                <span className="hidden text-xs text-ink-faint lg:block">{s.note}</span>
              </span>
            </button>
          );
        })}
        <div className="mt-auto hidden rounded-xl bg-bg-alt/70 p-3 text-xs text-ink-soft lg:block">
          <p className="font-semibold text-ink">Opens</p>
          <p className="mt-1 break-all">{hrefOf(d)}</p>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {/* Basics */}
        <div className={`space-y-6 ${panel("basics")}`}>
          <AdminSubsection title="Name" description="The collection's name. It is also the default heading of the page it opens.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Text label="Title" required value={d.title} max={200} onChange={titleChanged} placeholder="MBA Colleges in Pune" />
              <Text label="URL name (slug)" required={isNew} value={d.slug} onChange={(v) => { setSlugTouched(true); set({ slug: slugify(v) }); }} placeholder="mba-colleges-in-pune"
                hint={isNew ? "Letters, numbers and dashes. It cannot be changed after saving." : "It cannot be changed once saved."} />
            </div>
          </AdminSubsection>
          <AdminSubsection title="Status">
            <Toggle checked={d.isPublished} onChange={(v) => set({ isPublished: v })}>Published on the site</Toggle>
            <p className="mt-1 text-xs text-ink-soft">A draft is saved but not shown anywhere. Publishing needs at least one institute in the collection.</p>
          </AdminSubsection>
        </div>

        {/* Institutes */}
        <div className={`space-y-6 ${panel("institutes")}`}>
          <AdminSubsection title="Which institutes" description="Choose how the collection decides what it holds.">
            <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Which institutes">
              {([
                ["filters", "Automatic", "Every institute that matches the filters below. New matching institutes join on their own."],
                ["picked", "Hand-picked", "Only the institutes you choose, in the order you set."],
              ] as const).map(([value, title, note]) => (
                <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${d.membership === value ? "border-brand bg-brand-soft" : "border-line hover:border-brand"}`}>
                  <input type="radio" name="membership-choice" checked={d.membership === value} onChange={() => set({ membership: value })} className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />
                  <span><span className="block text-sm font-semibold text-ink">{title}</span><span className="block text-xs text-ink-soft">{note}</span></span>
                </label>
              ))}
            </div>
          </AdminSubsection>

          {d.membership === "filters" ? (
            <AdminSubsection title="Filters" description="Pick any combination. The page opens with these already applied, and visitors can narrow it further.">
              <FiltersPanel d={d} set={set} options={options} />
            </AdminSubsection>
          ) : (
            <AdminSubsection title="Institutes" description="Search the directory and add the ones to show.">
              <PickedPanel d={d} set={set} options={options} />
            </AdminSubsection>
          )}
          <MatchCount d={d} />
        </div>

        {/* Header and SEO */}
        <div className={`space-y-6 ${panel("header")}`}>
          <AdminSubsection title="Page header" description="Shown at the top of the colleges list when this collection is opened.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Text label="Heading" value={d.heading} max={200} onChange={(v) => set({ heading: v })} placeholder={d.title || "Defaults to the title"} hint="The page's main heading. Defaults to the title." />
              <Text label="Subheading" value={d.subheading} max={300} onChange={(v) => set({ subheading: v })} hint="One line under the heading, and the homepage band's tagline." />
              <Text label="Author name" value={d.authorName} max={80} onChange={(v) => set({ authorName: v })} placeholder="e.g. Priya Nair" hint="Shown as the page's author. Leave empty to use the colleges page's own author." />
              <Text label="Author role" value={d.authorRole} max={80} onChange={(v) => set({ authorRole: v })} placeholder="e.g. Admissions Counsellor" />
              <div className="md:col-span-2 md:max-w-xs">
                <p className="text-xs font-semibold text-ink">Author photo</p>
                <ImageUploadField kind="logo" value={d.authorPhoto} onChange={(photo) => set({ authorPhoto: photo })} fallbackNote="A circle with the author's initial." />
              </div>
              <Text className="md:col-span-2" label="Intro" multiline rows={5} value={d.intro} max={5000} onChange={(v) => set({ intro: v })} hint="Plain text. Separate paragraphs with a blank line." />
            </div>
          </AdminSubsection>
          <AdminSubsection title="Search engines" description="Leave a field empty and the page writes it from the heading.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Text label="Meta title" value={d.metaTitle} max={120} onChange={(v) => set({ metaTitle: v })} placeholder={d.heading || d.title} hint={`${d.metaTitle.length}/120. Around 60 reads best in search.`} />
              <Text label="Canonical path" value={d.canonical} max={300} onChange={(v) => set({ canonical: v })} placeholder={hrefOf(d)} hint="Optional, starts with /. Leave empty to use the page's own address." />
              <Text className="md:col-span-2" label="Meta description" multiline rows={2} value={d.metaDescription} max={320} onChange={(v) => set({ metaDescription: v })} hint={`${d.metaDescription.length}/320. Around 155 reads best in search.`} />
            </div>
            <div className="mt-4"><SnippetPreview d={d} /></div>
          </AdminSubsection>
          <AdminSubsection title="Questions and answers" description="Shown at the foot of the page.">
            <div className="space-y-3">
              {d.faqs.map((f, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-line p-3">
                  <div className="flex items-end gap-2">
                    <Text className="min-w-0 flex-1" label="Question" value={f.question} max={300} onChange={(v) => faqSet(i, { question: v })} />
                    <button type="button" onClick={() => set({ faqs: d.faqs.filter((_, n) => n !== i) })} className="mb-0.5 rounded-lg border border-line px-2.5 py-2 text-sm text-ink-soft hover:border-red-700 hover:text-red-700">Remove</button>
                  </div>
                  <Text label="Answer" multiline rows={2} value={f.answer} max={2000} onChange={(v) => faqSet(i, { answer: v })} />
                </div>
              ))}
              {d.faqs.length === 0 && <p className="text-sm text-ink-soft">No questions yet.</p>}
              <button type="button" disabled={d.faqs.length >= 20} onClick={() => set({ faqs: [...d.faqs, { question: "", answer: "" }] })} className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40">Add question</button>
            </div>
          </AdminSubsection>
        </div>

        {/* Where it shows */}
        <div className={`space-y-6 ${panel("where")}`}>
          <AdminSubsection title="Header menu" description="A link in the site header's colleges menu, under the category you choose.">
            <Toggle checked={d.navOn} onChange={(v) => set({ navOn: v })}>Show in the header menu</Toggle>
            {d.navOn && (
              <div className="mt-3 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
                <Labelled label="Category" hint="The collection is listed under this category in the menu.">
                  <select value={d.navGroup} onChange={(e) => set({ navGroup: e.target.value })} className={input}>
                    <option value="" disabled>Choose a category</option>
                    {options.menuGroups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    <option value="new">＋ Create a new category…</option>
                  </select>
                </Labelled>
                {d.navGroup === "new" && (
                  <Text label="New category name" required value={d.navName} max={60} onChange={(v) => set({ navName: v })} placeholder="e.g. Best for Placements" hint="Added to the menu with this collection in it." />
                )}
                <p className="text-xs text-ink-faint sm:col-span-2">A collection sits in one category. Rename, reorder or hide categories and links in Sections → Navigation.</p>
              </div>
            )}
          </AdminSubsection>
          {/* Homepage band: switched off in the form for now. A collection already on the homepage keeps its placement, because it is still sent with the rest of the draft.
          <AdminSubsection title="Homepage" description="A row of institute cards on the homepage, with a View all button that opens this collection.">
            <Toggle checked={d.homepageOn} onChange={(v) => set({ homepageOn: v })}>Show as a band on the homepage</Toggle>
            {d.homepageOn && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Text label="Band order" value={d.homepageOrder} onChange={(v) => set({ homepageOrder: v.replace(/\D/g, "") })} />
                <Text label="Cards shown" value={d.homepageLimit} onChange={(v) => set({ homepageLimit: v.replace(/\D/g, "") })} hint="1 to 24" />
                <div className="flex items-end pb-2"><Toggle checked={d.homepageVisible} onChange={(v) => set({ homepageVisible: v })}>Visible</Toggle></div>
              </div>
            )}
          </AdminSubsection>
          */}
          <AdminSubsection title="Footer" description="A link in one of the footer's columns.">
            <Toggle checked={d.footerOn} onChange={(v) => set({ footerOn: v })}>Link from the site footer</Toggle>
            {d.footerOn && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Text label="Footer column" value={d.footerColumn} max={60} onChange={(v) => set({ footerColumn: v })} hint="e.g. MBA, Engineering" />
                <Text label="Link order" value={d.footerOrder} onChange={(v) => set({ footerOrder: v.replace(/\D/g, "") })} />
              </div>
            )}
          </AdminSubsection>
        </div>
      </div>
    </div>
  );
}

const filterSummary = (c: Collection, options: AdminCollectionOptions) => {
  if (c.membership === "picked") return `${c.collegeSlugs.length} hand-picked`;
  const parts = [...Object.values(c.filters ?? {}), c.rankingListSlug && (options.rankings.find((r) => r.slug === c.rankingListSlug)?.name ?? c.rankingListSlug)].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No filters";
};

export function CollectionsAdmin({
  collections,
  options,
}: {
  collections: Collection[];
  options: AdminCollectionOptions;
}) {
  const nameOf = (slug: string) => options.colleges.find((o) => o.slug === slug)?.name ?? slug;

  return (
    <ResourceAdmin<Collection>
      title="Collections"
      description="Named groups of institutes that open the colleges list with their filters already applied. Reuse one on the homepage, in the footer and in the header menu."
      addLabel="Add collection"
      addDescription="Choose the institutes, write the header and SEO, then pick where it shows."
      addSize="eighty"
      editSize="eighty"
      rows={collections}
      getKey={(c) => c.slug}
      searchIn={(c) => [c.title, c.slug]}
      searchPlaceholder="Search title or slug"
      columns={[
        {
          key: "title",
          label: "Collection",
          className: "text-ink",
          render: (c) => (
            <>
              <p className="font-medium text-ink">{c.title}</p>
              <p className="max-w-xs truncate text-xs text-ink-faint">{c.href}</p>
            </>
          ),
        },
        { key: "institutes", label: "Institutes", render: (c) => filterSummary(c, options) },
        {
          key: "shown",
          label: "Shown in",
          render: (c) => {
            const where = [c.placements?.homepage && "Homepage", c.placements?.footer && "Footer", c.menuGroup && "Menu"].filter(Boolean);
            return where.length ? where.join(", ") : "—";
          },
        },
        { key: "seo", label: "SEO available", render: (c) => <SeoAvailability seo={c.seo} /> },
        { key: "status", label: "Status", render: (c) => (c.isPublished ? "Published" : "Draft") },
      ]}
      renderView={(c) => (
        <div className="space-y-6">
          <AdminSubsection title="Opens">
            <p className="break-all text-sm text-ink-soft">{c.href}</p>
            {c.isPublished && (
              <a href={c.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><ExternalLink className="h-4 w-4" aria-hidden="true" />Open the listing</a>
            )}
          </AdminSubsection>
          <AdminSubsection title="Institutes" description={c.membership === "picked" ? "Hand-picked, in this order." : "Every institute matching the filters."}>
            {c.membership === "picked" ? (
              <ol className="space-y-1 text-sm text-ink-soft">{c.collegeSlugs.map((slug) => <li key={slug}>{nameOf(slug)}</li>)}</ol>
            ) : (
              <p className="text-sm text-ink-soft">{filterSummary(c, options)}</p>
            )}
          </AdminSubsection>
          <AdminSubsection title="Where it shows">
            <p className="text-sm text-ink-soft">Homepage: {c.placements?.homepage ? `order ${c.placements.homepage.order}, ${c.placements.homepage.limit} cards${c.placements.homepage.isVisible ? "" : ", hidden"}` : "not shown"}</p>
            <p className="mt-1 text-sm text-ink-soft">Footer: {c.placements?.footer ? `${c.placements.footer.column}, order ${c.placements.footer.order}` : "not linked"}</p>
            <p className="mt-1 text-sm text-ink-soft">Header menu: {c.menuGroup ? `under ${options.menuGroups.find((g) => g.id === c.menuGroup)?.label ?? "a category"}` : "not shown"}</p>
          </AdminSubsection>
          <AdminSubsection title="Search copy">
            <p className="text-sm font-medium text-ink">{c.seo?.metaTitle || "—"}</p>
            <p className="mt-1 text-sm text-ink-soft">{c.seo?.metaDescription || "—"}</p>
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "collection",
          label: "Collection",
          render: (c) => <CollectionForm options={options} collection={c} />,
        },
      ]}
      onSave={(c, data) => saveCollection(c.slug, data)}
      onAdd={(data) => createCollection(undefined, data)}
      onDelete={async (c) => {
        if (!c.isPublished) return deleteCollection(c.slug);
        // A live page: the visitor must type its slug, so one click cannot remove it.
        const typed = window.prompt(
          `"${c.title}" is live. Its link will stop working after deletion. Type the slug (${c.slug}) to confirm.`,
        );
        if (typed === null) return { error: "Deletion cancelled." };
        if (typed.trim() !== c.slug) return { error: "The slug did not match. Nothing was deleted." };
        return deleteCollection(c.slug, c.slug);
      }}
      renderAddForm={() => (
        <div className="sm:col-span-2">
          <CollectionForm options={options} collection={null} />
        </div>
      )}
    />
  );
}

