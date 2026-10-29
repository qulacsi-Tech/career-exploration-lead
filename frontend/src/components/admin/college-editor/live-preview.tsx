"use client";

import { Check, Download, Eye, MapPin, Star } from "lucide-react";
import { DEFAULT_TAB_ICON, TAB_ICONS } from "@/lib/tab-icons";
import type { CollegeRecord } from "@/lib/api";
import { docOutline } from "@/lib/college-outline";
import type { TabId } from "@/components/admin/college-editor/validate";

/*
  A short, live look at how a written tab (Admissions, Infrastructure, Scholarships) will read on the college's
  public page, beside the text editor. It is built from what is typed (nothing waits for Save) and follows the
  page from the top: the sticky bar with the college's name, rating and buttons, the tab rail with this tab lit,
  the section's hero, its Key Highlights and its Full Details. It is a sketch to check wording against, not a
  pixel copy: the real page has more room and more motion.

  Only the tabs that have a text editor have one. The others are forms of figures, where the form is the preview.
*/

type Written = "admissions" | "infrastructure" | "scholarships";

/** The three tabs with a text editor, and what the public page calls them. */
const WRITTEN: Record<Written, { slug: string; label: string }> = {
  admissions: { slug: "admission-process", label: "Admissions" },
  infrastructure: { slug: "hostel-facilities", label: "Infrastructure" },
  scholarships: { slug: "scholarships", label: "Scholarships" },
};

export const hasLivePreview = (tab: TabId): tab is Written => tab in WRITTEN;

const RAIL = ["College Info", "Courses", "Fees", "Reviews", "Admissions", "Placements", "Cut-Offs", "Rankings", "Gallery", "Infrastructure", "Faculty", "Compare", "Q&A", "Scholarships", "News"];

export function LivePreview({ record, tab }: { record: CollegeRecord; tab: TabId }) {
  if (!hasLivePreview(tab)) return null;
  const meta = WRITTEN[tab];
  const doc = record.detail.tabs[meta.slug];
  const outline = doc ? docOutline(doc) : null;
  const empty = !outline || (outline.topics.length === 0 && outline.points.length === 0 && outline.words === 0);
  const minutes = outline ? Math.max(1, Math.round(outline.words / 200)) : 1;
  // The banner as the editor set it under "Page header", or the default wording and icon.
  const header = record.detail.tabHeaders?.[meta.slug];
  const bannerLabel = header?.label?.trim() || meta.label;
  const bannerHeading = header?.heading?.trim() || `Everything about ${bannerLabel.toLowerCase()} at ${record.name || "this college"}`;
  const Icon = (TAB_ICONS[header?.icon || DEFAULT_TAB_ICON[meta.slug]] ?? TAB_ICONS.grad).Icon;

  return (
    <aside aria-label="How this will look on the college page" className="min-w-0 lg:sticky lg:top-0 lg:self-start">
      <div className="overflow-hidden rounded-2xl border border-line bg-bg shadow-sm">
        <p className="flex items-center gap-1.5 border-b border-line-soft bg-bg-alt px-3 py-2 text-[11px] font-semibold text-ink-soft">
          <Eye className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          Preview: {meta.label} page
        </p>

        {/* The page's top bar: name, place and rating, with the Brochure and Apply buttons. */}
        <div className="flex items-center justify-between gap-2 border-b border-line-soft bg-surface px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-display text-[13px] font-bold leading-tight text-ink">{record.name || "College name"}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-ink-soft">
              <MapPin className="h-3 w-3 shrink-0 text-brand" aria-hidden="true" />
              {record.city || "City"}
              <span aria-hidden>·</span>
              <span className="inline-flex" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-gold text-gold" />
                ))}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[9px] font-semibold text-ink">
              <Download className="h-2.5 w-2.5" aria-hidden="true" />
              Brochure
            </span>
            <span className="rounded-full bg-brand px-2.5 py-1 text-[9px] font-bold text-white">Apply Now</span>
          </div>
        </div>

        {/* The tab rail, with this tab lit. */}
        <div className="flex gap-3 overflow-hidden border-b border-line-soft bg-surface px-3 text-[10px]">
          {RAIL.map((r) => (
            <span key={r} className={`shrink-0 border-b-2 py-1.5 font-medium ${r === meta.label ? "border-brand text-brand" : "border-transparent text-ink-faint"}`}>
              {r}
            </span>
          ))}
        </div>

        <div className="max-h-[32rem] space-y-3 overflow-y-auto p-3">
          {/* The section's hero. */}
          <div className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-brand-soft via-bg-alt to-surface p-3">
            <span aria-hidden className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-brand/10" />
            <div className="relative flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow shadow-brand/30">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-brand">{bannerLabel}</p>
                <p className="font-display text-[13px] font-extrabold leading-tight text-ink">{bannerHeading}</p>
              </div>
            </div>
            {!empty && outline && (
              <div className="relative mt-2 flex flex-wrap gap-1 text-[9px] font-medium text-brand-ink">
                {outline.topics.length > 0 && <span className="rounded-full bg-white/80 px-2 py-0.5">{outline.topics.length} topics</span>}
                {outline.points.length > 0 && <span className="rounded-full bg-white/80 px-2 py-0.5">{outline.points.length} key points</span>}
                <span className="rounded-full bg-white/80 px-2 py-0.5">{minutes} min read</span>
              </div>
            )}
          </div>

          {empty || !outline ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[11px] text-ink-faint">Nothing written for this tab yet. The page will say so until there is.</p>
          ) : (
            <>
              {/* Key Highlights: the list items of the text, as tiles. */}
              {outline.points.length > 0 && (
                <div className="rounded-xl border border-line bg-surface p-3">
                  <p className="mb-2 font-display text-[12px] font-bold text-brand">Key Highlights</p>
                  <ul className="space-y-1.5">
                    {outline.points.slice(0, 4).map((p) => (
                      <li key={p} className="flex items-start gap-1.5 rounded-lg bg-bg-alt px-2 py-1.5 text-[10px] text-ink">
                        <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                          <Check className="h-2.5 w-2.5" aria-hidden="true" />
                        </span>
                        <span className="line-clamp-2">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full Details: for Admissions, with the course filter the public page offers. */}
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="mb-2 font-display text-[12px] font-bold text-brand">Full Details</p>
                {tab === "admissions" && outline.topics.length > 1 && (
                  <ul className="mb-2 flex flex-wrap gap-1">
                    {["All", ...outline.topics].map((t, i) => (
                      <li key={t} className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${i === 0 ? "border-brand bg-brand text-white" : "border-line text-ink-soft"}`}>
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-ink-faint">About {outline.words} words of text, shown in full here on the page.</p>
                {tab === "admissions" && record.examsAccepted.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-[9px] font-semibold text-ink">Exams accepted</span>
                    {record.examsAccepted.map((e) => (
                      <span key={e} className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[9px] font-medium text-brand-ink">
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {tab === "admissions" && record.cutoffs.length > 0 && (
                <div className="rounded-xl border border-line bg-surface p-3">
                  <p className="mb-1.5 font-display text-[12px] font-bold text-brand">Cut-off Snapshot</p>
                  <ul className="space-y-0.5 text-[10px] text-ink-soft">
                    {record.cutoffs.slice(0, 3).map((c, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">
                          {c.exam} · {c.category}
                        </span>
                        <span className="shrink-0 font-semibold text-ink">{c.score}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <p className="mt-2 px-1 text-[10px] text-ink-faint">A short sketch of the public page, built from what you have typed. It updates as you edit.</p>
    </aside>
  );
}
