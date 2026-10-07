"use client";

import { useState } from "react";
import type { Exam } from "@/lib/api";
import type { ExamCardCopy } from "@/lib/home-copy";
import { TopExamCard } from "@/components/top-exam-card";
import { ViewAllButton } from "@/components/ui/view-all-button";

/*
  The homepage Top Exams row with live category tabs.

  The tabs are the categories (set on each exam in the admin) that at least one of the
  row's exams belongs to, in the order of the Fields list, preceded by All. Choosing a tab
  filters the cards in place, with no page load. A category with no exam in the row has no
  tab, so a tab never opens an empty row. With no categories at all there are no tabs.

  "View all" follows the tab: all exams, or the chosen category's.
*/

export function TopExamsRow({
  exams,
  categories,
  labels,
}: {
  exams: Exam[];
  /** Category names in the admin's order (the Fields list). */
  categories: string[];
  labels: ExamCardCopy;
}) {
  const [active, setActive] = useState("");

  const present = categories.filter((c) => exams.some((e) => (e.stream ?? "") === c));
  // A category named on an exam but missing from the Fields list still gets a tab, last.
  const extra = [...new Set(exams.map((e) => e.stream ?? "").filter((s) => s && !categories.includes(s)))];
  const tabs = [...present, ...extra];
  const current = tabs.includes(active) ? active : "";
  const shown = current ? exams.filter((e) => e.stream === current) : exams;

  return (
    <>
      {tabs.length > 0 && (
        <div role="tablist" aria-label="Exam categories" className="mt-7 flex flex-wrap justify-center gap-3">
          {["", ...tabs].map((tab) => {
            const on = tab === current;
            return (
              <button
                key={tab || "all"}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(tab)}
                className={`rounded-md border px-4 py-2 text-sm transition ${
                  on ? "border-brand text-brand" : "border-line text-ink-soft hover:border-brand hover:text-brand"
                }`}
              >
                {tab || "All"}
              </button>
            );
          })}
        </div>
      )}

      <div role="tabpanel" className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((exam) => (
          <TopExamCard key={exam.slug} exam={exam} labels={labels} />
        ))}
      </div>

      <div className="mt-10 text-center">
        <ViewAllButton href={current ? `/exams?stream=${encodeURIComponent(current)}` : "/exams"}>{labels.viewAllLabel}</ViewAllButton>
      </div>
    </>
  );
}
