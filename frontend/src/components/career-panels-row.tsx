"use client";

import { useState } from "react";
import type { CareerPanel } from "@/lib/api";
import { CareerPanelCard } from "@/components/career-panel-card";

/*
  The Explore Careers panels with live category tabs.

  Each panel can be assigned a category in the admin. The tabs are the categories that at
  least one panel is assigned to, in the order of the Fields list; choosing one shows that
  category's panels, plus the panels assigned to no category, which belong under every tab.
  With no panel assigned to a category there are no tabs and every panel shows.

  Four or more panels are laid out as three columns, the middle one stacking two panels, as
  the section was designed; fewer are one column each.
*/

export function CareerPanelsRow({ panels, categories }: { panels: CareerPanel[]; categories: string[] }) {
  const [active, setActive] = useState("");

  const named = panels.map((p) => p.category ?? "").filter(Boolean);
  const present = categories.filter((c) => named.includes(c));
  // A category named on a panel but missing from the Fields list still gets a tab, last.
  const tabs = [...present, ...new Set(named.filter((c) => !categories.includes(c)))];
  const current = tabs.length > 0 ? (tabs.includes(active) ? active : tabs[0]) : "";

  const shown = current ? panels.filter((p) => !p.category || p.category === current) : panels;
  const columns = shown.length >= 4 ? [[shown[0]], [shown[1], shown[2]], [shown[3]]] : shown.map((p) => [p]);

  return (
    <>
      {tabs.length > 0 && (
        <div role="tablist" aria-label="Career categories" className="mt-7 flex flex-wrap justify-center gap-3">
          {tabs.map((tab) => {
            const on = tab === current;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(tab)}
                className={`rounded-md border px-4 py-2 text-sm transition ${
                  on ? "border-brand text-brand" : "border-line text-ink-soft hover:border-brand hover:text-brand"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      )}

      <div role="tabpanel" key={current || "all"} className="mt-10 grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
        {columns.map((group, idx) => (
          <CareerPanelCard key={group[0].title + idx} panels={group} />
        ))}
      </div>
    </>
  );
}
