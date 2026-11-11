"use client";

import { useState } from "react";
import type { Exam } from "@/lib/api";
import { ArticleSectionsEditor } from "@/components/admin/article-sections-editor";
import { PracticeTestEditor } from "@/components/admin/practice-test-editor";
import { PracticeTestsTab } from "@/components/admin/practice-tests-tab";
import type { ArticleSection } from "@/lib/article-sections";

/** The saved sections of an exam. After a save the edit form holds them as the JSON text it posted, so both are read. */
function sectionsOf(value: unknown): ArticleSection[] {
  // After a save the table's row holds the posted JSON text, wrapped in a one-item list.
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === "string") return sectionsOf(value[0]);
  if (Array.isArray(value)) return value as ArticleSection[];
  if (typeof value === "string" && value) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as ArticleSection[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** These tabs sit inside the Edit form: Enter in a text box must not save and close it. */
const noEnterSubmit = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
};

/**
 * The "Page content" tab of an exam's Edit form: the same section editor as a news article. Add a section, give it a
 * heading, then add text, points, tables, steps, key facts, notes, quotes or pictures. What is built here is shown
 * on the exam's page. It is saved with the form's Save button, as one hidden field.
 */
export function ExamContentTab({ exam }: { exam: Exam }) {
  const [sections, setSections] = useState<ArticleSection[]>(() => sectionsOf((exam as { contentSections?: unknown }).contentSections));
  return (
    <div className="space-y-3" onKeyDown={noEnterSubmit}>
      <p className="text-sm text-ink-soft">
        Build extra content for the exam page with the same editor as news articles. It appears on the exam page after the syllabus. Blank blocks are left out when you save.
      </p>
      <input type="hidden" name="contentSections" value={JSON.stringify(sections)} />
      <ArticleSectionsEditor sections={sections} onChange={setSections} />
    </div>
  );
}

/**
 * The "Practice tests" tab of an exam's Edit form: the mock tests candidates can sit for it. Add a test, then open it
 * to write or import its questions, answers and solutions. Tests are saved in their own editor, separately from the
 * form's Save button, and appear on the exam page and under its Practice link once published.
 */
export function ExamPracticeTab({ exam }: { exam: Exam }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="space-y-3" onKeyDown={noEnterSubmit}>
      <PracticeTestsTab examSlug={exam.slug} refreshKey={key} note={note} onEdit={setEditing} />
      {editing && (
        <PracticeTestEditor
          slug={editing}
          examSlug={exam.slug}
          onClose={(message) => {
            setEditing(null);
            if (message) {
              setNote(message);
              setKey((k) => k + 1);
            }
          }}
        />
      )}
    </div>
  );
}
