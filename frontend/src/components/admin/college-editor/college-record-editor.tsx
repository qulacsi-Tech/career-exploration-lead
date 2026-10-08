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
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { loadCollegePools, loadCollegeRecord, saveCollegeRecord } from "@/lib/admin-actions";
import type { CollegePools, CollegeRecord, LoadedCollegeRecord } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { InfoTab, type EditorProps } from "@/components/admin/college-editor/tab-info";
import { CoursesTab, CutoffsTab, PlacementsTab, RankingsTab } from "@/components/admin/college-editor/tab-numbers";
import { CompareTab, FacultyTab, FaqTab, ReviewsTab } from "@/components/admin/college-editor/tab-people";
import { GalleryTab, VideosTab } from "@/components/admin/college-editor/tab-media";
import { NewsTab } from "@/components/admin/college-editor/tab-news";
import { SeoTab, WrittenTab } from "@/components/admin/college-editor/tab-written";
import { problemsByTab, type TabId } from "@/components/admin/college-editor/validate";

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

export function CollegeRecordEditor({ slug, onClose, onSaved }: { slug: string; onClose: () => void; onSaved?: (name: string) => void }) {
  const [initial, setInitial] = useState<CollegeRecord | null>(null);
  const [record, setRecord] = useState<CollegeRecord | null>(null);
  const [pools, setPools] = useState<CollegePools | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("info");
  const [error, setError] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    Promise.all([loadCollegeRecord(slug), loadCollegePools()]).then(([rec, poolList]) => {
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
  }, [slug]);

  const update: EditorProps["update"] = (change) => {
    setRecord((r) => (r ? change(r) : r));
    setError(null);
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
      const result = await saveCollegeRecord(slug, record);
      if ("error" in result) return setError(result.error);
      onSaved?.(record.name);
      onClose();
    });
  };

  const props: EditorProps | null = record && pools ? { record, update, pools, slug } : null;

  const body = (): ReactNode => {
    if (!props) return null;
    switch (tab) {
      case "info": return <InfoTab {...props} />;
      case "courses": return <CoursesTab {...props} />;
      case "reviews": return <ReviewsTab {...props} />;
      case "placements": return <PlacementsTab {...props} />;
      case "cutoffs": return <CutoffsTab {...props} />;
      case "rankings": return <RankingsTab {...props} />;
      case "gallery": return <div className="space-y-5"><GalleryTab {...props} /><VideosTab {...props} /></div>;
      case "faculty": return <FacultyTab {...props} />;
      case "compare": return <CompareTab {...props} />;
      case "qna": return <FaqTab {...props} />;
      case "news": return <NewsTab {...props} />;
      case "seo": return <SeoTab {...props} />;
      case "admissions":
      case "infrastructure":
      case "scholarships": {
        const w = WRITTEN[tab];
        return <WrittenTab {...props} tab={w.slug} title={w.title} description={w.description} />;
      }
    }
  };

  const firstProblemTab = problems ? TABS.find((t) => problems[t.id].length > 0) : undefined;
  const shownProblems = problems ? problems[tab] : [];

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
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
      title={record ? `Edit — ${record.name || slug}` : "Edit college"}
      description={record ? `${record.city}, ${record.state} · /college/${slug}` : "Loading…"}
      footer={footer}
    >
      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Could not load this college: {loadError}</p>}
      {!props && !loadError && <p className="text-sm text-ink-soft">Loading the college…</p>}

      {props && problems && (
        <>
          <div role="tablist" aria-label="College sections" className="-mt-1 mb-6 flex gap-1 overflow-x-auto border-b border-line">
            {TABS.map((t) => {
              const active = tab === t.id;
              const count = problems[t.id].length;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`ce-tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`ce-panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${active ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"}`}
                >
                  <t.icon className="h-4 w-4" aria-hidden="true" />
                  {t.label}
                  {count > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-semibold leading-4 text-white" title={`${count} to fix`}>{count}</span>}
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
            {body()}
          </div>
        </>
      )}
    </AdminModal>
  );
}
