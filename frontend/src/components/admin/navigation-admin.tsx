"use client";

import { useState } from "react";
import type { AdminCourse, NavMenuConfig, NavMenuName } from "@/lib/api";
import type { SourceGroup } from "@/components/colleges-menu-data";
import { AdminPageHeader } from "@/components/admin/admin-section";
import { NavMenuAdmin } from "@/components/admin/nav-menu-admin";
import { CourseInfoButton } from "@/components/admin/course-info-modal";

type MenuProps = { source: SourceGroup[]; links: { slug: string; title: string; href: string; hint?: string }[]; initial: NavMenuConfig };

const TABS: { id: NavMenuName; label: string }[] = [
  { id: "colleges", label: "Top Colleges" },
  { id: "courses", label: "Top Courses" },
];

/**
 * Sections → Navigation: one tab for each header menu. Both stay mounted, so edits in one tab are still
 * there when the other is looked at; each saves on its own.
 */
export function NavigationAdmin({ colleges, courses, courseInfo }: { colleges: MenuProps; courses: MenuProps; courseInfo: { courses: AdminCourse[]; exams: string[] } }) {
  const [tab, setTab] = useState<NavMenuName>("colleges");
  const props = { colleges, courses };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Navigation" description="What the site header's menus show, and in what order." />
      <div role="tablist" aria-label="Header menus" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`nav-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`nav-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === t.id ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {TABS.map((t) => (
        <div key={t.id} role="tabpanel" id={`nav-panel-${t.id}`} aria-labelledby={`nav-tab-${t.id}`} hidden={tab !== t.id}>
          <NavMenuAdmin menu={t.id} {...props[t.id]} actions={t.id === "courses" ? <CourseInfoButton courses={courseInfo.courses} exams={courseInfo.exams} /> : undefined} />
        </div>
      ))}
    </div>
  );
}
