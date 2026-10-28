"use client";

import { useState } from "react";
import type { AdminCourse, AdminField, AdminSpecialisation } from "@/lib/api";
import { CategoriesAdmin } from "@/components/admin/categories-admin";
import { CoursesAdmin } from "@/components/admin/courses-admin";
import { SpecialisationsAdmin } from "@/components/admin/specialisations-admin";

export type CatalogueTab = "categories" | "courses" | "specialisations";

const TABS: { id: CatalogueTab; label: string; example: string }[] = [
  { id: "categories", label: "Categories", example: "Engineering, Management, Medical" },
  { id: "courses", label: "Courses", example: "B.Tech, B.E., MBA, BBA" },
  { id: "specialisations", label: "Specialisations", example: "Computer Science, Mechanical, Finance, Marketing" },
];

/**
 * The three lists the college form picks from, on one page and each independent of the others:
 * Category, Course, Specialisation. Which tab is open lives in the address (?tab=), so a link
 * or a reload lands where it was.
 */
export function CatalogueAdmin({
  categories,
  courses,
  specialisations,
  initialTab,
}: {
  categories: AdminField[];
  courses: AdminCourse[];
  specialisations: AdminSpecialisation[];
  initialTab: CatalogueTab;
}) {
  const [active, setActive] = useState<CatalogueTab>(initialTab);
  const counts: Record<CatalogueTab, number> = {
    categories: categories.length,
    courses: courses.length,
    specialisations: specialisations.length,
  };

  const select = (id: CatalogueTab) => {
    setActive(id);
    window.history.replaceState(null, "", `?tab=${id}`);
  };

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Catalogue lists" className="grid gap-3 sm:grid-cols-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => select(tab.id)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              active === tab.id ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand/40"
            }`}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className={`text-sm font-semibold ${active === tab.id ? "text-brand-ink" : "text-ink"}`}>{tab.label}</span>
              <span className="text-xs text-ink-faint">{counts[tab.id]}</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink-soft">{tab.example}</span>
          </button>
        ))}
      </div>

      {active === "categories" && <CategoriesAdmin categories={categories} courses={courses} />}
      {active === "courses" && <CoursesAdmin courses={courses} streams={categories.map((c) => c.name)} specialisations={specialisations} />}
      {active === "specialisations" && <SpecialisationsAdmin specialisations={specialisations} courses={courses} />}
    </div>
  );
}
