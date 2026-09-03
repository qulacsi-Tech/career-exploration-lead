"use client";

import { useState } from "react";
import { Course, Specialisation } from "@/lib/mock-data";
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

/**
 * Specialisations hang off a course, so the parent course is a select rather
 * than free text — a specialisation with a mistyped parent disappears from the
 * course page without any obvious error.
 */
export function SpecialisationsAdmin({
  specialisations,
  courses,
}: {
  specialisations: Specialisation[];
  courses: Course[];
}) {
  const courseNames = courses.map((course) => course.name);

  return (
    <ResourceAdmin<Specialisation>
      title="Specialisations"
      description="Electives and branches within a course, each with its own page and fees."
      addLabel="Add specialisation"
      addDescription="Pick the parent course, then the basics."
      rows={specialisations}
      getKey={(item) => item.slug}
      searchIn={(item) => [item.name, item.courseName, item.stream]}
      searchPlaceholder="Search name, course, stream"
      columns={[
        {
          key: "name",
          label: "Specialisation",
          render: (item) => (
            <>
              <p className="font-medium text-ink">{item.name}</p>
              <p className="text-xs text-ink-faint">{item.slug}</p>
            </>
          ),
        },
        {
          key: "course",
          label: "Course",
          render: (item) => (
            <span className="rounded-md border border-line px-2 py-0.5 text-xs text-ink-soft">
              {item.courseName}
            </span>
          ),
        },
        { key: "stream", label: "Stream", render: (item) => item.stream },
        { key: "duration", label: "Duration", render: (item) => item.duration },
        { key: "fees", label: "Average fees", render: (item) => item.averageFees },
        {
          key: "colleges",
          label: "Colleges",
          render: (item) => item.collegeCount.toLocaleString(),
        },
      ]}
      renderView={(item) => (
        <div className="space-y-6">
          <AdminSubsection title="Basic details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Parent course" value={item.courseName} />
              <Field label="Stream" value={item.stream} />
              <Field label="Duration" value={item.duration} />
              <Field label="Average fees" value={item.averageFees} />
              <Field label="Colleges offering" value={item.collegeCount.toLocaleString()} />
              <Field label="Slug" value={item.slug} />
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.about}</p>
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "basic",
          label: "Basic details",
          render: (item) => (
            <FieldGrid>
              <NameSlugFields defaultName={item.name} defaultSlug={item.slug} />
              <SelectField
                label="Parent course"
                name="courseSlug"
                defaultValue={item.courseName}
                options={courseNames}
              />
              <TextField label="Stream" name="stream" defaultValue={item.stream} />
              <TextField label="Duration" name="duration" defaultValue={item.duration} />
              <TextField label="Average fees" name="averageFees" defaultValue={item.averageFees} />
              <TextAreaField
                label="About"
                name="about"
                rows={4}
                defaultValue={item.about}
                className="sm:col-span-2 lg:col-span-3"
              />
            </FieldGrid>
          ),
        },
        {
          id: "seo",
          label: "SEO",
          render: (item) => (
            <FieldGrid>
              <TextField
                label="Meta title"
                name="metaTitle"
                placeholder={`${item.name} in ${item.courseName} — Colleges & Fees`}
                className="sm:col-span-2"
                hint="Around 60 characters."
              />
              <TextField
                label="Canonical URL"
                name="canonical"
                placeholder={`/courses/${item.courseSlug}/${item.slug}`}
              />
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
                defaultValue="EducationalOccupationalProgram"
                options={["EducationalOccupationalProgram", "Course", "WebPage"]}
                customPlaceholder="Any schema.org type"
              />
              <SelectField label="Indexing" name="robots" options={["Index, follow", "No index"]} />
            </FieldGrid>
          ),
        },
      ]}
      renderAddForm={() => <SpecialisationAddForm courses={courses} />}
    />
  );
}

/**
 * Separate component so the parent-course select can hold state: specialisation
 * slugs are prefixed with the course ("mba" + "finance" -> "mba-finance"), so
 * changing the course has to change the generated slug with it.
 */
function SpecialisationAddForm({ courses }: { courses: Course[] }) {
  const [courseSlug, setCourseSlug] = useState(courses[0]?.slug ?? "");

  return (
    <>
      <div>
        <label htmlFor="courseSlug" className="block text-xs font-semibold text-ink">
          Parent course
        </label>
        <select
          id="courseSlug"
          name="courseSlug"
          value={courseSlug}
          onChange={(e) => setCourseSlug(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          {courses.map((course) => (
            <option key={course.slug} value={course.slug}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      {/* Remounts when the course changes, so the prefix is reapplied to the
          slug rather than left showing the previous course's. */}
      <NameSlugFields
        key={courseSlug}
        namePlaceholder="Finance"
        slugPlaceholder={`${courseSlug}-finance`}
        slugPrefix={courseSlug}
      />

      <TextField label="Duration" name="duration" placeholder="24 Months" />
      <TextField label="Average fees" name="averageFees" placeholder="₹6L - 24L" />
      <TextAreaField
        label="About"
        name="about"
        rows={3}
        className="sm:col-span-2"
        placeholder="What the specialisation covers."
      />
    </>
  );
}
