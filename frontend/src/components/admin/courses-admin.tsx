"use client";

import { Course } from "@/lib/mock-data";
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

const LEVELS = ["UG", "PG", "Diploma", "Doctorate"];
const STREAMS = [
  "Management",
  "Engineering",
  "Medical",
  "Science",
  "Arts",
  "Commerce",
  "Pharmacy",
  "Law",
  "Paramedical",
];

export function CoursesAdmin({ courses }: { courses: Course[] }) {
  return (
    <ResourceAdmin<Course>
      title="Courses"
      description="Degree programmes offered across the directory, with eligibility, fees and accepted exams."
      addLabel="Add course"
      addDescription="Basic details now; specialisations and SEO on the record afterwards."
      rows={courses}
      getKey={(course) => course.slug}
      searchIn={(course) => [course.name, course.fullName, course.stream, course.level]}
      searchPlaceholder="Search name, stream, level"
      columns={[
        {
          key: "name",
          label: "Course",
          className: "text-ink",
          render: (course) => (
            <>
              <p className="font-medium text-ink">{course.name}</p>
              <p className="text-xs text-ink-faint">{course.fullName}</p>
            </>
          ),
        },
        { key: "level", label: "Level", render: (course) => course.level },
        { key: "stream", label: "Stream", render: (course) => course.stream },
        { key: "duration", label: "Duration", render: (course) => course.duration },
        { key: "fees", label: "Average fees", render: (course) => course.averageFees },
        {
          key: "colleges",
          label: "Colleges",
          render: (course) => course.collegeCount.toLocaleString(),
        },
      ]}
      renderView={(course) => (
        <div className="space-y-6">
          <AdminSubsection title="Basic details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Full name" value={course.fullName} />
              <Field label="Level" value={course.level} />
              <Field label="Stream" value={course.stream} />
              <Field label="Duration" value={course.duration} />
              <Field label="Average fees" value={course.averageFees} />
              <Field label="Colleges offering" value={course.collegeCount.toLocaleString()} />
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{course.about}</p>
          </AdminSubsection>

          <AdminSubsection title="Eligibility">
            <p className="text-sm text-ink-soft">{course.eligibility}</p>
          </AdminSubsection>

          <AdminSubsection title="Modes & exams">
            <div className="flex flex-wrap gap-2">
              {[...course.modes, ...course.examsAccepted].map((tag) => (
                <span key={tag} className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft">
                  {tag}
                </span>
              ))}
            </div>
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "basic",
          label: "Basic details",
          render: (course) => (
            <FieldGrid>
              <NameSlugFields
                nameLabel="Short name"
                defaultName={course.name}
                defaultSlug={course.slug}
              />
              <TextField label="Full name" name="fullName" defaultValue={course.fullName} required />
              <SelectField label="Level" name="level" defaultValue={course.level} options={LEVELS} />
              <SelectWithOtherField
                label="Stream"
                name="stream"
                defaultValue={course.stream}
                options={STREAMS}
                customPlaceholder="e.g. Design, Hospitality"
              />
              <TextField label="Duration" name="duration" defaultValue={course.duration} />
              <TextAreaField
                label="About"
                name="about"
                rows={4}
                defaultValue={course.about}
                className="sm:col-span-2 lg:col-span-3"
                hint="Shown on the course page and used for the search snippet."
              />
            </FieldGrid>
          ),
        },
        {
          id: "eligibility",
          label: "Eligibility & fees",
          render: (course) => (
            <FieldGrid>
              <TextField label="Average fees" name="averageFees" defaultValue={course.averageFees} />
              <TextField
                label="Modes"
                name="modes"
                defaultValue={course.modes.join(", ")}
                hint="Comma separated."
              />
              <TextField
                label="Exams accepted"
                name="examsAccepted"
                defaultValue={course.examsAccepted.join(", ")}
                hint="Comma separated."
              />
              <TextAreaField
                label="Eligibility"
                name="eligibility"
                rows={3}
                defaultValue={course.eligibility}
                className="sm:col-span-2 lg:col-span-3"
              />
            </FieldGrid>
          ),
        },
        {
          id: "seo",
          label: "SEO",
          render: (course) => (
            <div className="space-y-5">
              <FieldGrid>
                <TextField
                  label="Meta title"
                  name="metaTitle"
                  placeholder={`${course.name} — Fees, Eligibility & Colleges`}
                  className="sm:col-span-2"
                  hint="Around 60 characters."
                />
                <TextField label="Canonical URL" name="canonical" placeholder={`/courses/${course.slug}`} />
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
                  defaultValue="Course"
                  options={["Course", "EducationalOccupationalProgram", "WebPage"]}
                  customPlaceholder="Any schema.org type"
                />
                <SelectField label="Indexing" name="robots" options={["Index, follow", "No index"]} />
              </FieldGrid>
            </div>
          ),
        },
      ]}
      renderAddForm={() => (
        <>
          <NameSlugFields nameLabel="Short name" namePlaceholder="MBA" slugPlaceholder="mba" />
          <TextField label="Full name" name="fullName" placeholder="Master of Business Administration" required />
          <SelectField label="Level" name="level" options={LEVELS} />
          <SelectWithOtherField label="Stream" name="stream" options={STREAMS} />
          <TextField label="Duration" name="duration" placeholder="24 Months" />
          <TextAreaField
            label="About"
            name="about"
            rows={3}
            className="sm:col-span-2"
            placeholder="Short description used on the course page and in search results."
          />
        </>
      )}
    />
  );
}
