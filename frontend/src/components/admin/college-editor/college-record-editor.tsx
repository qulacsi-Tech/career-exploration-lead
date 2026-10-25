"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  Award,
  BookOpen,
  Building2,
  GitCompareArrows,
  GraduationCap,
  Home,
  Images,
  MessagesSquare,
  Newspaper,
  Search,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { loadCollegePools, loadCollegeRecord, saveCollegeRecord } from "@/lib/admin-actions";
import { collegeSubmitEdit, loadMyCollegePools, loadMyCollegeRecord } from "@/lib/college-actions";
import type { CollegePools, CollegeRecord, LoadedCollegeRecord } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";
import { InfoTab, type EditorProps } from "@/components/admin/college-editor/tab-info";
import { CoursesTab, CutoffsTab, PlacementsTab, RankingsTab } from "@/components/admin/college-editor/tab-numbers";
import { CompareTab, FacultyTab, FaqTab, ReviewsTab } from "@/components/admin/college-editor/tab-people";
import { GalleryTab, VideosTab } from "@/components/admin/college-editor/tab-media";
import { NewsTab } from "@/components/admin/college-editor/tab-news";
import { SeoTab, WrittenTab } from "@/components/admin/college-editor/tab-written";
import { AdministrativeTab } from "@/components/admin/college-editor/tab-administrative";
import { cleanRecord, problemsByTab, type TabId } from "@/components/admin/college-editor/validate";

/*
  The college editor: one dialog, one tab for each part of the public college page, in the
  order of the page's own tab rail, and one Save for all of it.

    College Info · Courses & Fees · Reviews · Admissions · Placements · Cut-Offs · Rankings ·
    Gallery · Infrastructure · Faculty · Compare · Q&A · Scholarships · News · SEO

  Everything here is stored (see routers/admin_college_record.py) and is what the public page
  shows. Each tab is checked as you type; a tab with a problem carries a red count, the footer
  says what is wrong, and Save waits until it is fixed. The server checks again.
*/

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "info", label: "College Info", icon: Building2 },
  { id: "courses", label: "Courses & Fees", icon: BookOpen },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "admissions", label: "Admissions", icon: GraduationCap },
  { id: "placements", label: "Placements", icon: TrendingUp },
  { id: "cutoffs", label: "Cut-Offs", icon: Target },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "infrastructure", label: "Infrastructure", icon: Home },
  { id: "faculty", label: "Faculty", icon: Users },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
  { id: "qna", label: "Q&A", icon: MessagesSquare },
  { id: "scholarships", label: "Scholarships", icon: Award },
  { id: "news", label: "News", icon: Newspaper },
  { id: "seo", label: "SEO", icon: Search },
  // Who looks after this college in the panel. Platform team only; acts at once, outside Save.
  { id: "administrative", label: "Administrative", icon: ShieldCheck },
];

const WRITTEN: Record<"admissions" | "infrastructure" | "scholarships", { slug: string; title: string; description: string }> = {
  admissions: { slug: "admission-process", title: "Admissions", description: "The step-by-step process, documents required and key dates. Shown on the Admissions tab, with the entrance exams accepted beneath it." },
  infrastructure: { slug: "hostel-facilities", title: "Infrastructure", description: "Accommodation, mess, sports, labs and campus amenities. Shown on the Infrastructure tab." },
  scholarships: { slug: "scholarships", title: "Scholarships", description: "Institute and government scholarships, who is eligible and how to apply. Shown on the Scholarships tab." },
};

const stripped = (r: LoadedCollegeRecord): CollegeRecord => {
  const { slug: _slug, updatedAt: _updatedAt, ...record } = r;
  void _slug;
  void _updatedAt;
  return record;
};

/**
 * `full` is the platform admin's editor. `readonly` is a college admin looking at their own
 * college: the same screens with every field switched off, no Save, no Administrative tab, and
 * data read through the college endpoints, which only ever return their college.
 */
export function CollegeRecordEditor({
  slug,
  onClose,
  onSaved,
  mode = "full",
}: {
  slug: string;
  onClose: () => void;
  onSaved?: (name: string, record: CollegeRecord) => void;
  mode?: "full" | "readonly" | "submit";
}) {
  const readonly = mode === "readonly";
  // A college admin, whether looking or editing, reads through the college endpoints and has no Administrative tab.
  const forCollege = mode !== "full";
  const submitting = mode === "submit";
  const tabs = forCollege ? TABS.filter((t) => t.id !== "administrative") : TABS;
  const [note, setNote] = useState("");
  const [initial, setInitial] = useState<CollegeRecord | null>(null);
  const [record, setRecord] = useState<CollegeRecord | null>(null);
  const [pools, setPools] = useState<CollegePools | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("info");
  const [error, setError] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [pending, startTransition] = useTransition();
  // "Saved." shows in the dialog itself: after a save the dialog stays open, and closes only when it is closed.
  const [flash, showFlash, clearFlash] = useFlash();

  useEffect(() => {
    let alive = true;
    Promise.all(forCollege ? [loadMyCollegeRecord(), loadMyCollegePools()] : [loadCollegeRecord(slug), loadCollegePools()]).then(([rec, poolList]) => {
      if (!alive) return;
      if ("error" in rec) return setLoadError(rec.error);
      if ("error" in poolList) return setLoadError(poolList.error);
      const clean = stripped(rec);
      setInitial(clean);
      setRecord(clean);
      setPools(poolList);
    });
    return () => {
      alive = false;
    };
  }, [slug, forCollege]);

  const update: EditorProps["update"] = (change) => {
    setRecord((r) => (r ? change(r) : r));
    setError(null);
    clearFlash();
  };

  const problems = useMemo(() => (record ? problemsByTab(record) : null), [record]);
  const totalProblems = problems ? Object.values(problems).reduce((n, list) => n + list.length, 0) : 0;
  const dirty = useMemo(() => !!record && !!initial && JSON.stringify(record) !== JSON.stringify(initial), [record, initial]);

  const requestClose = () => {
    if (dirty && !confirmingClose) return setConfirmingClose(true);
    onClose();
  };

  const save = () => {
    if (!record) return;
    setError(null);
    startTransition(async () => {
      const cleaned = cleanRecord(record);
      const result = await saveCollegeRecord(slug, cleaned);
      if ("error" in result) {
        clearFlash();
        return setError(result.error);
      }
      // What was saved is now the starting point, so "Unsaved changes" clears and the dialog stays on this tab.
      setInitial(cleaned);
      setRecord(cleaned);
      setConfirmingClose(false);
      onSaved?.(cleaned.name, cleaned);
      showFlash("ok", `${cleaned.name || "The college"} saved.`);
    });
  };

  /** A college admin does not save: the edit goes to the platform team, and the live college stays as it is. */
  const submitForApproval = () => {
    if (!record) return;
    setError(null);
    startTransition(async () => {
      const result = await collegeSubmitEdit(cleanRecord(record), note);
      if ("error" in result) return setError(result.error);
      onSaved?.(record.name, record);
      onClose();
    });
  };

  const props: EditorProps | null = record && pools ? { record, update, pools, slug } : null;

  const body = (): ReactNode => {
    if (!props) return null;
    switch (tab) {
      case "info": return <InfoTab {...props} />;
      case "courses": return <CoursesTab {...props} />;
      case "reviews":
        return (
          <>
            {forCollege && <p className="mb-4 rounded-lg bg-bg-alt px-4 py-3 text-sm text-ink-soft">Reviews are written by students. They can be read here but not changed.</p>}
            <ReviewsTab {...props} />
          </>
        );
      case "placements": return <PlacementsTab {...props} />;
      case "cutoffs": return <CutoffsTab {...props} />;
      case "rankings": return <RankingsTab {...props} />;
      case "gallery": return <div className="space-y-5"><GalleryTab {...props} /><VideosTab {...props} /></div>;
      case "faculty": return <FacultyTab {...props} />;
      case "compare": return <CompareTab {...props} />;
      case "qna": return <FaqTab {...props} />;
      case "news": return <NewsTab {...props} />;
      case "seo": return <SeoTab {...props} />;
      case "administrative": return <AdministrativeTab slug={slug} institutionType={props.record.institutionType} />;
      case "admissions":
      case "infrastructure":
      case "scholarships": {
        const w = WRITTEN[tab];
        return <WrittenTab {...props} tab={w.slug} title={w.title} description={w.description} />;
      }
    }
  };

  const firstProblemTab = problems ? TABS.find((t) => problems[t.id].length > 0) : undefined;
  const shownProblems = problems && !readonly ? problems[tab] : [];

  const readonlyFooter = (
    <div className="flex w-full flex-wrap items-center gap-3">
      <p className="text-xs text-ink-soft">View only while a request of yours is waiting for review.</p>
      <button type="button" onClick={onClose} className="ml-auto rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand">
        Close
      </button>
    </div>
  );

  const submitFooter = (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {confirmingClose && (
        <p role="alert" className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          You have changes that are not sent. Close anyway?{" "}
          <button type="button" onClick={onClose} className="font-semibold underline underline-offset-2">Yes, discard them</button>{" "}
          <button type="button" onClick={() => setConfirmingClose(false)} className="font-semibold underline underline-offset-2">Keep editing</button>
        </p>
      )}
      <label className="sr-only" htmlFor="submit-note">What did you change?</label>
      <input
        id="submit-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
        placeholder="What did you change? (optional, for the reviewer)"
        className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {totalProblems > 0 && firstProblemTab && (
          <button type="button" onClick={() => setTab(firstProblemTab.id)} className="text-xs text-red-700 underline-offset-2 hover:underline">
            {totalProblems} thing{totalProblems === 1 ? "" : "s"} to fix, starting on {firstProblemTab.label}
          </button>
        )}
        <span className="text-xs text-ink-soft">Goes live only after the team approves it.</span>
        <button type="button" onClick={requestClose} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">Cancel</button>
        <button type="button" onClick={submitForApproval} disabled={!record || !dirty || totalProblems > 0 || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Sending…" : "Submit for approval"}
        </button>
      </div>
    </div>
  );

  const footer = readonly ? readonlyFooter : submitting ? submitFooter : (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {flash && <div className="w-full"><StatusMessage flash={flash} /></div>}
      {confirmingClose && (
        <p role="alert" className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          You have unsaved changes. Close anyway?{" "}
          <button type="button" onClick={onClose} className="font-semibold underline underline-offset-2">Yes, discard them</button>{" "}
          <button type="button" onClick={() => setConfirmingClose(false)} className="font-semibold underline underline-offset-2">Keep editing</button>
        </p>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {totalProblems > 0 && firstProblemTab && (
          <button type="button" onClick={() => setTab(firstProblemTab.id)} className="text-xs text-red-700 underline-offset-2 hover:underline">
            {totalProblems} thing{totalProblems === 1 ? "" : "s"} to fix, starting on {firstProblemTab.label}
          </button>
        )}
        {dirty && totalProblems === 0 && <span className="text-xs text-ink-soft">Unsaved changes</span>}
        <button type="button" onClick={requestClose} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">Cancel</button>
        <button type="button" onClick={save} disabled={!record || !dirty || totalProblems > 0 || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminModal
      open
      onClose={requestClose}
      size="full"
      title={record ? `${readonly ? "Your college" : "Edit"} — ${record.name || slug}` : "Edit college"}
      description={record ? `${record.city}, ${record.state} · /college/${slug}` : "Loading…"}
      footer={footer}
    >
      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Could not load this college: {loadError}</p>}
      {!props && !loadError && <p className="text-sm text-ink-soft">Loading the college…</p>}

      {props && problems && (
        <>
          <div role="tablist" aria-label="College sections" className="-mt-1 mb-6 flex flex-wrap gap-x-1 border-b border-line">
            {tabs.map((t) => {
              const active = tab === t.id;
              const count = readonly ? 0 : problems[t.id].length;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`ce-tab-${t.id}`}
                  aria-selected={active}
                  aria-label={count > 0 ? `${t.label}, ${count} to fix` : t.label}
                  aria-controls={`ce-panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${active ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"}`}
                >
                  <t.icon className="h-4 w-4" aria-hidden="true" />
                  {t.label}
                  {count > 0 && <span aria-hidden="true" className="rounded-full bg-red-600 px-1.5 text-[10px] font-semibold leading-4 text-white" title={`${count} to fix`}>{count}</span>}
                </button>
              );
            })}
          </div>

          {shownProblems.length > 0 && (
            <ul role="alert" className="mb-5 space-y-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {shownProblems.slice(0, 8).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {shownProblems.length > 8 && <li>…and {shownProblems.length - 8} more.</li>}
            </ul>
          )}

          <div role="tabpanel" id={`ce-panel-${tab}`} aria-labelledby={`ce-tab-${tab}`}>
            {/* A disabled fieldset switches off every input, select and button inside it. */}
            <fieldset disabled={readonly || (forCollege && tab === "reviews")} className="min-w-0 border-0 p-0">
              {body()}
            </fieldset>
          </div>
        </>
      )}
    </AdminModal>
  );
}
