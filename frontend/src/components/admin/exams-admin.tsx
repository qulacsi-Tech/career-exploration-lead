"use client";

import { useState } from "react";
import type { Exam } from "@/lib/api";
import { SeoAvailability } from "@/components/admin/seo-availability";
import { ExamSeoTab } from "@/components/admin/exam-seo-tab";
import { AdminSubsection } from "@/components/admin/admin-section";
import { createExam, saveExam, setExamArchived } from "@/lib/admin-actions";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import {
  TextField,
  SelectField,
  TextAreaField,
  Field,
  NameSlugFields,
} from "@/components/admin/admin-fields";
import { FormDateField } from "@/components/admin/date-field";
import { ExamContentTab, ExamPracticeTab } from "@/components/admin/exam-extra-tabs";
import { ExamPriorityButton } from "@/components/admin/exam-priority-modal";
import { ExamCardTab, ExamCollegePriorityTab, ExamEligibilityTab, ExamPageTextTab } from "@/components/admin/exam-page-tabs";

const squash = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** An existing exam that reads like the one being added ("MHT CET" and "Maharashtra Common Entrance Test (MHT CET)"). */
function similarExam(exams: Exam[], name: string, shortName: string): Exam | null {
  const wanted = [squash(name), squash(shortName)].filter((n) => n.length >= 3);
  if (wanted.length === 0) return null;
  return (
    exams.find((e) => {
      const have = [squash(e.name), squash(e.shortName ?? "")].filter((n) => n.length >= 3);
      return wanted.some((w) => have.some((h) => h === w || (Math.min(h.length, w.length) >= 4 && (h.includes(w) || w.includes(h)))));
    }) ?? null
  );
}

/** Wraps the Add form's name fields and warns, without blocking, when a similar exam is already listed. */
function SimilarExamWarning({ exams, children }: { exams: Exam[]; children: React.ReactNode }) {
  const [match, setMatch] = useState<Exam | null>(null);
  return (
    <div
      className="contents"
      onBlur={(e) => {
        const target = e.target as HTMLInputElement;
        if (target.name !== "name" && target.name !== "shortName") return;
        const form = target.form;
        setMatch(similarExam(exams, String(form?.elements.namedItem("name") && (form.elements.namedItem("name") as HTMLInputElement).value), String(form?.elements.namedItem("shortName") && (form.elements.namedItem("shortName") as HTMLInputElement).value)));
      }}
    >
      {children}
      {match && (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">
          A similar exam is already listed: <strong>{match.name}</strong>. Two pages for the same exam split its search ranking. Edit that one instead, unless this is a different exam.
        </p>
      )}
    </div>
  );
}

export function ExamsAdmin({ exams }: { exams: Exam[] }) {
  // The categories already in use, offered in the Card & status tab.
  const streams = [...new Set(exams.map((e) => e.stream).filter((s): s is string => !!s))].sort();
  return (
    <ResourceAdmin<Exam>
      title="Exams"
      description="Entrance tests, their windows and patterns. Dates drive the exam alerts on the public site."
      addLabel="Add exam"
      addDescription="Basic details now; pattern and syllabus on the record afterwards."
      headerActions={<ExamPriorityButton exams={exams} />}
      rows={exams}
      onSave={(exam, data) => saveExam(exam.slug, data)}
      onAdd={(data) => createExam(undefined, data)}
      isArchived={(exam) => !!exam.archived}
      onArchive={(exam, archived) => setExamArchived(exam.slug, archived)}
      getKey={(exam) => exam.slug}
      searchIn={(exam) => [exam.name, exam.conductingBody, exam.level, exam.mode ?? "", exam.slug]}
      searchPlaceholder="Search name, body, level, mode"
      columns={[
        {
          key: "name",
          label: "Exam",
          render: (exam) => (
            // One line each, cut with an ellipsis so a long name never widens the table; the full text shows on hover.
            <div className="w-64 max-w-64">
              <p className="truncate font-medium text-ink" title={exam.name}>
                {exam.name}
                {exam.archived && <span className="ml-2 rounded bg-bg-alt px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-faint">Archived</span>}
              </p>
              <p className="truncate text-xs text-ink-faint" title={exam.conductingBody}>{exam.conductingBody}</p>
            </div>
          ),
        },
        {
          key: "level",
          label: "Level",
          render: (exam) => (
            <span className="rounded-md border border-line px-2 py-0.5 text-xs text-ink-soft">
              {exam.level}
            </span>
          ),
        },
        { key: "mode", label: "Mode", render: (exam) => exam.mode ?? "—" },
        {
          key: "priority",
          label: "Priority",
          // Its place on the public Exams page, set with Listing priority above. Blank: the usual order.
          render: (exam) => (exam.listingPriority ? <span className="tabular-nums font-semibold text-ink">{exam.listingPriority}</span> : <span className="text-ink-faint">—</span>),
        },
        {
          key: "registration",
          label: "Registration closes",
          render: (exam) => exam.registrationCloses || "—",
        },
        { key: "date", label: "Exam date", render: (exam) => exam.examDate || "—" },
        { key: "fee", label: "Fee", render: (exam) => <span className="block max-w-32 truncate" title={exam.applicationFee ?? ""}>{exam.applicationFee || "—"}</span> },
        {
          key: "seo",
          label: "SEO available",
          // Indexing and schema type have defaults, so only the text and the image decide Yes or No.
          render: (exam) => (
            <SeoAvailability
              seo={{
                metaTitle: exam.seo?.metaTitle,
                metaDescription: exam.seo?.metaDescription,
                canonical: exam.seo?.canonical,
                ogImage: exam.seo?.ogImage,
              }}
            />
          ),
        },
        {
          key: "issues",
          label: "Data check",
          render: (exam) =>
            exam.dataIssues && exam.dataIssues.length > 0 ? (
              <span
                className="inline-flex cursor-help items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
                title={exam.dataIssues.join("\n")}
              >
                ⚠ {exam.dataIssues.length} to fix
              </span>
            ) : (
              <span className="text-xs text-ink-faint">OK</span>
            ),
        },
      ]}
      renderView={(exam) => (
        <div className="space-y-6">
          <AdminSubsection title="Basic details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Short name" value={exam.shortName || "Not set"} />
              <Field label="Conducting body" value={exam.conductingBody} />
              <Field label="Level" value={exam.level} />
              <Field label="Mode" value={exam.mode ?? "Not set"} />
              <Field label="Frequency" value={exam.frequency ?? "Not set"} />
              <Field label="Application fee" value={exam.applicationFee ?? "Not set"} />
              <Field label="Official site" value={exam.officialSite ?? "Not set"} />
            </dl>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft" title={exam.description}>{exam.description}</p>
          </AdminSubsection>

          <AdminSubsection title="Dates">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Registration closes" value={exam.registrationCloses || "Not set"} />
              <Field label="Exam date" value={exam.examDate || "Not set"} />
            </dl>
          </AdminSubsection>

          <AdminSubsection title="Pattern">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field
                label="Duration"
                value={exam.durationMinutes ? `${exam.durationMinutes} minutes` : "Not set"}
              />
            </dl>
            {exam.sections?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {exam.sections.map((section) => (
                  <span key={section} className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft">
                    {section}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-faint">No sections recorded.</p>
            )}
            {exam.syllabus ? (
              <div className="mt-4">
                <p className="text-xs font-semibold text-ink-faint">Syllabus outline</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft whitespace-pre-wrap">{exam.syllabus}</p>
              </div>
            ) : null}
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "basic",
          label: "Basic details",
          render: (exam) => (
            <FieldGrid>
              <NameSlugFields
                nameLabel="Exam name"
                defaultName={exam.name}
                defaultSlug={exam.slug}
                nameMaxLength={200}
              />
              <TextField label="Short name" name="shortName" defaultValue={exam.shortName ?? ""} maxLength={100} hint="Used where space is tight. Empty: the full name." />
              <TextField
                label="Conducting body"
                name="conductingBody"
                defaultValue={exam.conductingBody}
                required
                maxLength={200}
              />
              <SelectField
                label="Level"
                name="level"
                defaultValue={exam.level}
                options={["National", "State"]}
              />
              <SelectField
                label="Mode"
                name="mode"
                defaultValue={exam.mode ?? "Online"}
                options={["Online", "Offline", "Hybrid"]}
              />
              <TextField label="Official site" name="officialSite" type="url" maxLength={300} placeholder="https://" defaultValue={exam.officialSite ?? ""} />
              <TextAreaField
                label="Description"
                name="description"
                rows={4}
                defaultValue={exam.description}
                className="sm:col-span-2 lg:col-span-3"
                hint="Shown on the exam page and used for the search snippet."
                required
                maxLength={4000}
              />
            </FieldGrid>
          ),
        },
        {
          id: "card",
          label: "Card & status",
          render: (exam) => <ExamCardTab exam={exam} streams={streams} />,
        },
        {
          id: "dates",
          label: "Dates & fees",
          render: (exam) => (
            <FieldGrid>
              <FormDateField
                id={`reg-${exam.slug}`}
                label="Registration closes"
                name="registrationCloses"
                defaultValue={exam.registrationCloses ?? ""}
                hint="Drives the deadline alerts on the public site."
              />
              <FormDateField id={`date-${exam.slug}`} label="Exam date" name="examDate" defaultValue={exam.examDate ?? ""} />
              <TextField label="Frequency" name="frequency" defaultValue={exam.frequency ?? ""} />
              <TextField
                label="Application fee"
                name="applicationFee"
                placeholder="e.g. ₹2,000, or Free"
                hint="Start with the amount. Anything about categories can follow in brackets."
                maxLength={100}
                defaultValue={exam.applicationFee ?? ""}
              />
            </FieldGrid>
          ),
        },
        {
          id: "pattern",
          label: "Pattern & syllabus",
          render: (exam) => (
            <FieldGrid>
              <TextField
                label="Duration (minutes)"
                name="durationMinutes"
                type="number"
                min={1}
                max={1440}
                step={1}
                hint="1 to 1440 minutes."
                defaultValue={exam.durationMinutes ? String(exam.durationMinutes) : ""}
              />
              <TextField
                label="Sections"
                name="sections"
                defaultValue={exam.sections?.join(", ") ?? ""}
                hint="Comma separated."
                className="sm:col-span-2"
              />
              <TextAreaField
                label="Syllabus outline"
                name="syllabus"
                rows={6}
                className="sm:col-span-2 lg:col-span-3"
                placeholder="Topic breakdown per section."
                defaultValue={exam.syllabus ?? ""}
              />
            </FieldGrid>
          ),
        },
        {
          id: "eligibility",
          label: "Eligibility & FAQs",
          render: (exam) => <ExamEligibilityTab exam={exam} />,
        },
        {
          id: "content",
          label: "Page content",
          render: (exam) => <ExamContentTab exam={exam} />,
        },
        {
          id: "practice",
          label: "Practice tests",
          render: (exam) => <ExamPracticeTab exam={exam} />,
        },
        {
          id: "colleges",
          label: "College priority",
          render: (exam) => <ExamCollegePriorityTab exam={exam} />,
        },
        {
          id: "text",
          label: "Page text",
          render: (exam) => <ExamPageTextTab exam={exam} />,
        },
        {
          id: "seo",
          label: "SEO",
          render: (exam) => <ExamSeoTab exam={exam} />,
        },
      ]}
      renderAddForm={() => (
        <SimilarExamWarning exams={exams}>
          <NameSlugFields
            nameLabel="Exam name"
            namePlaceholder="Common Admission Test (CAT)"
            slugPlaceholder="common-admission-test-cat"
            nameMaxLength={200}
          />
          <TextField label="Short name" name="shortName" placeholder="CAT" maxLength={100} hint="Used where space is tight. Empty: the full name." />
          <TextField label="Conducting body" name="conductingBody" placeholder="IIM" required maxLength={200} />
          <SelectField label="Level" name="level" options={["National", "State"]} />
          <SelectField label="Mode" name="mode" options={["Online", "Offline", "Hybrid"]} />
          <FormDateField id="new-exam-date" label="Exam date" name="examDate" />
          <TextAreaField
            label="Description"
            name="description"
            rows={3}
            className="sm:col-span-2"
            placeholder="Short description used on the exam page and in search results."
            required
            maxLength={4000}
          />
        </SimilarExamWarning>
      )}
    />
  );
}
