"use client";

import { Exam } from "@/lib/mock-data";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import {
  TextField,
  SelectField,
  SelectWithOtherField,
  TextAreaField,
  Field,
  NameSlugFields,
} from "@/components/admin/admin-fields";
import { ImageUploadField } from "@/components/admin/media-uploader";

export function ExamsAdmin({ exams }: { exams: Exam[] }) {
  return (
    <ResourceAdmin<Exam>
      title="Exams"
      description="Entrance tests, their windows and patterns. Dates drive the exam alerts on the public site."
      addLabel="Add exam"
      addDescription="Basic details now; pattern and syllabus on the record afterwards."
      rows={exams}
      getKey={(exam) => exam.slug}
      searchIn={(exam) => [exam.name, exam.conductingBody, exam.level]}
      searchPlaceholder="Search name, body, level"
      columns={[
        {
          key: "name",
          label: "Exam",
          render: (exam) => (
            <>
              <p className="font-medium text-ink">{exam.name}</p>
              <p className="text-xs text-ink-faint">{exam.conductingBody}</p>
            </>
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
          key: "registration",
          label: "Registration closes",
          render: (exam) => exam.registrationCloses,
        },
        { key: "date", label: "Exam date", render: (exam) => exam.examDate },
        { key: "fee", label: "Fee", render: (exam) => exam.applicationFee ?? "—" },
      ]}
      renderView={(exam) => (
        <div className="space-y-6">
          <AdminSubsection title="Basic details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Conducting body" value={exam.conductingBody} />
              <Field label="Level" value={exam.level} />
              <Field label="Mode" value={exam.mode ?? "Not set"} />
              <Field label="Frequency" value={exam.frequency ?? "Not set"} />
              <Field label="Application fee" value={exam.applicationFee ?? "Not set"} />
              <Field label="Official site" value={exam.officialSite ?? "Not set"} />
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{exam.description}</p>
          </AdminSubsection>

          <AdminSubsection title="Dates">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Registration closes" value={exam.registrationCloses} />
              <Field label="Exam date" value={exam.examDate} />
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
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "basic",
          label: "Basic details",
          render: (exam) => (
            <FieldGrid>
              <NameSlugFields nameLabel="Exam name" defaultName={exam.name} defaultSlug={exam.slug} />
              <TextField
                label="Conducting body"
                name="conductingBody"
                defaultValue={exam.conductingBody}
              />
              <SelectWithOtherField
                label="Level"
                name="level"
                defaultValue={exam.level}
                options={["National", "State"]}
                customPlaceholder="e.g. University, International"
              />
              <SelectField
                label="Mode"
                name="mode"
                defaultValue={exam.mode ?? "Online"}
                options={["Online", "Offline", "Hybrid"]}
              />
              <TextField label="Official site" name="officialSite" defaultValue={exam.officialSite ?? ""} />
              <TextAreaField
                label="Description"
                name="description"
                rows={4}
                defaultValue={exam.description}
                className="sm:col-span-2 lg:col-span-3"
                hint="Shown on the exam page and used for the search snippet."
              />
            </FieldGrid>
          ),
        },
        {
          id: "dates",
          label: "Dates & fees",
          render: (exam) => (
            <FieldGrid>
              <TextField
                label="Registration closes"
                name="registrationCloses"
                defaultValue={exam.registrationCloses}
                hint="Drives the deadline alerts on the public site."
              />
              <TextField label="Exam date" name="examDate" defaultValue={exam.examDate} />
              <TextField label="Frequency" name="frequency" defaultValue={exam.frequency ?? ""} />
              <TextField
                label="Application fee"
                name="applicationFee"
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
              />
            </FieldGrid>
          ),
        },
        {
          id: "seo",
          label: "SEO",
          render: (exam) => (
            <FieldGrid>
              <TextField
                label="Meta title"
                name="metaTitle"
                placeholder={`${exam.name} — Dates, Pattern & Results`}
                className="sm:col-span-2"
                hint="Around 60 characters."
              />
              <TextField label="Canonical URL" name="canonical" placeholder={`/exams/${exam.slug}`} />
              <TextAreaField
                label="Meta description"
                name="metaDescription"
                rows={3}
                placeholder="Around 155 characters, shown in search results."
                className="sm:col-span-2 lg:col-span-3"
              />
              <ImageUploadField
                label="Open Graph image"
                name="ogImage"
                altLabel="og:image:alt"
                hint="Shown when the page is shared. 1200x630 renders best."
              />
              <SelectWithOtherField
                label="Schema type"
                name="schemaType"
                defaultValue="Event"
                options={["Event", "EducationalOccupationalProgram", "WebPage"]}
                customPlaceholder="Any schema.org type"
              />
              <SelectField label="Indexing" name="robots" options={["Index, follow", "No index"]} />
            </FieldGrid>
          ),
        },
      ]}
      renderAddForm={() => (
        <>
          <NameSlugFields
            nameLabel="Exam name"
            namePlaceholder="Common Admission Test (CAT)"
            slugPlaceholder="common-admission-test-cat"
          />
          <TextField label="Conducting body" name="conductingBody" placeholder="IIM" />
          <SelectWithOtherField label="Level" name="level" options={["National", "State"]} />
          <SelectField label="Mode" name="mode" options={["Online", "Offline", "Hybrid"]} />
          <TextField label="Exam date" name="examDate" placeholder="29 Nov 2026" />
          <TextAreaField
            label="Description"
            name="description"
            rows={3}
            className="sm:col-span-2"
            placeholder="Short description used on the exam page and in search results."
          />
        </>
      )}
    />
  );
}
